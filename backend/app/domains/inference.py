"""Connect trusted AI artifacts to timestamp-bounded, quality-aware observation windows."""
from datetime import datetime,timezone,timedelta
from uuid import uuid4
from .contracts import Prediction,Hazard
from .risk import assess

FEATURE_NAMES={'temperature':'temperature','humidity':'humidity','rainfall':'rainfall_mm','water_level':'water_level_m','soil_moisture':'soil_moisture','smoke':'smoke_ppm','wind_speed':'wind_speed','wind_direction':'wind_direction'}

def infer_window(predictor,readings,*,zone_id,now=None,maximum_age=120,configuration=None):
    now=now or datetime.now(timezone.utc);config=configuration or {};fresh=[r for r in readings if r.get('quality')=='GOOD' and 0<=(now-r['observed_at']).total_seconds()<=maximum_age]
    # Deterministic latest-channel feature values; never use a later observation than the job window.
    features={};water=[]
    for reading in sorted(fresh,key=lambda r:r['observed_at']):
        for m in reading['measurements']:
            features[FEATURE_NAMES[m['kind']]]=m['value']
            if m['kind']=='water_level':water.append((reading['observed_at'],m['value']))
    if len(water)>1:
        seconds=(water[-1][0]-water[0][0]).total_seconds();features['water_level_trend']=(water[-1][1]-water[0][1])/seconds if seconds>0 else None
    result=predictor.predict(features) if predictor and fresh else {'probability':None,'confidence':None,'model_version':None,'applicability':'model_unavailable' if not predictor else 'insufficient_evidence'}
    manifest=predictor.manifest if predictor else {};sources={r.get('source_mode') for r in fresh};mode=next(iter(sources)) if len(sources)==1 else 'mixed' if sources else 'simulated'
    confidence=None;method=None
    if config.get('validated') is True and config.get('confidence_method')=='input_quality_coverage_v1' and fresh:
        # An explicitly documented input reliability index, NOT probability of correctness.
        expected=max(1,int(config.get('expected_sources',2)));confidence=min(1,len({r['device_id'] for r in fresh})/expected)*len(fresh)/max(1,len(readings));method='input_quality_coverage_v1'
    snapshot={name:features.get(name) for name in manifest.get('features',list(features))}
    prediction=Prediction(prediction_id=str(uuid4()),hazard=manifest.get('hazard','flood'),zone_id=zone_id,target=manifest.get('target','not defined'),horizon_seconds=manifest.get('horizon_seconds',1),probability=result['probability'],confidence=confidence,confidence_method=method,model_version=result.get('model_version'),feature_schema_version=manifest.get('feature_schema_version','1.0'),feature_snapshot=snapshot,source_reading_ids=[r['message_id'] for r in fresh],timestamp=now,applicability=result['applicability'],source_mode=mode)
    zone_config=config.get('zones',{}).get(zone_id,{})
    risk=assess(hazard=prediction.hazard,zone_id=zone_id,probability=prediction.probability,impact=zone_config.get('impact'),exposure=zone_config.get('exposure'),confidence=confidence,quality='GOOD' if fresh else 'SUSPECT',persistent_samples=int(config.get('persistent_prediction_count',0)),supporting_sources=len({r['device_id'] for r in fresh}),model_version=prediction.model_version,source_mode=mode,weights=tuple(config.get('weights',[.5,.25,.25])),minimum_persistence=int(config.get('minimum_persistence',3)),minimum_support=int(config.get('minimum_support',2)),confidence_threshold=float(config.get('confidence_threshold',.8)))
    risk.prediction_id=prediction.prediction_id
    return prediction,risk
