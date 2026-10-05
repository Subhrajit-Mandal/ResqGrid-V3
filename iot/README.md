# V3 IoT commissioning
The simulator emits schema-valid, explicitly simulated readings. The ESP32 starter emits real device health only; it does not invent sensor measurements. It is not a completed four-hazard node and has not been compiled/flashed here.

1. Register device/node/zone, allowed channels and broker topic ACLs in the fresh V3 environment.
2. Copy `firmware/include/device_config.example.h` to ignored `device_config.h`, provision per-device credentials and the broker CA. Build with PlatformIO after reviewing actual ESP32 board/wiring.
3. Determine exact sensor part numbers, supply voltages, ADC pins, water reference datum, rain bucket calibration, smoke units, moisture calibration, anemometer conversion and battery divider. These cannot be safely inferred from the blueprint.
4. Implement calibrated adapters and contract-valid telemetry with stable boot/sequence IDs. Never send placeholder zeros as measurements. Invalid calibration must block operational warnings.
5. Upgrade telemetry publisher to verified QoS 1 plus a bounded durable offline buffer. PubSubClient health publishing is QoS 0; it does not satisfy telemetry durability acceptance yet.
6. Test disconnect/redelivery, clock failures, saturation, power-loss and drift on actual hardware before accepting the node.

Run simulator stdout: `python iot/simulator/telemetry.py --scenario rising --count 5`. Run `--help` for broker mode; TLS and authenticated broker configuration are required. Broker ACL: device may publish only its provisioned `disaster/{zone_id}/{node_id}/telemetry` and `/health`; ingestion service subscribes across nodes. Anonymous public brokers are not used.
