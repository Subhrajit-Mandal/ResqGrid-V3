"""Pipeline mechanics and security boundaries. All model rows are TEST-ONLY synthetic data."""
from datetime import datetime,timezone,timedelta
from pathlib import Path
import json
import pytest
from app.core.config import Settings
from app.core.auth import authenticate,Actor
from app.domains.contracts import SensorHealth,Telemetry,Hazard
from app.domains.inference import infer_window
from app.domains.telemetry import validate_registry
from app.domains.risk import assess
from test_core import client,header,sos


def test_unassigned_summary_has_no_reporter_identity_and_messages_are_denied(client):
    identifier=client.post('/api/v1/sos',json=sos(),headers=header()).json()['id']
    result=client.get(f'/api/v1/incidents/{identifier}',headers=header('demo-agency'))
    assert result.status_code==200 and 'reporter_id' not in result.json() and 'submission' not in result.json()
    assert client.get(f'/api/v1/incidents/{identifier}/messages',headers=header('demo-agency')).status_code==403


def test_resources_are_agency_scoped(client):
    assert all(r['agency_id']=='A-01' for r in client.get('/api/v1/resources',headers=header('demo-agency')).json())


def test_large_mutating_body_is_rejected(client):
    response=client.post('/api/v1/sos',content=b'x'*65537,headers={**header(),'Content-Type':'application/json'})
    assert response.status_code==413


def test_health_requires_timezone():
    body={'message_id':'health-test-01','device_id':'D-01','node_id':'N-01','zone_id':'Z-01','observed_at':'2026-01-01T00:00:00','firmware_version':'test','uptime_seconds':1,'connectivity':'online','calibration':'unknown','source_mode':'simulated'}
    with pytest.raises(ValueError):SensorHealth.model_validate(body)


