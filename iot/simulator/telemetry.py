"""MQTT simulator; never represents its output as physical sensor measurements."""
import argparse,json,os,ssl,time
from datetime import datetime,timezone,timedelta
from uuid import uuid4

def frame(scenario,index,boot_id,zone='Z-01',node='SIM-FLOOD-01'):
    now=datetime.now(timezone.utc);observed=now-timedelta(minutes=10) if scenario=='stale' else now
    level=1.4 if scenario=='normal' else (2.9 if index==2 else 1.4) if scenario=='spike' else min(2.9,1.8+index*.04)
    return {'schema_version':'1.0','message_id':f'{node}:{boot_id}:{index}','device_id':node,'node_id':node,'zone_id':zone,'boot_id':boot_id,'sequence':index,'observed_at':observed.isoformat(),'firmware_version':'simulator-v1','location':{'latitude':26.188,'longitude':91.721,'source':'simulated','accuracy_m':None,'captured_at':observed.isoformat()},'measurements':[{'sensor_id':'water-01','kind':'water_level','value':level,'unit':'m','window_seconds':None},{'sensor_id':'rain-01','kind':'rainfall','value':4 if scenario in {'normal','spike'} else 44+index,'unit':'mm','window_seconds':3600}],'battery_percent':89,'source_mode':'simulated'}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--scenario',choices=['normal','rising','spike','stale'],default='normal');p.add_argument('--count',type=int,default=10);p.add_argument('--interval',type=float,default=3);p.add_argument('--mqtt',action='store_true');a=p.parse_args();boot=uuid4().hex
    if a.count<1 or a.interval<0:p.error('count must be positive and interval nonnegative')
    client=None
    if a.mqtt:
        import paho.mqtt.client as mqtt
        host=os.environ.get('RESQGRID_MQTT_HOST');username=os.environ.get('RESQGRID_MQTT_USERNAME');password=os.environ.get('RESQGRID_MQTT_PASSWORD')
        if not all([host,username,password]):raise SystemExit('MQTT host and per-device credentials are required')
        client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,client_id=f'sim-{boot}');client.username_pw_set(username,password);client.tls_set(cert_reqs=ssl.CERT_REQUIRED);client.connect(host,int(os.environ.get('RESQGRID_MQTT_PORT','8883')));client.loop_start()
    try:
        for i in range(a.count):
            payload=frame(a.scenario,i,boot);encoded=json.dumps(payload)
            if client:client.publish(f"disaster/{payload['zone_id']}/{payload['node_id']}/telemetry",encoded,qos=1,retain=False).wait_for_publish(timeout=10)
            else:print(encoded,flush=True)
            if i+1<a.count:time.sleep(a.interval)
    finally:
        if client:client.disconnect();client.loop_stop()
