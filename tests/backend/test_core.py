import os,sys
from pathlib import Path
from datetime import datetime,timezone,timedelta
import pytest
from fastapi.testclient import TestClient
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'backend'))
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ai'/'src'))
from app.main import create_app
from app.core.config import Settings
from app.core.auth import authenticate
from app.domains.repository import MemoryRepository
from app.domains.contracts import Telemetry,Hazard
from app.domains.telemetry import validate_reading
from app.domains.risk import assess,severity

@pytest.fixture
def client():
    with TestClient(create_app(Settings(mode='demo'),MemoryRepository())) as c:yield c

def header(token='demo-citizen'):return {'Authorization':f'Bearer {token}'}
def sos(submission='submit-test-0001'):
    return {'submission_id':submission,'category':'Flood','people':3,'zone_id':'Z-01','location':{'latitude':26.188,'longitude':91.721,'source':'simulated','captured_at':datetime.now(timezone.utc).isoformat()},'landmark':'Fictional test gate','description':'Unit-test fixture','source_mode':'simulated'}

def test_auth_required(client):assert client.get('/api/v1/incidents').status_code==401
def test_duplicate_sos_is_idempotent_and_conflicts_are_rejected(client):
    payload=sos();one=client.post('/api/v1/sos',json=payload,headers=header());two=client.post('/api/v1/sos',json=payload,headers=header())
    assert one.status_code==201 and one.json()['id']==two.json()['id']
    payload['people']=4;assert client.post('/api/v1/sos',json=payload,headers=header()).status_code==409
def test_other_citizen_cannot_read_location(client):
    identifier=client.post('/api/v1/sos',json=sos(),headers=header()).json()['id']
    assert client.get(f'/api/v1/incidents/{identifier}',headers=header('demo-other')).status_code==404
    assert client.get('/api/v1/incidents',headers=header('demo-other')).json()==[]
    unassigned=client.get(f'/api/v1/incidents/{identifier}',headers=header('demo-agency')).json();assert 'submission' not in unassigned
def test_citizen_cannot_assign(client):
    identifier=client.post('/api/v1/sos',json=sos(),headers=header()).json()['id']
    assert client.post(f'/api/v1/incidents/{identifier}/assign',json={'team_id':'T-01','expected_version':1},headers=header()).status_code==403
def test_assignment_versioning_and_team_release(client):
    identifier=client.post('/api/v1/sos',json=sos(),headers=header()).json()['id']
    assigned=client.post(f'/api/v1/incidents/{identifier}/assign',json={'team_id':'T-01','expected_version':1},headers=header('demo-agency'))
    assert assigned.status_code==200 and 'submission' in assigned.json()
    assert client.post(f'/api/v1/incidents/{identifier}/assign',json={'team_id':'T-01','expected_version':1},headers=header('demo-agency')).status_code==409
    version=2
    for status in ['En route','On scene','Resolved']:
        response=client.patch(f'/api/v1/incidents/{identifier}',json={'status':status,'expected_version':version},headers=header('demo-agency'));assert response.status_code==200;version+=1
    assert client.get('/api/v1/resources',headers=header('demo-agency')).json()[0]['status']=='Available'
def test_invalid_transition(client):
    identifier=client.post('/api/v1/sos',json=sos(),headers=header()).json()['id']
    assert client.patch(f'/api/v1/incidents/{identifier}',json={'status':'Closed','expected_version':1},headers=header('demo-agency')).status_code==409
def test_warning_requires_publisher_and_public_projection_is_sanitized(client):
    payload={'id':'W-test','zone_id':'Z-01','hazard':'flood','severity':'HIGH','title':'Test simulation','instructions':'Fictional preparedness message','evidence_id':'simulated-evidence','source_mode':'simulated','expires_at':(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()}
    assert client.post('/api/v1/alerts',json=payload,headers=header()).status_code==403
    assert client.post('/api/v1/alerts',json=payload,headers=header('demo-intelligence')).status_code==201
    assert client.get('/api/v1/alerts/public').json()==[]
    assert client.post('/api/v1/alerts/W-test/publish',json={'expected_version':1},headers=header('demo-admin')).status_code==403
    assert client.post('/api/v1/alerts/W-test/publish',json={'expected_version':1},headers=header('demo-intelligence')).status_code==200
    public=client.get('/api/v1/alerts/public').json()[0];assert 'evidence_id' not in public and 'publisher_id' not in public
def test_production_configuration_fails_closed():
    with pytest.raises(ValueError):Settings(mode='production',postgres_url='',mongodb_uri='',supabase_url='',mqtt_host='')
    settings=Settings(mode='production',postgres_url='configured',mongodb_uri='configured',supabase_url='https://example.invalid',mqtt_host='configured')
    with pytest.raises(Exception):authenticate('demo-admin',settings,MemoryRepository())
@pytest.mark.parametrize('score,level',[(None,'UNKNOWN'),(0,'SAFE'),(24,'SAFE'),(25,'LOW'),(50,'MODERATE'),(70,'HIGH'),(85,'CRITICAL')])
def test_risk_boundaries(score,level):assert severity(score)==level
def test_single_sensor_spike_cannot_generate_warning():
    result=assess(hazard=Hazard.FLOOD,zone_id='Z-01',probability=.99,impact=90,exposure=90,confidence=.99,quality='GOOD',persistent_samples=1,supporting_sources=1,model_version='test-only')
    assert result.decision=='REVIEW_REQUIRED' and not result.gates['temporal']
def test_missing_probability_or_stale_data_is_not_safe():
    result=assess(hazard=Hazard.FLOOD,zone_id='Z-01',probability=None,impact=80,exposure=80,confidence=None,quality='SUSPECT',persistent_samples=9,supporting_sources=2,model_version=None)
    assert result.risk_score is None and result.severity=='UNKNOWN' and result.decision=='INSUFFICIENT_EVIDENCE'
def test_telemetry_units_and_staleness():
    import importlib.util
    path=Path(__file__).resolve().parents[2]/'iot/simulator/telemetry.py';spec=importlib.util.spec_from_file_location('simulator',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    payload=module.frame('normal',1,'boot-test');reading=Telemetry.model_validate(payload);assert validate_reading(reading)['quality']=='GOOD'
    payload['measurements'][0]['unit']='feet';assert validate_reading(Telemetry.model_validate(payload))['quality']=='INVALID'
    stale=Telemetry.model_validate(module.frame('stale',1,'boot-test'));assert validate_reading(stale)['quality']=='SUSPECT'
def test_websocket_snapshots_are_scoped(client):
    with client.websocket_connect('/api/v1/realtime') as socket:
        socket.send_json({'token':'demo-citizen'});assert socket.receive_json()['incidents']==[]
        response=client.post('/api/v1/sos',json=sos(),headers=header());assert response.status_code==201
        assert socket.receive_json()['incidents'][0]['reporter_id']=='demo-citizen'
def test_unapproved_model_artifact_cannot_be_loaded(tmp_path):
    import json
    from resqgrid_ai.inference import Predictor
    manifest=tmp_path/'manifest.json';manifest.write_text(json.dumps({'deployment_approved':False}))
    with pytest.raises(ValueError,match='approved'):Predictor(manifest)
