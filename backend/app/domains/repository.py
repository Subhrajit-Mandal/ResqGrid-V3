"""Demo repository and shared workflow rules. Demo state is intentionally process-local."""
from copy import deepcopy
from datetime import datetime,timezone
from threading import RLock
from uuid import uuid4
from fastapi import HTTPException
from ..core.auth import Actor,require
from .contracts import SOS,Status,Transition,Assignment,Alert

TRANSITIONS={"New":{"Acknowledged"},"Acknowledged":{"Assigned"},"Assigned":{"En route"},"En route":{"On scene"},"On scene":{"Resolved"},"Resolved":{"Closed"},"Closed":set()}

class MemoryRepository:
    def __init__(self):
        self.lock=RLock();self.incidents={};self.idempotency={};self.warnings={};self.messages={};self.audit=[];self.revision=0
        self.agencies={"A-01":{"id":"A-01","name":"Demo River Rescue Unit","verified":True,"capabilities":["Flood","Evacuation","Trapped"],"zone_ids":["Z-01","Z-02"]},"A-02":{"id":"A-02","name":"Demo Regional Response Unit","verified":True,"capabilities":["Medical","Fire","Other"],"zone_ids":["Z-01","Z-02"]}}
        self.resources={"T-01":{"id":"T-01","name":"Demo River Team","agency_id":"A-01","kind":"team","capacity":6,"status":"Available","version":1},"T-02":{"id":"T-02","name":"Demo Regional Team","agency_id":"A-02","kind":"team","capacity":4,"status":"Available","version":1}}
    def record(self,actor:Actor,action:str,object_id:str):
        self.revision+=1;self.audit.append({"actor":actor.user_id,"action":action,"object_id":object_id,"at":datetime.now(timezone.utc).isoformat(),"revision":self.revision})
    def agency(self,actor):
        agency=self.agencies.get(actor.agency_id)
        if not agency or not agency["verified"]:raise HTTPException(403,"A verified agency is required")
        return agency
    def visible(self,actor,i):
        if i["reporter_id"]==actor.user_id:return True
        if actor.roles.intersection({"agency_operator","agency_coordinator"}):
            agency=self.agency(actor)
            return i["agency_id"]==actor.agency_id or i["agency_id"] is None and i["zone_id"] in agency["zone_ids"]
        return False
    def private(self,actor,i):return i.get("reporter_id")==actor.user_id or actor.roles.intersection({"agency_operator","agency_coordinator"}) and i["agency_id"]==actor.agency_id
    def create_sos(self,actor:Actor,payload:SOS):
        require(actor,"citizen")
        with self.lock:
            key=(actor.user_id,payload.submission_id)
            if key in self.idempotency:
                existing=self.incidents[self.idempotency[key]]
                if existing["submission"]!=payload.model_dump(mode="json"):raise HTTPException(409,"Idempotency key was reused with a different request")
                return deepcopy(existing)
            identifier=f"RG-{uuid4().hex[:12].upper()}";time=datetime.now(timezone.utc).isoformat()
            i={"id":identifier,"reporter_id":actor.user_id,"category":payload.category,"people":payload.people,"zone_id":payload.zone_id,"status":"New","priority":"Critical" if payload.category in {"Medical","Trapped"} else "High","agency_id":None,"team_id":None,"version":1,"created_at":time,"submission":payload.model_dump(mode="json"),"timeline":[{"time":time,"action":"SOS received"}]}
            self.incidents[identifier]=i;self.idempotency[key]=identifier;self.record(actor,"sos.created",identifier);return deepcopy(i)
    def get_incident(self,actor,identifier):
        with self.lock:
            i=self.incidents.get(identifier)
            if not i or not self.visible(actor,i):raise HTTPException(404,"Incident not available")
            result=deepcopy(i)
            if not self.private(actor,i):
                result.pop("submission",None);result.pop("reporter_id",None)
            else:self.audit.append({"actor":actor.user_id,"action":"incident.private_read","object_id":identifier,"at":datetime.now(timezone.utc).isoformat()})
            return result
    def list_incidents(self,actor):
        with self.lock:return [self.get_incident(actor,i["id"]) for i in self.incidents.values() if self.visible(actor,i)]
    def transition(self,actor,identifier,payload:Transition):
        require(actor,"agency_operator","agency_coordinator")
        with self.lock:
            i=self.incidents.get(identifier)
            if not i or not self.visible(actor,i):raise HTTPException(404,"Incident not available")
            if i["version"]!=payload.expected_version:raise HTTPException(409,"Incident changed; refresh before retrying")
            if payload.status.value not in TRANSITIONS[i["status"]]:raise HTTPException(409,"Invalid incident transition")
            if payload.status==Status.ASSIGNED:raise HTTPException(409,"Use the assignment endpoint")
            if i["agency_id"] is None:
                agency=self.agency(actor)
                if i["category"] not in agency["capabilities"]:raise HTTPException(409,"Agency is not suitable for this category")
                i["agency_id"]=actor.agency_id
            if i["agency_id"]!=actor.agency_id:raise HTTPException(403,"Incident belongs to another agency")
            i["status"]=payload.status.value;i["version"]+=1;i["timeline"].append({"time":datetime.now(timezone.utc).isoformat(),"action":f"Status: {payload.status.value}"})
            if payload.status==Status.RESOLVED:
                for resource in self.resources.values():
                    if resource.get("incident_id")==identifier:resource.update(status="Available",incident_id=None,version=resource["version"]+1)
            self.record(actor,"incident.transition",identifier);return self.get_incident(actor,identifier)
    def assign(self,actor,identifier,payload:Assignment):
        require(actor,"agency_coordinator")
        with self.lock:
            i=self.incidents.get(identifier);resource=self.resources.get(payload.team_id);agency=self.agency(actor)
            if not i or not self.visible(actor,i):raise HTTPException(404,"Incident not available")
            if i["version"]!=payload.expected_version:raise HTTPException(409,"Incident changed; refresh before retrying")
            if i["status"] not in {"New","Acknowledged"}:raise HTTPException(409,"Incident cannot be assigned in its current state")
            if i["agency_id"] not in {None,actor.agency_id}:raise HTTPException(403,"Another agency owns the incident")
            if not resource or resource["agency_id"]!=actor.agency_id or resource["kind"]!="team" or resource["status"]!="Available":raise HTTPException(409,"Suitable team is not available")
            if i["category"] not in agency["capabilities"]:raise HTTPException(409,"Agency capability does not match")
            i.update(status="Assigned",agency_id=actor.agency_id,team_id=payload.team_id,version=i["version"]+1);resource.update(status="Assigned",incident_id=identifier,version=resource["version"]+1)
            i["timeline"].append({"time":datetime.now(timezone.utc).isoformat(),"action":f"Team assigned: {resource['name']}"});self.record(actor,"incident.assigned",identifier);return self.get_incident(actor,identifier)
    def add_message(self,actor,identifier,text):
        with self.lock:
            i=self.get_incident(actor,identifier)
            if not self.private(actor,i):raise HTTPException(403,"Private incident access is required")
            item={"id":str(uuid4()),"incident_id":identifier,"sender":actor.user_id,"text":text,"created_at":datetime.now(timezone.utc).isoformat()};self.messages.setdefault(identifier,[]).append(item);self.record(actor,"message.created",identifier);return item
    def list_messages(self,actor,identifier):
        i=self.get_incident(actor,identifier)
        if not self.private(actor,i):raise HTTPException(403,"Private incident access is required")
        return deepcopy(self.messages.get(identifier,[]))
    def create_warning(self,actor,payload:Alert):
        require(actor,"intelligence_operator","publish_alert")
        with self.lock:
            if payload.id in self.warnings:raise HTTPException(409,"Warning already exists")
            item=payload.model_dump(mode="json");item["status"]="Draft";self.warnings[payload.id]=item;self.record(actor,"warning.drafted",payload.id);return deepcopy(item)
    def publish_warning(self,actor,identifier,expected_version):
        require(actor,"publish_alert")
        with self.lock:
            w=self.warnings.get(identifier)
            if not w:raise HTTPException(404,"Warning not found")
            if w["version"]!=expected_version or w["status"]!="Draft":raise HTTPException(409,"Warning state changed")
            if datetime.fromisoformat(w["expires_at"])<=datetime.now(timezone.utc):raise HTTPException(409,"Warning has expired")
            w.update(status="Published",version=w["version"]+1,publisher_id=actor.user_id,published_at=datetime.now(timezone.utc).isoformat());self.record(actor,"warning.published",identifier);return deepcopy(w)
    def list_warnings(self,actor=None):
        with self.lock:return [deepcopy(w) for w in self.warnings.values() if actor and actor.roles.intersection({"intelligence_operator","publish_alert"}) or w["status"]=="Published" and datetime.fromisoformat(w["expires_at"])>datetime.now(timezone.utc)]
    def retract_warning(self,actor,identifier,payload):
        require(actor,'publish_alert')
        with self.lock:
            w=self.warnings.get(identifier)
            if not w:raise HTTPException(404,'Warning not found')
            if w['version']!=payload.expected_version or w['status']!='Published':raise HTTPException(409,'Warning state changed')
            w.update(status='Retracted',version=w['version']+1,retraction_reason=payload.reason)
            self.record(actor,'warning.retracted',identifier);return deepcopy(w)