def test_channels_must_match_device_registry():
    import importlib.util
    path=Path(__file__).resolve().parents[2]/'iot/simulator/telemetry.py';spec=importlib.util.spec_from_file_location('pipeline_simulator',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    reading=Telemetry.model_validate(module.frame('normal',1,'test-boot'))
    registry={'id':reading.device_id,'node_id':reading.node_id,'zone_id':reading.zone_id,'source_mode':reading.source_mode,'sensor_channels':[m.model_dump(include={'sensor_id','kind','unit'}) for m in reading.measurements]}
    validate_registry(reading,registry)
    registry['sensor_channels']=registry['sensor_channels'][1:]
    with pytest.raises(ValueError,match='channel'):validate_registry(reading,registry)


@pytest.mark.parametrize('policy',[{'weights':(1,)},{'weights':(float('nan'),.5,.5)},{'minimum_support':1},{'minimum_persistence':1},{'confidence_threshold':2}])
def test_configuration_cannot_disable_safeguards(policy):
    with pytest.raises(ValueError):assess(hazard=Hazard.FLOOD,zone_id='Z-01',probability=.9,impact=90,exposure=90,confidence=.99,quality='GOOD',persistent_samples=3,supporting_sources=2,model_version='test',**policy)


def test_no_artifact_keeps_prediction_and_risk_unavailable():
    prediction,risk=infer_window(None,[],zone_id='Z-01')
    assert prediction.applicability=='model_unavailable' and prediction.probability is None
    assert risk.severity=='UNKNOWN' and risk.decision=='INSUFFICIENT_EVIDENCE'


def test_real_signature_expiry_issuer_and_current_role_resolution(monkeypatch):
    import jwt
    import app.core.auth as auth
    from cryptography.hazmat.primitives.asymmetric import rsa
    private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    class Client:
        def get_signing_key_from_jwt(self,token):return type('Key',(),{'key':private.public_key()})()
    monkeypatch.setattr(auth,'jwks_client',lambda url:Client())
    settings=Settings(mode='production',postgres_url='configured',mongodb_uri='configured',supabase_url='https://example.invalid',mqtt_host='configured')
    identity={'roles':['citizen'],'agency_id':None}
    class Repo:
        def identity(self,subject):return identity
    claims={'sub':'user-test','aud':'authenticated','iss':'https://example.invalid/auth/v1','exp':datetime.now(timezone.utc)+timedelta(minutes=5),'role':'platform_admin'}
    token=jwt.encode(claims,private,algorithm='RS256')
    assert authenticate(token,settings,Repo()).roles==frozenset({'citizen'})
    identity['roles']=['agency_operator'];identity['agency_id']='A-01'
    assert authenticate(token,settings,Repo()).agency_id=='A-01'
    for invalid in [{**claims,'iss':'https://wrong.invalid'},{**claims,'exp':datetime.now(timezone.utc)-timedelta(minutes=1)}]:
        with pytest.raises(Exception):authenticate(jwt.encode(invalid,private,algorithm='RS256'),settings,Repo())


def test_offline_train_registry_and_checksum_mechanics(tmp_path):
    import numpy as np
    import pandas as pd
    from resqgrid_ai.training import train
    from resqgrid_ai.inference import Predictor
    generator=np.random.default_rng(42)
    data=pd.DataFrame({'observed':pd.date_range('2025-01-01',periods=120,freq='h',tz='UTC'),'feature_a':generator.uniform(0,1,120),'test_label':[i%2 for i in range(120)]})
    csv=tmp_path/'synthetic-test-only.csv';data.to_csv(csv,index=False)
    manifest=train(csv,tmp_path/'test-artifact',features=['feature_a'],target_column='test_label',timestamp_column='observed',hazard='flood',target_description='Synthetic unit-test label only',horizon_seconds=600)
    assert manifest['deployment_approved'] is False and manifest['chronological'] is True
    assert all(0<=manifest['evaluation'][key]<=1 for key in ['precision','recall','f1','roc_auc','pr_auc','brier','false_positive_rate','false_negative_rate'])
    path=tmp_path/'test-artifact'/'manifest.json'
    with pytest.raises(ValueError,match='approved'):Predictor(path)
    # Approval below applies ONLY to this temporary test fixture, never a production artifact.
    manifest['deployment_approved']=True;path.write_text(json.dumps(manifest))
    model=Predictor(path)
    assert model.predict({'feature_a':None})['applicability']=='insufficient_evidence'
    assert 0<=model.predict({'feature_a':.5})['probability']<=1
    artifact=tmp_path/'test-artifact'/'model.joblib';artifact.write_bytes(artifact.read_bytes()+b'tampered')
    with pytest.raises(ValueError,match='checksum'):Predictor(path)


def test_malformed_session_token_is_rejected():
    for token in [None,[],{'token':'bad'},'x'*16385]:
        with pytest.raises(Exception) as failure:authenticate(token,Settings(mode='demo'),None)
        assert failure.value.status_code==401


def test_retracted_warning_disappears_and_stale_versions_conflict(client):
    payload={'id':'W-retract','zone_id':'Z-01','hazard':'flood','severity':'HIGH','title':'Retraction test','instructions':'Test-only example','evidence_id':'simulated','source_mode':'simulated','expires_at':(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()}
    client.post('/api/v1/alerts',json=payload,headers=header('demo-intelligence'))
    client.post('/api/v1/alerts/W-retract/publish',json={'expected_version':1},headers=header('demo-intelligence'))
    assert client.post('/api/v1/alerts/W-retract/retract',json={'expected_version':2,'reason':'Test review'},headers=header()).status_code==403
    assert client.post('/api/v1/alerts/W-retract/retract',json={'expected_version':1,'reason':'Test review'},headers=header('demo-intelligence')).status_code==409
    assert client.post('/api/v1/alerts/W-retract/retract',json={'expected_version':2,'reason':'Test review'},headers=header('demo-intelligence')).status_code==200
    assert client.get('/api/v1/alerts/public').json()==[]


@pytest.mark.parametrize('change',[{'zone_id':'Z-02'},{'hazard':'forest-fire'},{'source_mode':'simulated'},{'rule_validated':False},{'timestamp':datetime.now(timezone.utc)-timedelta(minutes=5)}])
def test_production_draft_requires_matching_fresh_approved_hardware_evidence(monkeypatch,change):
    import app.main as main
    from app.domains.repository import MemoryRepository
    from fastapi.testclient import TestClient
    evidence={'event_id':'risk-test','decision':'WARNING_CANDIDATE','zone_id':'Z-01','hazard':'flood','severity':'HIGH','source_mode':'hardware','rule_validated':True,'timestamp':datetime.now(timezone.utc)}
    evidence.update(change)
    class FakeMongo:
        client=None
        def __init__(self,*args,**kwargs):self.client=self;self.risk_events=self
        def __getitem__(self,key):return self
        def find_one(self,query):return evidence
        def close(self):pass
    monkeypatch.setattr(main,'MongoClient',FakeMongo)
    monkeypatch.setattr(main,'authenticate',lambda *args:Actor('test-publisher',frozenset({'intelligence_operator','publish_alert'})))
    settings=Settings(mode='production',postgres_url='configured',mongodb_uri='configured',supabase_url='https://example.invalid',mqtt_host='configured')
    # No live service calls: the repository and evidence lookup are isolated test fixtures.
    c=TestClient(main.create_app(settings,MemoryRepository()))
    payload={'id':'W-test-gate','zone_id':'Z-01','hazard':'flood','severity':'HIGH','title':'Hardware evidence test','instructions':'Test-only example','evidence_id':'risk-test','source_mode':'hardware','expires_at':(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()}
    assert c.post('/api/v1/alerts',json=payload,headers=header('test-fixture')).status_code==409
