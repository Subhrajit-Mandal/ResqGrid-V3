# Implementation and acceptance ledger
**Implemented** means source exists and stated local tests pass. **Demo** means browser-local fixture behavior. **Pending** means neither live acceptance nor integration is claimed. This build is not a completed operational SIH MVP.

## Blueprint coverage (all 37 sections)
| Blueprint sections | Current implementation | Remaining acceptance |
|---|---|---|
| 1 vision; 2 product; 3 lifecycle; 34 positioning | Citizen, rescue and intelligence workspaces, administration and recovery demos | Authority/pilot ownership and real before/during/after scenario |
| 4 architecture; 5 stack; 28 directory | Fresh monorepo, React/FastAPI, PostGIS/Mongo/MQTT ownership and deployment templates | Provision/verify actual services; no legacy migration |
| 6 hazard models; 24 training; 26 output contract | Four hazard readiness records, RF/XGBoost chronological training/calibration/evaluation, approved checksum loader, probability/target/horizon contracts | Real licensed datasets/labels, measured holdout results, model registry activation for each hazard |
| 7 false detections; 8 risk; 25 quality | Strict telemetry validation, stale/unknown states, persistence/support/confidence gates; simulated spike/stale/rising scenarios | Calibration, spatial independence, external-source fusion, domain-validated thresholds and uncertainty |
| 9 hardware; 10 communication; 11 deployment | ESP32 health starter, calibrated-telemetry simulator, TLS authenticated MQTT worker and registry checks | Actual sensor adapters, wiring, calibration, QoS1 firmware buffer, field tests, physical node |
| 12 dashboard | KPIs, MapLibre zones/layers/list, charts, evidence, warning review and simulator | Live feed, measured latency, device health authority |
| 13 citizen | Warning/area view, 3-step demo SOS, own request tracking, conversations, shelter directory | Supabase session/registration, real GPS/manual fallback, private uploads, live dispatch/notifications |
| 14 agency | Prioritized queue, resource suitability, assignment/version guards, states/map and conversations; demo coordination | Multi-agency grants, formal support handoff, live operational resource/agency directory |
| 15 post-disaster; 27 recommendations | Reviewed recovery assessment demo; conservative evidence-review recommendation | Recovery API/persistence; validated hazard-specific guidance; satellite processing advanced |
| 16 GIS | Interactive OSM basemap, illustrative zones/points, PostGIS schema/indexes | Licensed authoritative layers, precise-location controls in real map feed, safe routing advanced |
| 17 visual design; 18 responsive | Fresh civic palette/layout, responsive CSS, text+color statuses, keyboard controls, tokens | Actual browser/mobile/contrast/screen-reader audit; no AA certification yet |
| 19 database | Four fresh SQL migrations, operational constraints/RLS/service roles, Mongo indexes | Execute policies against real restricted users, schema lifecycle/retention/restore |
| 20 API; 21 realtime | FastAPI validated commands, scoped snapshots, outbox/jobs, LISTEN/NOTIFY, stable IDs | Frontend live adapter/reconnect; delivery providers/receipts, shared limits, DB integration/load tests |
| 22 security; 23 privacy | JWT verification, current DB roles/membership, server context, private-location gating/audits, no public citizen data, TLS | Staff MFA/onboarding, upload protections, security review, secrets rotation, retention decisions |
| 29 development phases; 30 coding assistance; 31 rules | Preserve approved clean-sheet approach, tests, no fabricated measurements/accuracy, explicit limitations | Continue gated plan below; AI assistants do not authorize operations |
| 32 SIH demo; 33 MVP | Connected browser demo SOS → rescue → tracking; simulated rising/spike/stale → review → publish; recovery | Replace demo with one physical node and genuinely evaluated hazard pipeline before claiming MVP |
| 35 success; 36 engineering principle; 37 first foundation task | Architecture, routes, design, RBAC, contracts, schema, AI/IoT policy and backlog preserved | Live acceptance criteria, operational evidence and approval |

## Scope boundary
**Must have SIH MVP:** one commissioned physical node, one evaluated hazard model with target/horizon, live inference/risk gates, human warning publication, authenticated role flows, GPS/manual SOS, scoped map/queue, verified suitable assignment, realtime tracking, messages, basic coordination/recovery, durable records and actual service deployment.

