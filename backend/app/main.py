import asyncio
from collections import defaultdict,deque
from contextlib import asynccontextmanager,suppress
from datetime import datetime,timezone
from time import monotonic
import json
from fastapi import FastAPI,Depends,HTTPException,WebSocket,WebSocketDisconnect,Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from starlette.concurrency import run_in_threadpool
from pymongo import MongoClient
from .core.config import Settings
from .core.auth import authenticate,require,Actor
from .domains.repository import MemoryRepository
from .domains.postgres import PostgresRepository
from .domains.contracts import SOS,Transition,Assignment,Alert,Message,Telemetry,Contract,Retraction
from .domains.telemetry import validate_reading

class Publication(Contract):
    expected_version:int

def create_app(settings:Settings|None=None,repository=None):
    settings=settings or Settings();repo=repository or (MemoryRepository() if settings.mode=='demo' else PostgresRepository(settings.postgres_url));queues=set();limits=defaultdict(deque);bearer=HTTPBearer(auto_error=False)
    mongo=MongoClient(settings.mongodb_uri,tz_aware=True)[settings.mongodb_database] if settings.mongodb_uri else None
    async def emit():
        for q in tuple(queues):
            if q.empty():q.put_nowait(True)
    async def listen():
        import psycopg
        while True:
            try:
                async with await psycopg.AsyncConnection.connect(settings.postgres_url,autocommit=True) as c:
                    await c.execute('listen resqgrid_events')
                    async for _ in c.notifies():await emit()
            except asyncio.CancelledError:raise
            except Exception:await asyncio.sleep(3)
    @asynccontextmanager
    async def lifespan(app):
        task=asyncio.create_task(listen()) if settings.mode=='production' else None
        yield
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):await task
        if mongo is not None:mongo.client.close()
    app=FastAPI(title='RESQGRID V3',version='3.0.0',lifespan=lifespan)
    app.state.repository=repo;app.state.settings=settings
    app.add_middleware(CORSMiddleware,allow_origins=settings.allowed_origins.split(','),allow_methods=['GET','POST','PATCH'],allow_headers=['Authorization','Content-Type'])
    @app.exception_handler(HTTPException)
    async def errors(request,exc):return JSONResponse(status_code=exc.status_code,content={'code':f'HTTP_{exc.status_code}','message':str(exc.detail)},headers=exc.headers)
    @app.middleware('http')
    async def security_headers(request,call_next):
        if request.method in {'POST','PATCH'} and len(await request.body())>65536:return JSONResponse(status_code=413,content={'code':'PAYLOAD_TOO_LARGE','message':'Payload exceeds the allowed size'})
        response=await call_next(request);response.headers['X-Content-Type-Options']='nosniff';response.headers['Cache-Control']='no-store';return response
    def actor(credentials:HTTPAuthorizationCredentials|None=Depends(bearer)):
        if not credentials:raise HTTPException(401,'Authentication required')
        return authenticate(credentials.credentials,settings,repo)
    def limit(a,key,maximum=10):
        bucket=limits[(a.user_id,key)];time=monotonic()
        while bucket and time-bucket[0]>60:bucket.popleft()
        if len(bucket)>=maximum:raise HTTPException(429,'Too many requests; retry later',headers={'Retry-After':'60'})
        bucket.append(time)
    @app.get('/api/v1/health')
    def health():return {'status':'ok','mode':settings.mode,'model_connected':bool(settings.model_manifest),'demo_emergency_delivery':False}
    @app.get('/api/v1/auth/me')
    def me(a:Actor=Depends(actor)):return {'user_id':a.user_id,'roles':sorted(a.roles),'agency_id':a.agency_id,'mode':settings.mode}
    @app.post('/api/v1/sos',status_code=201)
    async def sos(payload:SOS,a:Actor=Depends(actor)):
        limit(a,'sos');result=await run_in_threadpool(repo.create_sos,a,payload);await emit();return result
    @app.get('/api/v1/incidents')
    def incidents(a:Actor=Depends(actor)):return repo.list_incidents(a)
    @app.get('/api/v1/incidents/{identifier}')
    def incident(identifier:str,a:Actor=Depends(actor)):return repo.get_incident(a,identifier)
    @app.patch('/api/v1/incidents/{identifier}')
    async def transition(identifier:str,payload:Transition,a:Actor=Depends(actor)):
        result=await run_in_threadpool(repo.transition,a,identifier,payload);await emit();return result
    @app.post('/api/v1/incidents/{identifier}/assign')
    async def assign(identifier:str,payload:Assignment,a:Actor=Depends(actor)):
        result=await run_in_threadpool(repo.assign,a,identifier,payload);await emit();return result
    @app.post('/api/v1/incidents/{identifier}/messages',status_code=201)
    async def message(identifier:str,payload:Message,a:Actor=Depends(actor)):
        limit(a,'messages',30);result=await run_in_threadpool(repo.add_message,a,identifier,payload.text);await emit();return result
    @app.get('/api/v1/incidents/{identifier}/messages')
    def messages(identifier:str,a:Actor=Depends(actor)):return repo.list_messages(a,identifier)
    @app.get('/api/v1/resources')
    def resources(a:Actor=Depends(actor)):
        require(a,'agency_operator','agency_coordinator');return [r for r in repo.resources.values() if r['agency_id']==a.agency_id] if settings.mode=='demo' else repo.list_resources(a)
    @app.get('/api/v1/alerts/public')
    def public_alerts():
        allowed={'id','zone_id','hazard','severity','title','instructions','source_mode','status','expires_at','version'}
        return [{k:v for k,v in item.items() if k in allowed} for item in repo.list_warnings()]
    @app.get('/api/v1/alerts')
    def alerts(a:Actor=Depends(actor)):
        require(a,'intelligence_operator','publish_alert');return repo.list_warnings(a)
    @app.post('/api/v1/alerts',status_code=201)
    async def draft(payload:Alert,a:Actor=Depends(actor)):
        require(a,'intelligence_operator','publish_alert')
        if payload.expires_at.tzinfo is None:raise HTTPException(422,'Expiry timezone is required')
        if settings.mode=='production':
            evidence=await run_in_threadpool(mongo.risk_events.find_one,{'event_id':payload.evidence_id})
            check_evidence(evidence,payload.model_dump(mode='python'))
        result=await run_in_threadpool(repo.create_warning,a,payload);await emit();return result
    @app.post('/api/v1/alerts/{identifier}/publish')
    async def publish(identifier:str,payload:Publication,a:Actor=Depends(actor)):
        require(a,'publish_alert')
        if settings.mode=='production':
            drafts=await run_in_threadpool(repo.list_warnings,a)
            warning=next((w for w in drafts if w['id']==identifier),None)
            if warning is None:raise HTTPException(404,'Warning not found')
            evidence=await run_in_threadpool(mongo.risk_events.find_one,{'event_id':warning.get('evidence_id')})
            check_evidence(evidence,warning)
        result=await run_in_threadpool(repo.publish_warning,a,identifier,payload.expected_version);await emit();return result
    def check_evidence(evidence,warning):
        if not evidence or evidence.get('decision')!='WARNING_CANDIDATE' or evidence.get('rule_validated') is not True or evidence.get('source_mode')!='hardware' or warning.get('source_mode')!='hardware':raise HTTPException(409,'Validated hardware risk evidence and risk policy are required')
        if evidence.get('zone_id')!=warning.get('zone_id') or evidence.get('hazard')!=warning.get('hazard') or evidence.get('severity')!=warning.get('severity'):raise HTTPException(409,'Warning does not match risk evidence')
        stamp=evidence.get('timestamp')
        if not isinstance(stamp,datetime) or stamp.tzinfo is None or not 0<=(datetime.now(timezone.utc)-stamp).total_seconds()<=settings.maximum_staleness_seconds:raise HTTPException(409,'Risk evidence is stale; reassessment is required')
    @app.post('/api/v1/telemetry/validate')
    def validate(payload:Telemetry,a:Actor=Depends(actor)):
        require(a,'intelligence_operator','platform_admin');return validate_reading(payload,settings.maximum_staleness_seconds)
    @app.post('/api/v1/alerts/{identifier}/retract')
    async def retract(identifier:str,payload:Retraction,a:Actor=Depends(actor)):
        result=await run_in_threadpool(repo.retract_warning,a,identifier,payload);await emit();return result
    @app.get('/api/v1/models')
    def models(a:Actor=Depends(actor)):
        require(a,'intelligence_operator','platform_admin');return {'active_artifact_configured':bool(settings.model_manifest),'metrics':None,'notice':'Metrics require an actual evaluated artifact. No performance is invented.'}
    @app.websocket('/api/v1/realtime')
    async def realtime(ws:WebSocket):
        origin=ws.headers.get('origin')
        if origin and origin not in settings.allowed_origins.split(','):await ws.close(code=1008);return
        await ws.accept();q=asyncio.Queue(maxsize=1)
        try:
            first=await asyncio.wait_for(ws.receive_json(),timeout=5)
            if not isinstance(first,dict) or set(first)!={'token'}:raise HTTPException(401,'Expected a session token')
            token=first.get('token','');a=await run_in_threadpool(authenticate,token,settings,repo);queues.add(q)
            while True:
                # Recheck current role/membership and expiry on every authoritative snapshot.
                a=await run_in_threadpool(authenticate,token,settings,repo)
                data=await run_in_threadpool(repo.list_incidents,a)
                warnings=await run_in_threadpool(repo.list_warnings,a)
                if not a.roles.intersection({'intelligence_operator','publish_alert'}):
                    allowed={'id','zone_id','hazard','severity','title','instructions','source_mode','status','expires_at','version'}
                    warnings=[{k:v for k,v in w.items() if k in allowed} for w in warnings]
                await ws.send_json({'type':'snapshot','incidents':json.loads(json.dumps(data,default=str)),'warnings':json.loads(json.dumps(warnings,default=str)),'mode':settings.mode})
                try:await asyncio.wait_for(q.get(),timeout=25)
                except asyncio.TimeoutError:pass
        except (WebSocketDisconnect,asyncio.TimeoutError,HTTPException,ValueError,KeyError):
            with suppress(Exception):await ws.close(code=1008)
        finally:queues.discard(q)
    return app

app=create_app()
