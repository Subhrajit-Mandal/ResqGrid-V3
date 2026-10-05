"""PostgreSQL operational persistence. Each transaction has verified actor context."""
from contextlib import contextmanager
from datetime import datetime,timezone
from hashlib import sha256
import json
from uuid import uuid4
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from fastapi import HTTPException
from ..core.auth import Actor,require
from .repository import TRANSITIONS

class PostgresRepository:
    def __init__(self,url):self.url=url
    @contextmanager
    def transaction(self,actor):
        with psycopg.connect(self.url,row_factory=dict_row) as conn:
            conn.execute("select set_config('resqgrid.actor_id',%s,true),set_config('resqgrid.actor_roles',%s,true)",(actor.user_id,'|'+'|'.join(sorted(actor.roles))+'|'))
            yield conn
    def identity(self,subject):
        with self.transaction(Actor(subject,frozenset())) as c:
            roles=[r['role'] for r in c.execute('select role from resqgrid.user_roles where user_id::text=%s',(subject,)).fetchall()]
            membership=c.execute('select m.agency_id from resqgrid.agency_members m join resqgrid.agencies a on a.id=m.agency_id where m.user_id::text=%s and m.active and a.verified order by m.agency_id limit 1',(subject,)).fetchone()
            # Anonymous/permanent users without staff grants are restricted citizens.
            return {'roles':roles or ['citizen'],'agency_id':membership['agency_id'] if membership else None}
    def record(self,c,actor,action,identifier):
        c.execute('insert into resqgrid.audit_logs(actor_id,action,object_id) values(%s,%s,%s)',(actor.user_id,action,identifier))
        c.execute('insert into resqgrid.outbox(event_id,event_type,object_id) values(%s,%s,%s)',(str(uuid4()),action,identifier))
        c.execute("select pg_notify('resqgrid_events','resync')")
    def get(self,c,identifier):
        row=c.execute('select i.*,d.submission from resqgrid.incidents i left join resqgrid.incident_details d on d.incident_id=i.id where i.id=%s',(identifier,)).fetchone()
        if not row:raise HTTPException(404,'Incident not available')
        row.pop('request_hash',None);row.pop('submission_id',None)
        if row.get('submission') is None:
            row.pop('submission',None);row.pop('reporter_id',None)
        row['timeline']=c.execute('select created_at as time,status as action from resqgrid.incident_status_history where incident_id=%s order by id',(identifier,)).fetchall()
        return row
    def create_sos(self,actor,payload):
        require(actor,'citizen');body=payload.model_dump(mode='json');digest=sha256(json.dumps(body,sort_keys=True).encode()).hexdigest();identifier=f'RG-{uuid4().hex[:12].upper()}'
        with self.transaction(actor) as c:
            row=c.execute("insert into resqgrid.incidents(id,reporter_id,submission_id,request_hash,category,people,zone_id,status,priority) values(%s,%s,%s,%s,%s,%s,%s,'New',%s) on conflict(reporter_id,submission_id) do nothing returning id",(identifier,actor.user_id,payload.submission_id,digest,payload.category,payload.people,payload.zone_id,'Critical' if payload.category in {'Medical','Trapped'} else 'High')).fetchone()
            if row is None:
                existing=c.execute('select id,request_hash from resqgrid.incidents where reporter_id::text=%s and submission_id=%s',(actor.user_id,payload.submission_id)).fetchone()
                if existing['request_hash']!=digest:raise HTTPException(409,'Idempotency key was reused with a different request')
                return self.get(c,existing['id'])
            c.execute('insert into resqgrid.incident_details(incident_id,location,submission) values(%s,ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography,%s)',(identifier,payload.location.longitude,payload.location.latitude,Jsonb(body)))
            c.execute("insert into resqgrid.incident_status_history(incident_id,actor_id,status) values(%s,%s,'New')",(identifier,actor.user_id))
            self.record(c,actor,'sos.created',identifier);return self.get(c,identifier)
    def get_incident(self,actor,identifier):
        with self.transaction(actor) as c:
            row=self.get(c,identifier)
            if 'submission' in row:c.execute('insert into resqgrid.audit_logs(actor_id,action,object_id) values(%s,%s,%s)',(actor.user_id,'incident.private_read',identifier))
            return row
    def list_incidents(self,actor):
        with self.transaction(actor) as c:
            ids=c.execute('select id from resqgrid.incidents order by created_at desc limit 200').fetchall()
            result=[self.get(c,r['id']) for r in ids]
            if any('submission' in r for r in result):c.execute('insert into resqgrid.audit_logs(actor_id,action,object_id) values(%s,%s,%s)',(actor.user_id,'incident.private_list_read','authorized-result-set'))
            return result
    def transition(self,actor,identifier,payload):
        require(actor,'agency_operator','agency_coordinator')
        with self.transaction(actor) as c:
            row=c.execute('select * from resqgrid.incidents where id=%s for update',(identifier,)).fetchone()
            if not row:raise HTTPException(404,'Incident not available')
            if row['version']!=payload.expected_version:raise HTTPException(409,'Incident changed; refresh before retrying')
            if payload.status.value not in TRANSITIONS[row['status']] or payload.status.value=='Assigned':raise HTTPException(409,'Invalid transition; use assignment endpoint when assigning')
            if row['agency_id'] not in {None,actor.agency_id}:raise HTTPException(403,'Another agency owns the incident')
            agency=c.execute('select capabilities from resqgrid.agencies where id=%s and verified',(actor.agency_id,)).fetchone()
            if not agency or row['category'] not in agency['capabilities']:raise HTTPException(409,'Agency is not suitable')
            c.execute('update resqgrid.incidents set status=%s,agency_id=%s,version=version+1 where id=%s',(payload.status.value,actor.agency_id,identifier))
            c.execute('insert into resqgrid.incident_status_history(incident_id,actor_id,status,reason) values(%s,%s,%s,%s)',(identifier,actor.user_id,payload.status.value,payload.reason))
            if payload.status.value=='Resolved':
                c.execute("update resqgrid.resources set status='Available',incident_id=null,version=version+1 where incident_id=%s",(identifier,))
                c.execute('update resqgrid.incident_assignments set active=false where incident_id=%s',(identifier,))
            self.record(c,actor,'incident.transition',identifier);return self.get(c,identifier)
    def assign(self,actor,identifier,payload):
        require(actor,'agency_coordinator')
        with self.transaction(actor) as c:
            i=c.execute('select * from resqgrid.incidents where id=%s for update',(identifier,)).fetchone()
            r=c.execute('select * from resqgrid.resources where id=%s for update',(payload.team_id,)).fetchone()
            if not i:raise HTTPException(404,'Incident not available')
            if i['version']!=payload.expected_version:raise HTTPException(409,'Incident changed; refresh before retrying')
            if i['status'] not in {'New','Acknowledged'} or i['agency_id'] not in {None,actor.agency_id}:raise HTTPException(409,'Incident cannot be assigned')
            a=c.execute('select capabilities from resqgrid.agencies where id=%s and verified',(actor.agency_id,)).fetchone()
            if not r or r['agency_id']!=actor.agency_id or r['status']!='Available' or r['kind']!='team' or not a or i['category'] not in a['capabilities']:raise HTTPException(409,'Verified suitable team is not available')
            c.execute("update resqgrid.incidents set status='Assigned',agency_id=%s,team_id=%s,version=version+1 where id=%s",(actor.agency_id,payload.team_id,identifier))
            c.execute("update resqgrid.resources set status='Assigned',incident_id=%s,version=version+1 where id=%s",(identifier,payload.team_id))
            c.execute("insert into resqgrid.incident_assignments(id,incident_id,agency_id,team_id,responsibility) values(%s,%s,%s,%s,'lead')",(str(uuid4()),identifier,actor.agency_id,payload.team_id))
            c.execute("insert into resqgrid.incident_status_history(incident_id,actor_id,status) values(%s,%s,'Assigned')",(identifier,actor.user_id))
            self.record(c,actor,'incident.assigned',identifier);return self.get(c,identifier)
    def add_message(self,actor,identifier,text):
        with self.transaction(actor) as c:
            row=self.get(c,identifier)
            if 'submission' not in row:raise HTTPException(403,'Private incident access required')
            item=c.execute('insert into resqgrid.emergency_messages(id,incident_id,sender_id,text) values(%s,%s,%s,%s) returning id,incident_id,sender_id as sender,text,created_at',(str(uuid4()),identifier,actor.user_id,text)).fetchone()
            self.record(c,actor,'message.created',identifier);return item
    def list_messages(self,actor,identifier):
        with self.transaction(actor) as c:
            self.get(c,identifier)
            return c.execute('select id,incident_id,sender_id as sender,text,created_at from resqgrid.emergency_messages where incident_id=%s order by created_at',(identifier,)).fetchall()
    def create_warning(self,actor,payload):
        require(actor,'intelligence_operator','publish_alert')
        item=payload.model_dump(mode='json');item['status']='Draft'
        with self.transaction(actor) as c:
            c.execute('insert into resqgrid.alerts(id,zone_id,payload,status,expires_at) values(%s,%s,%s,\'Draft\',%s)',(item['id'],item['zone_id'],Jsonb(item),payload.expires_at))
            self.record(c,actor,'warning.drafted',item['id']);return item
    def publish_warning(self,actor,identifier,expected_version):
        require(actor,'publish_alert')
        with self.transaction(actor) as c:
            row=c.execute('select * from resqgrid.alerts where id=%s for update',(identifier,)).fetchone()
            if not row:raise HTTPException(404,'Warning not found')
            if row['version']!=expected_version or row['status']!='Draft' or row['expires_at']<=datetime.now(timezone.utc):raise HTTPException(409,'Warning state changed or expired')
            c.execute("update resqgrid.alerts set status='Published',version=version+1,publisher_id=%s,published_at=now() where id=%s",(actor.user_id,identifier))
            self.record(c,actor,'warning.published',identifier);return {**row['payload'],'status':'Published','version':expected_version+1}
    def list_warnings(self,actor=None):
        public=actor or Actor('public',frozenset())
        with self.transaction(public) as c:
            return [{**r['payload'],'status':r['status'],'version':r['version']} for r in c.execute('select payload,status,version from resqgrid.alerts order by expires_at desc limit 200').fetchall()]
    def list_resources(self,actor):
        with self.transaction(actor) as c:return c.execute('select * from resqgrid.resources order by name').fetchall()
    def retract_warning(self,actor,identifier,payload):
        require(actor,'publish_alert')
        with self.transaction(actor) as c:
            row=c.execute('select * from resqgrid.alerts where id=%s for update',(identifier,)).fetchone()
            if not row:raise HTTPException(404,'Warning not found')
            if row['version']!=payload.expected_version or row['status']!='Published':raise HTTPException(409,'Warning state changed')
            body={**row['payload'],'retraction_reason':payload.reason}
            c.execute("update resqgrid.alerts set status='Retracted',version=version+1,payload=%s where id=%s",(Jsonb(body),identifier))
            self.record(c,actor,'warning.retracted',identifier);return {**body,'status':'Retracted','version':payload.expected_version+1}
