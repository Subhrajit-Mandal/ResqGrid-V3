from datetime import datetime,timezone
from uuid import uuid4
from math import isfinite
from .contracts import Hazard,RiskEvent

def severity(score:float|None)->str:
    if score is None:return "UNKNOWN"
    return "SAFE" if score<25 else "LOW" if score<50 else "MODERATE" if score<70 else "HIGH" if score<85 else "CRITICAL"

def assess(*,hazard:Hazard,zone_id:str,probability:float|None,impact:float|None,exposure:float|None,confidence:float|None,quality:str,persistent_samples:int,supporting_sources:int,model_version:str|None,source_mode:str="simulated",weights:tuple[float,float,float]=(.5,.25,.25),minimum_persistence:int=3,minimum_support:int=2,confidence_threshold:float=.8)->RiskEvent:
    # Prototype configuration; these weights must be validated before operational activation.
    if len(weights)!=3 or any(not isfinite(w) or w<0 for w in weights) or abs(sum(weights)-1)>1e-9:raise ValueError("Three finite nonnegative risk weights must sum to one")
    if minimum_persistence<2 or minimum_support<2 or not 0<=confidence_threshold<=1:raise ValueError('Risk policy cannot disable temporal or independent-source safeguards')
    for name,value,maximum in (("probability",probability,1),("impact",impact,100),("exposure",exposure,100),("confidence",confidence,1)):
        if value is not None and not 0<=value<=maximum:raise ValueError(f"Invalid {name}")
    gates={"sensor_quality":quality=="GOOD","temporal":persistent_samples>=minimum_persistence,"spatial_or_multisource":supporting_sources>=minimum_support,"model":bool(model_version),"confidence":confidence is not None and confidence>=confidence_threshold}
    missing=probability is None or impact is None or exposure is None
    score=None if missing or quality!="GOOD" or not model_version else round(weights[0]*100*probability+weights[1]*impact+weights[2]*exposure,2)
    reasons=[f"{name} gate did not pass" for name,passed in gates.items() if not passed]
    if missing:reasons.append("Required probability, impact or exposure is missing")
    if score is None:decision="INSUFFICIENT_EVIDENCE"
    elif not all(gates.values()):decision="REVIEW_REQUIRED" if score>=70 else "MONITOR"
    elif score>=70:decision="WARNING_CANDIDATE"
    elif score>=50:decision="WATCH"
    else:decision="MONITOR"
    return RiskEvent(event_id=str(uuid4()),hazard=hazard,zone_id=zone_id,probability=probability,risk_score=score,confidence=confidence,severity=severity(score),decision=decision,rule_version="prototype-v1-unvalidated",gates=gates,reasons=reasons,timestamp=datetime.now(timezone.utc),recommended_actions=["Review evidence with an authorized operator"] if decision!="MONITOR" else ["Continue monitoring"],source_mode=source_mode)
