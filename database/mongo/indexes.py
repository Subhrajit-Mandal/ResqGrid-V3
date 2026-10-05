from pymongo import ASCENDING,DESCENDING

def configure(db):
    db.sensor_readings.create_index('message_id',unique=True)
    db.sensor_readings.create_index([('device_id',ASCENDING),('observed_at',DESCENDING)])
    db.sensor_readings.create_index([('zone_id',ASCENDING),('observed_at',DESCENDING)])
    db.device_health.create_index('message_id',unique=True)
    db.ai_predictions.create_index('prediction_id',unique=True)
    db.risk_events.create_index('event_id',unique=True)
    db.alert_events.create_index('event_id',unique=True)
    db.processing_checkpoints.create_index('source_id',unique=True)
    # No deletion policy is invented. Apply an approved retention policy before live operation.
