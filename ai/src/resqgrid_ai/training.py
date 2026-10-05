"""Offline chronological binary-classification baseline. No dataset is bundled."""
import argparse
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV,calibration_curve
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import precision_score,recall_score,f1_score,roc_auc_score,average_precision_score,brier_score_loss,confusion_matrix

def train(csv_path,output_dir,*,features,target_column,timestamp_column,hazard,target_description,horizon_seconds,model_kind="rf"):
    path=Path(csv_path);data=pd.read_csv(path)
    if len(data)<80:raise ValueError("At least 80 labeled rows are required for this baseline; dataset sufficiency still needs review")
    if horizon_seconds<=0 or not target_description.strip():raise ValueError("Define the target and positive prediction horizon")
    if target_column in features or timestamp_column in features:raise ValueError("Target/timestamp columns cannot be model features")
    if any(column not in data for column in [*features,target_column,timestamp_column]):raise ValueError("Required dataset columns are missing")
    data[timestamp_column]=pd.to_datetime(data[timestamp_column],utc=True,errors="raise")
    data=data.sort_values(timestamp_column,kind='stable').reset_index(drop=True)
    if set(data[target_column].dropna().unique())!={0,1} or data[target_column].isna().any():raise ValueError("Labels must be explicit binary 0/1 values with no missing labels")
    numeric=data[features].apply(pd.to_numeric,errors='raise')
    if np.isinf(numeric.to_numpy()).any():raise ValueError("Infinite feature values are invalid")
    start_cal=data.iloc[int(len(data)*.6)][timestamp_column];start_test=data.iloc[int(len(data)*.8)][timestamp_column];gap=pd.Timedelta(seconds=horizon_seconds)
    train_rows=data[timestamp_column]<start_cal-gap
    cal_rows=(data[timestamp_column]>=start_cal)&(data[timestamp_column]<start_test-gap)
    test_rows=data[timestamp_column]>=start_test
    splits=[data.loc[mask] for mask in [train_rows,cal_rows,test_rows]]
    if any(len(s)<10 or s[target_column].nunique()!=2 for s in splits):raise ValueError("Each chronological split needs sufficient rows and both classes; adjust the dataset, not the test labels")
    if model_kind=='xgb':
        from xgboost import XGBClassifier
        estimator=XGBClassifier(n_estimators=150,max_depth=4,learning_rate=.05,random_state=42,n_jobs=1,eval_metric='logloss')
    else:estimator=RandomForestClassifier(n_estimators=150,min_samples_leaf=3,class_weight='balanced',random_state=42,n_jobs=1)
    model=Pipeline([('imputer',SimpleImputer(strategy='median')),('model',estimator)])
    training,calibration,test=splits
    model.fit(training[features],training[target_column])
    calibrated=CalibratedClassifierCV(FrozenEstimator(model),method='sigmoid')
    calibrated.fit(calibration[features],calibration[target_column])
    probability=calibrated.predict_proba(test[features])[:,1];predicted=probability>=.5;truth=test[target_column].to_numpy()
    tn,fp,fn,tp=confusion_matrix(truth,predicted,labels=[0,1]).ravel()
    observed,estimated=calibration_curve(truth,probability,n_bins=5)
    metrics={'precision':float(precision_score(truth,predicted,zero_division=0)),'recall':float(recall_score(truth,predicted,zero_division=0)),'f1':float(f1_score(truth,predicted,zero_division=0)),'roc_auc':float(roc_auc_score(truth,probability)),'pr_auc':float(average_precision_score(truth,probability)),'brier':float(brier_score_loss(truth,probability)),'false_positive_rate':float(fp/(fp+tn)),'false_negative_rate':float(fn/(fn+tp)),'calibration_curve':{'observed':observed.tolist(),'estimated':estimated.tolist()}}
    output=Path(output_dir);output.mkdir(parents=True,exist_ok=True);artifact=output/'model.joblib';joblib.dump(calibrated,artifact)
    manifest={'hazard':hazard,'target':target_description,'horizon_seconds':horizon_seconds,'features':features,'feature_schema_version':'1.0','artifact':'model.joblib','checksum':sha256(artifact.read_bytes()).hexdigest(),'dataset_checksum':sha256(path.read_bytes()).hexdigest(),'model_kind':model_kind,'version':datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),'evaluation':metrics,'split_rows':dict(zip(['train','calibration','test'],map(len,splits))),'chronological':True,'gap_seconds':horizon_seconds,'deployment_approved':False,'confidence_method':None,'limitations':['Spatial generalization requires a separate holdout review.','Prototype training does not establish operational safety.','Feature availability and target labeling need domain review.']}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('csv');p.add_argument('--output',required=True);p.add_argument('--features',required=True);p.add_argument('--target-column',required=True);p.add_argument('--timestamp-column',required=True);p.add_argument('--hazard',choices=['flood','forest-fire','drought','heat-wave'],required=True);p.add_argument('--target-description',required=True);p.add_argument('--horizon-seconds',type=int,required=True);p.add_argument('--model',choices=['rf','xgb'],default='rf');a=p.parse_args()
    result=train(a.csv,a.output,features=a.features.split(','),target_column=a.target_column,timestamp_column=a.timestamp_column,hazard=a.hazard,target_description=a.target_description,horizon_seconds=a.horizon_seconds,model_kind=a.model)
    print(json.dumps({'artifact_created':True,'deployment_approved':False,'evaluation':result['evaluation']}))
