from datetime import datetime,timezone
from .contracts import Telemetry

RANGES={"temperature":(-50,80,"C"),"humidity":(0,100,"%"),"rainfall":(0,1000,"mm"),"water_level":(0,100,"m"),"soil_moisture":(0,100,"%"),"smoke":(0,100000,"ppm"),"wind_speed":(0,150,"m/s"),"wind_direction":(0,360,"deg")}

def validate_registry(reading:Telemetry,registered:dict):
    if not registered or registered.get('id')!=reading.device_id or registered.get('node_id')!=reading.node_id or registered.get('zone_id')!=reading.zone_id:raise ValueError('Device registry mismatch')
    if registered.get('source_mode')!=reading.source_mode:raise ValueError('Device provenance mismatch')
    channels=registered.get('sensor_channels',[])
    if not isinstance(channels,list):raise ValueError('Device channels must be provisioned as an array')
    for measurement in reading.measurements:
        if not any(all(channel.get(key)==getattr(measurement,key) for key in ('sensor_id','kind','unit')) for channel in channels if isinstance(channel,dict)):raise ValueError('Unprovisioned measurement channel')

def validate_reading(reading:Telemetry,maximum_staleness_seconds:int=120,now:datetime|None=None)->dict:
    now=now or datetime.now(timezone.utc)
    reasons=[];invalid=False
    age=(now-reading.observed_at).total_seconds()
    if age>maximum_staleness_seconds:reasons.append("stale")
    if age< -30:reasons.append("future_timestamp");invalid=True
    seen=set()
    for m in reading.measurements:
        if m.sensor_id in seen:reasons.append("duplicate_sensor_channel");invalid=True
        seen.add(m.sensor_id)
        low,high,unit=RANGES[m.kind]
        if not low<=m.value<=high:reasons.append(f"out_of_range:{m.kind}");invalid=True
        if m.unit!=unit:reasons.append(f"unit_mismatch:{m.kind}");invalid=True
        if m.kind=="rainfall" and m.window_seconds is None:reasons.append("rainfall_window_missing");invalid=True
    return {"quality":"INVALID" if invalid else "SUSPECT" if reasons else "GOOD","reasons":reasons,"received_at":now.isoformat(),"validation_version":"1.0"}