**Should have:** multilingual citizen UX, private photos, provider delivery receipts, improved offline behavior, agency/shelter onboarding and deeper accessible/mobile verification.

**Advanced:** all four validated live models, ensembles/temporal neural networks, satellite damage/change detection, integrated external feeds, route optimization and automated resource recommendations.

**Future research:** digital twin simulation, causal forecasting and independently validated autonomous planning. Do not introduce these into MVP gates.

## Remaining gated phases
| Phase | Objective/dependencies | Exact modules/files | Acceptance/tests | Leave untouched |
|---|---|---|---|---|
| A — current foundation | Source/schema/UI/domain records + safeguards | Existing `frontend/src`, `backend/app`, `database`, `ai`, `iot`, `docs`, `deploy` | Build, unit/UI/API safeguards; source persisted; review demo explicitly labeled | V1/V2, production services |
| B — authenticated operational slice | Fresh Supabase/PostGIS + approved zones/agencies; A | `frontend/src/shared/api.ts`, new `shared/auth.tsx`, `shared/realtime.ts`, `domain/live.tsx`, `pages/Citizen.tsx`, `pages/Operations.tsx`, `App.tsx`; `backend/app/core/auth.py`, `domains/postgres.py`, new onboarding modules; new SQL migration | Real citizen session → GPS/manual SOS → verified team → scoped reconnect/tracking; RLS/races/revocation tested with separate accounts | AI weights/models, legacy schemas |
| C — physical evidence | Provisioned broker/registry + approved sensors; A; use B for live display | `iot/firmware/src/*`, `include/device_config.example.h`, simulator; `backend/app/worker.py`, `domains/telemetry.py`, new device/health API, Mongo indexes | Real calibrated readings; topic/unit rejection; power-loss/offline/QoS redelivery; no simulated warning crossing | Citizen identity tables, warning auto-publish |
| D — evaluated hazard | Approved target/dataset/geography; C physical feature alignment | `ai/datasets/manifest.yaml`, `ai/src/resqgrid_ai/*`, hazard config, new model registry service/migration, `backend/app/domains/inference.py`, `risk.py`, worker; intelligence API/live UI | Holdout metrics/calibration, artifacts/provenance, stale/missing/spike gates, trusted rollback | Other unvalidated hazards, fake confidence/performance |
| E — warning delivery | B + C + D; approved policy/publisher/provider | New alert delivery adapter/worker under `backend/app/domains`, `main.py`, `worker.py`, alert schema; `frontend/src/pages/Intelligence.tsx`, Citizen live views | Candidate → human publication → durable receipt; expiry/retraction; retries/dead letters; isolation and measured latency | Auto-publication, unsupported provider claims |
| F — coordination/recovery | B, approved agency collaboration/recovery roles | New backend coordination/recovery services/routes + migration; `pages/Operations.tsx`, `AdminRecovery.tsx` | Verified support grants/handoff, reviewed findings persisted, history/audits/permissions | Satellite AI until validated |
| G — release acceptance | All MVP gates B–F | `deploy`, Render/Netlify configs, `.github`, `tests/*`, runbooks | Browser/mobile/accessibility, security/load, service monitoring, backups/restore, physical demo and real model evidence | Production claims before passing gates |

B and C may proceed in parallel after A. D waits for feature/target alignment and usable datasets. E waits for B+C+D; F can proceed after B. G requires every MVP gate. Four hazard models and satellite research do not block a correctly bounded single-hazard MVP.

## Verification record
Local checks after the frontend final-touch pass: **25 frontend domain/UI tests and 40 baseline backend tests pass**; production TypeScript/Vite build and type/format lint pass. **8 production-bundle Playwright checks pass**, covering role login/logout, invalid passwords, citizen route guards, shared SOS→agency assignment→citizen tracking, warning publication, evidence blocking, optional agent validation, keyboard focus/Escape, desktop/tablet/mobile overflow and MapLibre controls. Screenshots were inspected at 1920, 1366, 768 and 390 pixels. Browser tests use isolated production-file responses because the local runner cannot reach the managed preview; basemap tile fetches fail in this environment, with explicit map/list fallback. GeoJSON overlays, worker loading, zoom, zone selection and layer toggles are verified. SQL migrations and broker ingestion require external test services and were not executed against live databases. Firmware has not been compiled/flashed. Synthetic training tests establish mechanics only; no real disaster model or accuracy is claimed.
