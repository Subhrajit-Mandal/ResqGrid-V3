# RESQGRID V3
A new disaster-management product built from first principles. No V1/V2 implementation was imported. Primary source: [complete master blueprint](docs/master-blueprint.md).

## What works in this build
A React application with Citizen, Rescue Operations, Intelligence, Administration and Recovery workspaces. The **browser-local simulation** supports three-step SOS submission, request tracking, verified/suitable team assignment, conflict checks, response-state transitions, resource release, incident conversations, coordination requests, scenario evidence gates, human warning approval/retraction, sensor/model status, audit entries and reviewed recovery assessments. MapLibre provides a real interactive basemap with explicitly illustrative zones, sensor and shelter points. Four disaster types have distinct navigation/model readiness; no model is represented as trained.

The independent FastAPI service supports validated SOS, idempotency, scoped incident access, assignment/version conflicts, messages, alert drafting/publication, telemetry validation and authenticated WebSocket snapshots. Demo mode uses process-local memory; production selects PostgreSQL and rejects demo tokens. PostgreSQL migrations define PostGIS operational records and location access policies. MongoDB indexes, MQTT ingestion, deduplicated durable jobs, artifact-gated inference, offline training/evaluation and a telemetry simulator are included.

**The review frontend is not connected to the API.** Its changes remain in the same browser. Frontend demo accounts have persistent role sessions and client-side route guards; they are not production security boundaries. The API demo and frontend simulation do not share storage. No actual rescue service is contacted; do not enter real emergency or personal data.

## Review login and redesign
The landing page displays the exact user-approved RESQGRID INDIA image, unchanged, with accessible live LOGIN and lifecycle navigation controls. On smaller screens the full image scales intact and readable controls appear below it. LOGIN offers exactly **Citizen Login**, **Agency Login** and **Super Admin Login**. The shared demo password is **`RESQGRID2026`**, defined once in `frontend/src/auth/config.ts` (optional build-time `VITE_RESQGRID_DEMO_PASSWORD` override). It is intentionally public demo configuration, not a secret or server credential.

Citizen enters `/me`, Agency enters `/operations`, and Super Admin enters `/admin` with Intelligence access. A safe, authorized deep link can resume after login. The account menu provides **Log out / switch role**; logging out retains simulated SOS, assignments, warnings and messages. Sessions expire after 12 hours and synchronize logout across tabs. Client-side guards do not replace Supabase/JWT authorization. Production session/API/realtime integration remains pending.

See [redesign notes and QA](docs/design/v3-final-touch.md).

## Run locally
Requires Node 22+, Python 3.12+.

```sh
npm ci
npm run dev
npm run build
npm test
npm run lint
npx playwright install chromium
npx playwright test
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend:ai/src .venv/bin/uvicorn app.main:app --port 8000
PYTHONPATH=backend:ai/src .venv/bin/pytest tests/backend -q
python iot/simulator/telemetry.py --help
```

Copy `.env.example` to `.env` locally. API docs: `/docs`, health: `/api/v1/health`. Demo API bearer tokens: `demo-citizen`, `demo-other`, `demo-agency`, `demo-intelligence`, `demo-admin`; **production rejects these**. Production refuses missing required configuration. Do not enable demo mode on a live operational service.

## Not completed or accepted for production
Supabase account creation/session UI, live frontend API/reconnect adapter, real geolocation and permission/fallback flow, private photo uploads, agency onboarding/verification endpoints, live recovery/coordination endpoints, alert delivery providers/receipts, authenticated telemetry subscriber deployment, physical sensor adapters/calibration, deployed database policy verification, trained hazard artifacts, authority-reviewed risk thresholds, trusted GIS/resource data, load/accessibility/security acceptance, observability, backups and restore drills. Exported schemas and deployment files are starting points, not proof of live deployment. The API health endpoint checks process readiness only, not dependency health.

## Structure
- `frontend/`: fresh React/Vite interface, domain simulation, maps, charts, optional agent tools.
- `backend/`: FastAPI contracts, identity, domain repositories, risk/inference and MQTT worker.
- `database/`: fresh PostgreSQL migrations and MongoDB indexes.
- `ai/`: independent training/evaluation/artifact verification, hazard configuration, empty dataset manifest.
- `iot/`: schema-valid simulator and ESP32 health starter.
- `tests/`: frontend domain/UI, backend safeguards and browser workflows.
- `docs/`: preserved blueprint, architecture, contracts, design and acceptance backlog.
- `deploy/`, `render.yaml`, `netlify.toml`, `.github/`: deployment and CI templates.

See [architecture and boundaries](docs/architecture.md), [remaining acceptance work](docs/implementation-status.md), [security](docs/security.md), [deployment](docs/deployment.md), [AI policy](docs/ai.md) and [hardware commissioning](iot/README.md).
