"""Durable MQTT ingestion and operational outbox processing.

Inference remains blocked until a validated model AND confidence/risk policy are supplied.
"""
import argparse,json,logging,ssl,time
from datetime import datetime,timezone
from pathlib import Path
import sys
import psycopg
from psycopg.rows import dict_row
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
import paho.mqtt.client as mqtt
from .core.config import Settings
from .domains.contracts import Telemetry,SensorHealth
from .domains.telemetry import validate_reading,validate_registry
from .domains.inference import infer_window

log=logging.getLogger('resqgrid.worker')

def run():
    settings=Settings()
    if not all([settings.postgres_url,settings.mongodb_uri,settings.mqtt_host,settings.mqtt_username,settings.mqtt_password]):raise SystemExit('Worker requires configured databases and authenticated MQTT. Use simulator stdout for local contract checks.')
    mongo=MongoClient(settings.mongodb_uri,tz_aware=True);db=mongo[settings.mongodb_database]
    sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
    from database.mongo.indexes import configure
    configure(db)
    predictor=None
    if settings.model_manifest:
        sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ai'/'src'))
        from resqgrid_ai.inference import Predictor
        predictor=Predictor(settings.model_manifest)
    def on_message(client,userdata,msg):
        try:
            health=msg.topic.endswith('/health')
            payload=(SensorHealth if health else Telemetry).model_validate_json(msg.payload)
            expected=f'disaster/{payload.zone_id}/{payload.node_id}/'+('health' if health else 'telemetry')
            if msg.topic!=expected:raise ValueError('Topic identity mismatch')
            with psycopg.connect(settings.postgres_url,row_factory=dict_row) as c:
                registered=c.execute('select id,node_id,zone_id,calibration_state,sensor_channels,source_mode from resqgrid.devices where id=%s and active',(payload.device_id,)).fetchone()
                if not registered or registered['node_id']!=payload.node_id or registered['zone_id']!=payload.zone_id:raise ValueError('Device registry mismatch')
            if payload.source_mode!=registered['source_mode']:raise ValueError('Device provenance mismatch')
            if health:
                age=(datetime.now(timezone.utc)-payload.observed_at).total_seconds()
                if age < -30:raise ValueError('Health timestamp is in the future')
                document=payload.model_dump(mode='python');document['received_at']=datetime.now(timezone.utc);document['quality']='GOOD' if age<=settings.maximum_staleness_seconds else 'SUSPECT'
                db.device_health.update_one({'message_id':payload.message_id},{'$setOnInsert':document},upsert=True)
                client.ack(msg.mid,msg.qos);return
            validate_registry(payload,registered)
            result=validate_reading(payload,settings.maximum_staleness_seconds)
            if registered['calibration_state']!='valid' and payload.source_mode=='hardware':
                result['quality']='SUSPECT' if result['quality']=='GOOD' else result['quality'];result['reasons'].append('calibration_not_valid')
            document=payload.model_dump(mode='json');document['observed_at']=payload.observed_at;document['received_at']=datetime.now(timezone.utc);document.update(quality=result['quality'],quality_reasons=result['reasons'],validation_version=result['validation_version'])
            try:db.sensor_readings.insert_one(document)
            except DuplicateKeyError:pass
            # Deduplicated durable job registration is safe to repeat after reconnect.
            with psycopg.connect(settings.postgres_url) as c:
                c.execute("insert into resqgrid.jobs(kind,source_id,payload) values('inference',%s,%s::jsonb) on conflict(kind,source_id) do nothing",(payload.message_id,json.dumps({'zone_id':payload.zone_id,'quality':result['quality']})))
                c.execute("select pg_notify('resqgrid_events','resync')")
            client.ack(msg.mid,msg.qos)
        except (ValueError,json.JSONDecodeError):
            log.warning('Rejected invalid MQTT envelope; payload contents omitted')
            client.ack(msg.mid,msg.qos)
        except Exception:
            # No ACK on storage failure: persistent MQTT session can redeliver.
            log.error('Ingestion storage failed; message not acknowledged; payload contents omitted')
            client.disconnect()
    client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,client_id='resqgrid-ingestion-v3',clean_session=False,manual_ack=True)
    client.username_pw_set(settings.mqtt_username,settings.mqtt_password);client.tls_set(cert_reqs=ssl.CERT_REQUIRED);client.on_message=on_message
    client.on_connect=lambda c,u,f,r,p:c.subscribe([('disaster/+/+/telemetry',1),('disaster/+/+/health',1)])
    client.connect(settings.mqtt_host,settings.mqtt_port);client.loop_start()
    try:
        while True:
            if not client.is_connected():
                try:client.reconnect()
                except Exception:time.sleep(3);continue
            with psycopg.connect(settings.postgres_url,row_factory=dict_row) as c:
                event=c.execute('select * from resqgrid.outbox where processed_at is null order by id for update skip locked limit 1').fetchone()
                if event:
                    db.alert_events.update_one({'event_id':event['event_id']},{'$setOnInsert':{'event_id':event['event_id'],'type':event['event_type'],'object_id':event['object_id'],'timestamp':event['created_at']}},upsert=True)
                    c.execute('update resqgrid.outbox set processed_at=now() where id=%s',(event['id'],))
                # Never silently fabricate inference when no artifact/confidence method exists.
                if predictor is None:
                    c.execute("update resqgrid.jobs set state='blocked',last_error_code='MODEL_REQUIRED' where kind='inference' and state='pending'")
                else:
                    c.execute("update resqgrid.jobs set state='pending' where kind='inference' and state='blocked' and last_error_code='MODEL_REQUIRED'")
                    job=c.execute("select * from resqgrid.jobs where kind='inference' and (state='pending' or state='processing' and lease_until<now()) and next_attempt_at<=now() order by id for update skip locked limit 1").fetchone()
                    if job:c.execute("update resqgrid.jobs set state='processing',attempts=attempts+1,lease_until=now()+interval '60 seconds' where id=%s",(job['id'],))
            if predictor and job:
                try:
                    source=db.sensor_readings.find_one({'message_id':job['source_id']})
                    if source is None:raise ValueError('Source observation missing')
                    from datetime import timedelta
                    readings=list(db.sensor_readings.find({'zone_id':source['zone_id'],'observed_at':{'$lte':source['observed_at'],'$gte':source['observed_at']-timedelta(minutes=30)}}).sort('observed_at',-1).limit(200))
                    with psycopg.connect(settings.postgres_url,row_factory=dict_row) as c:
                        row=c.execute('select parameters,validated,version from resqgrid.risk_configurations order by version desc limit 1').fetchone()
                    config={**row['parameters'],'validated':row['validated']} if row else {}
                    previous=list(db.ai_predictions.find({'zone_id':source['zone_id'],'model_version':predictor.manifest['version'],'prediction_id':{'$ne':'prediction:'+job['source_id']},'timestamp':{'$gte':datetime.now(timezone.utc)-timedelta(seconds=settings.maximum_staleness_seconds)}}).sort('timestamp',-1).limit(30))
                    count=0
                    for p in previous:
                        if p.get('probability') is None or p['probability']<float(config.get('persistence_probability',.65)):break
                        count+=1
                    config['persistent_prediction_count']=count+1
                    prediction,risk=infer_window(predictor,readings,zone_id=source['zone_id'],maximum_age=settings.maximum_staleness_seconds,configuration=config)
                    if prediction.probability is None or prediction.probability<float(config.get('persistence_probability',.65)):
                        config['persistent_prediction_count']=0
                        prediction,risk=infer_window(predictor,readings,zone_id=source['zone_id'],maximum_age=settings.maximum_staleness_seconds,configuration=config)
                    # Deterministic source IDs make job recovery idempotent across process restarts.
                    prediction.prediction_id='prediction:'+job['source_id'];risk.event_id='risk:'+job['source_id'];risk.prediction_id=prediction.prediction_id
                    db.ai_predictions.update_one({'prediction_id':prediction.prediction_id},{'$setOnInsert':prediction.model_dump(mode='python')},upsert=True)
                    record=risk.model_dump(mode='python');record['rule_validated']=config.get('validated') is True
                    db.risk_events.update_one({'event_id':risk.event_id},{'$setOnInsert':record},upsert=True)
                    with psycopg.connect(settings.postgres_url) as c:
                        c.execute("update resqgrid.jobs set state='done',lease_until=null where id=%s",(job['id'],));c.execute("select pg_notify('resqgrid_events','resync')")
                except Exception:
                    with psycopg.connect(settings.postgres_url) as c:
                        c.execute("update resqgrid.jobs set state=case when attempts>=5 then 'failed' else 'pending' end,next_attempt_at=now()+interval '30 seconds',lease_until=null,last_error_code='INFERENCE_PROCESSING_FAILED' where id=%s",(job['id'],))
                    log.error('Inference processing failed; details omitted; job retained for review/retry')
            time.sleep(1)
    finally:client.disconnect();client.loop_stop();mongo.close()

if __name__=='__main__':
    logging.basicConfig(level=logging.INFO);run()
