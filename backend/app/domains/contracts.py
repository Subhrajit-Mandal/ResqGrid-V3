from datetime import datetime,timezone
from enum import StrEnum
from typing import Literal
from pydantic import BaseModel,ConfigDict,Field,field_validator,model_validator

class Contract(BaseModel):
    model_config=ConfigDict(extra="forbid")

class Hazard(StrEnum):
    FLOOD="flood"
    FOREST_FIRE="forest-fire"
    DROUGHT="drought"
    HEAT_WAVE="heat-wave"

class Status(StrEnum):
    NEW="New"
    ACKNOWLEDGED="Acknowledged"
    ASSIGNED="Assigned"
    EN_ROUTE="En route"
    ON_SCENE="On scene"
    RESOLVED="Resolved"
    CLOSED="Closed"

class Location(Contract):
    latitude:float=Field(ge=-90,le=90)
    longitude:float=Field(ge=-180,le=180)
    source:Literal["gps","manual","provisioned","simulated"]
    accuracy_m:float|None=Field(default=None,ge=0)
    captured_at:datetime
    @field_validator("captured_at")
    @classmethod
    def timezone_required(cls,value):
        if value.tzinfo is None: raise ValueError("Timezone is required")
        return value

class SOS(Contract):
    submission_id:str=Field(min_length=8,max_length=100)
    category:Literal["Medical","Fire","Flood","Trapped","Missing person","Evacuation","Infrastructure danger","Other"]
    people:int=Field(ge=1,le=1000)
    zone_id:str=Field(min_length=1,max_length=80)
    location:Location
    landmark:str=Field(min_length=1,max_length=160)
    description:str=Field(default="",max_length=1000)
    source_mode:Literal["hardware","simulated"]="simulated"

class Transition(Contract):
    status:Status
    expected_version:int=Field(ge=1)
    reason:str=Field(default="",max_length=300)

class Assignment(Contract):
    team_id:str=Field(min_length=1,max_length=80)
    expected_version:int=Field(ge=1)

class Measurement(Contract):
    sensor_id:str=Field(min_length=1,max_length=80)
    kind:Literal["temperature","humidity","rainfall","water_level","soil_moisture","smoke","wind_speed","wind_direction"]
    value:float=Field(allow_inf_nan=False)
    unit:str=Field(min_length=1,max_length=20)
    window_seconds:int|None=Field(default=None,gt=0)

class Telemetry(Contract):
    schema_version:Literal["1.0"]="1.0"
    message_id:str=Field(min_length=8,max_length=160)
    device_id:str=Field(min_length=1,max_length=80)
    node_id:str=Field(min_length=1,max_length=80)
    zone_id:str=Field(min_length=1,max_length=80)
    boot_id:str=Field(min_length=1,max_length=80)
    sequence:int=Field(ge=0)
    observed_at:datetime
    firmware_version:str=Field(min_length=1,max_length=80)
    location:Location
    measurements:list[Measurement]=Field(min_length=1,max_length=16)
    battery_percent:float|None=Field(default=None,ge=0,le=100)
    source_mode:Literal["hardware","simulated","replay"]
    @field_validator("observed_at")
    @classmethod
    def timezone_required(cls,value):
        if value.tzinfo is None: raise ValueError("Timezone is required")
        return value

class SensorHealth(Contract):
    schema_version:Literal["1.0"]="1.0"
    message_id:str
    device_id:str
    node_id:str
    zone_id:str
    observed_at:datetime
    firmware_version:str
    uptime_seconds:int=Field(ge=0)
    connectivity:Literal["online","degraded","offline"]
    calibration:Literal["valid","due","unknown"]
    battery_percent:float|None=Field(default=None,ge=0,le=100)
    errors:list[str]=Field(default_factory=list)
    source_mode:Literal["hardware","simulated","replay"]
    @field_validator('observed_at')
    @classmethod
    def timezone_required(cls,value):
        if value.tzinfo is None:raise ValueError('Timezone is required')
        return value

class Prediction(Contract):
    prediction_id:str
    hazard:Hazard
    zone_id:str
    target:str
    horizon_seconds:int=Field(gt=0)
    probability:float|None=Field(default=None,ge=0,le=1)
    confidence:float|None=Field(default=None,ge=0,le=1)
    confidence_method:str|None=None
    model_version:str|None=None
    feature_schema_version:str
    feature_snapshot:dict[str,float|None]
    source_reading_ids:list[str]
    timestamp:datetime
    applicability:Literal["valid","insufficient_evidence","model_unavailable"]
    source_mode:Literal["hardware","simulated","mixed","replay"]

class RiskEvent(Contract):
    event_id:str
    hazard:Hazard
    zone_id:str
    probability:float|None=Field(default=None,ge=0,le=1)
    risk_score:float|None=Field(default=None,ge=0,le=100)
    confidence:float|None=Field(default=None,ge=0,le=1)
    severity:Literal["SAFE","LOW","MODERATE","HIGH","CRITICAL","UNKNOWN"]
    decision:Literal["MONITOR","WATCH","REVIEW_REQUIRED","WARNING_CANDIDATE","INSUFFICIENT_EVIDENCE"]
    rule_version:str
    gates:dict[str,bool]
    reasons:list[str]
    prediction_id:str|None=None
    timestamp:datetime
    recommended_actions:list[str]
    source_mode:Literal["hardware","simulated","mixed","replay"]

class Alert(Contract):
    id:str
    zone_id:str
    hazard:Hazard
    severity:Literal["MODERATE","HIGH","CRITICAL"]
    title:str=Field(min_length=1,max_length=160)
    instructions:str=Field(min_length=1,max_length=2000)
    evidence_id:str
    source_mode:Literal["hardware","simulated","mixed"]
    status:Literal["Draft","Published","Retracted"]="Draft"
    expires_at:datetime
    version:int=1

class Message(Contract):
    text:str=Field(min_length=1,max_length=1000)

class Retraction(Contract):
    expected_version:int=Field(ge=1)
    reason:str=Field(min_length=1,max_length=300)

class Agency(Contract):
    id:str
    name:str
    verified:bool
    capabilities:list[str]
    zone_ids:list[str]

class Resource(Contract):
    id:str
    agency_id:str
    name:str
    kind:Literal["team","vehicle","boat","equipment"]
    status:Literal["Available","Assigned","Maintenance"]
    capacity:int=Field(ge=0)
    version:int=1

class Shelter(Contract):
    id:str
    name:str
    zone_id:str
    location:Location
    status:Literal["open","closed","unknown"]
    capacity:int|None=Field(default=None,ge=0)
    occupancy:int|None=Field(default=None,ge=0)
    verified_at:datetime|None=None
    source_mode:Literal["verified","simulated"]

class Incident(Contract):
    id:str
    reporter_id:str
    category:str
    people:int
    zone_id:str
    status:Status
    priority:Literal["Critical","High","Moderate"]
    agency_id:str|None=None
    team_id:str|None=None
    version:int
    created_at:datetime
