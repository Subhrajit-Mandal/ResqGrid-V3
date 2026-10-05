// V3 provisioning/health starter. Sensor telemetry awaits actual wiring and calibration.
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "device_config.h"
WiFiClientSecure transport;
PubSubClient mqtt(transport);
unsigned long lastHealth = 0, lastConnect = 0;
String bootId;
uint32_t sequence = 0;
void setup() {
  Serial.begin(115200);
  if (!strlen(MQTT_HOST) || !strlen(MQTT_ROOT_CA) || !strlen(DEVICE_ID)) {
    Serial.println("Provision device identity, credentials and trusted CA before operation.");
    while (true) delay(1000);
  }
  bootId = String(esp_random(), HEX) + String(esp_random(), HEX);
  transport.setCACert(MQTT_ROOT_CA); // TLS peer verification is mandatory.
  mqtt.setServer(MQTT_HOST, 8883); mqtt.setBufferSize(2048);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
}
void loop() {
  unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED) { delay(100); return; }
  time_t epoch = time(nullptr);
  if (epoch < 1700000000) { delay(100); return; } // Do not emit invented timestamps.
  if (!mqtt.connected() && now-lastConnect >= 5000) {
    lastConnect=now; mqtt.connect((String(NODE_ID)+"-"+bootId).c_str(), MQTT_USERNAME, MQTT_PASSWORD);
  }
  mqtt.loop();
  if (mqtt.connected() && now-lastHealth >= 30000) {
    lastHealth=now; struct tm utc; gmtime_r(&epoch,&utc); char stamp[32];
    strftime(stamp,sizeof(stamp),"%Y-%m-%dT%H:%M:%SZ",&utc);
    JsonDocument doc;
    doc["schema_version"]="1.0"; doc["message_id"]=String(DEVICE_ID)+":"+bootId+":"+String(sequence++);
    doc["device_id"]=DEVICE_ID; doc["node_id"]=NODE_ID; doc["zone_id"]=ZONE_ID;
    doc["observed_at"]=stamp; doc["firmware_version"]="v3-health-starter";
    doc["uptime_seconds"]=now/1000; doc["connectivity"]="online";
    doc["calibration"]="unknown"; doc["battery_percent"]=nullptr;
    doc["source_mode"]="hardware"; doc["errors"].to<JsonArray>().add("sensors_not_commissioned");
    String body; serializeJson(doc,body);
    String topic="disaster/"+String(ZONE_ID)+"/"+String(NODE_ID)+"/health";
    if (!mqtt.publish(topic.c_str(),body.c_str(),false)) Serial.println("Health publish failed; next heartbeat will retry.");
  }
  delay(10);
}
