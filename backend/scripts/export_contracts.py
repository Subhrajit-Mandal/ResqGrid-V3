"""Export the current API and strict domain schemas; run from repository root."""
import json
from pathlib import Path
from app.main import create_app
from app.core.config import Settings
from app.domains import contracts

def export():
    output=Path(__file__).resolve().parents[2]/'docs'/'contracts'
    output.mkdir(parents=True,exist_ok=True)
    (output/'openapi.json').write_text(json.dumps(create_app(Settings(mode='demo')).openapi(),indent=2)+'\n')
    names=['Telemetry','SensorHealth','Prediction','RiskEvent','Alert','SOS','Incident','Assignment','Transition','Retraction','Agency','Resource','Shelter','Message']
    for name in names:
        (output/(name.lower()+'.schema.json')).write_text(json.dumps(getattr(contracts,name).model_json_schema(),indent=2)+'\n')
    print(f'Exported OpenAPI and {len(names)} domain schemas')

if __name__=='__main__':export()
