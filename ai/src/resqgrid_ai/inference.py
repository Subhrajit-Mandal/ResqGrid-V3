from hashlib import sha256
from pathlib import Path
import json
import math
import joblib
import pandas as pd

class Predictor:
    def __init__(self,manifest_path):
        path=Path(manifest_path).resolve();self.manifest=json.loads(path.read_text())
        if self.manifest.get('deployment_approved') is not True:raise ValueError('Model deployment has not been approved')
        artifact=(path.parent/self.manifest['artifact']).resolve()
        if artifact.parent!=path.parent:raise ValueError('Artifact must remain inside the trusted registry directory')
        if sha256(artifact.read_bytes()).hexdigest()!=self.manifest['checksum']:raise ValueError('Artifact checksum mismatch')
        # joblib uses pickle; only load operator-approved, trusted training artifacts.
        self.model=joblib.load(artifact)
    def predict(self,features):
        names=self.manifest['features']
        if any(features.get(name) is None or not math.isfinite(float(features[name])) for name in names):return {'probability':None,'confidence':None,'applicability':'insufficient_evidence','model_version':self.manifest['version']}
        probability=float(self.model.predict_proba(pd.DataFrame([{name:features[name] for name in names}]))[0,1])
        return {'probability':probability,'confidence':None,'confidence_method':None,'applicability':'valid','model_version':self.manifest['version']}
