# Fifteen release risks and prevention
| Risk | Prevention / gate |
|---|---|
| 1. Simulator mistaken for operational evidence | Registry-controlled source_mode, persistent demo labeling, hardware-only warning policy |
| 2. False high-risk spikes | Calibration, persistence, independent sources, stale-data rejection, human review |
| 3. False reassurance from missing data | UNKNOWN/insufficient evidence, never default missing readings to SAFE |
| 4. Target leakage or impressive synthetic accuracy | Chronological gap + independent geographic holdout, provenance, untouched real test set |
| 5. Misleading model confidence | Separate probability from named reliability/uncertainty; validated calibration/uncertainty policy |
| 6. Precise citizen location leakage | Private table, assigned agency scope, ownership checks, audited reads, private uploads |
| 7. Unverified agency or stale role grant | Server DB role/membership verification each command/snapshot, staff MFA/verification |
| 8. Double assignment / conflicting status | Atomic locks, version conflicts, one active lead, resource release and race tests |
| 9. Duplicate/reordered events across reconnect | Stable message/submission IDs, unique indexes/jobs, canonical snapshots, bounded time windows |
| 10. Cross-store partial write | MQTT manual ACK after durable records, idempotent replay, outbox/jobs and repair review |
| 11. Lost warning delivery | Durable delivery queue, receipts/retries/dead letters; published does not mean delivered |
| 12. Offline sensor drift or broken clocks | Health/calibration authority, freshness guards, offline buffer and field power-loss tests |
| 13. Untrusted GIS/shelter/resource data | Licensed authoritative layers, provenance, last-verification status, no unverified safe routing |
| 14. Mobile/accessibility/performance failure | Route/map lazy loading, textual map equivalent, actual browser/device/screen-reader acceptance |
| 15. Scope expansion before reliable MVP | Gate one live hazard and physical node first; postpone advanced models/satellite/autonomy |

Decisions still requiring approval/evidence: target pilot/jurisdiction and authority; physical BOM/calibration; live label/horizon definitions; source licenses; thresholds/confidence validation; location/upload retention; staff verification/MFA; provider delivery channels; geography and shelter update authority; languages/accessibility acceptance; infrastructure budgets/SLAs; multiple membership selection. Recommended stack/service ownership is recorded in `architecture.md`; adding Kafka/Redis/microservices is unnecessary for the initial bounded build. Revisit only with measured requirements.
