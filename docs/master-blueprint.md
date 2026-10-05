# INVINCIBLE — SIH 2026 Disaster Management Platform
## Master Project Blueprint for ChatGPT + Codex

**SIH 2026 Theme:** Student Innovation — Disaster Management  
**Team:** _INVINCIBLE  
**Project Type:** AI + IoT + GIS + Emergency Coordination + Citizen Response  
**Primary Architecture:** Real-time cyber-physical disaster-management ecosystem

---

# 1. PROJECT VISION

Build a unified disaster-management platform that works across the full disaster lifecycle:

**BEFORE → DURING → AFTER**

The system must not be a collection of unrelated dashboards. The central design principle is:

> **Sense → Understand → Predict → Warn → Coordinate → Rescue → Assess → Recover**

The platform combines:

1. Real hardware sensor networks deployed in different zones.
2. IoT transmission of live environmental measurements.
3. AI/ML models trained using large-scale historical + real-time environmental data.
4. Multi-hazard risk scoring for:
   - Flood
   - Forest fire
   - Drought
   - Heat wave
5. Localized GIS-based early warning.
6. Citizen login/SOS and emergency queries.
7. A rescue-agency coordination environment.
8. Post-disaster damage and recovery intelligence.
9. False-detection reduction using sensor fusion, temporal validation, confidence scoring, thresholds, and multi-source verification.

---

# 2. CORE PRODUCT STRUCTURE

The public-facing application should have THREE primary entry areas.

## PAGE 1 — CITIZEN

Purpose:
- Citizen registration/login
- Emergency SOS
- Emergency queries
- Receive localized alerts
- View safe zones/shelters
- View incident status
- Share emergency location
- Communicate relevant information to response agencies

## PAGE 2 — RESCUE AGENCIES

Purpose:
- Verified agency login
- Live disaster map
- Incident management
- Citizen SOS queue
- Agency-to-agency coordination
- Resource coordination
- Team/vehicle/equipment status
- Task assignment
- Emergency communication
- Shelter/resource visibility
- Incident acknowledgement and resolution
- Operational analytics

## PAGE 3 — EARLY WARNING & DISASTER INTELLIGENCE

Purpose:
- Real-time sensor monitoring
- IoT device health
- Environmental data
- AI/ML prediction
- Hazard probability
- Risk score
- Confidence score
- False-positive mitigation
- Localized risk maps
- Alert generation
- Recommended preventive actions
- Historical analytics
- Model monitoring

Additional protected administration screens may exist behind the three primary areas.

---

# 3. DISASTER LIFECYCLE

## BEFORE

AI + IoT:
- Monitor
- Detect abnormal conditions
- Predict hazard probability
- Calculate risk
- Identify affected zones
- Generate early warning
- Recommend preventive actions
- Recommend resource pre-positioning

## DURING

Response:
- Citizen SOS
- Live incident map
- Agency coordination
- Rescue assignment
- Resource allocation
- Shelter information
- Incident escalation
- Real-time operational status

## AFTER

Recovery:
- Damage assessment
- Affected-area mapping
- Incident history
- Relief/resource planning
- Infrastructure assessment
- Recovery prioritization
- Analytics and reporting

---

# 4. HIGH-LEVEL ARCHITECTURE

```text
PHYSICAL ENVIRONMENT
        |
        v
+----------------------+
| REAL SENSOR NETWORK  |
| Temperature          |
| Humidity             |
| Rainfall             |
| Water Level          |
| Soil Moisture        |
| Smoke/Gas            |
| Wind Speed/Direction |
| GPS / Location       |
+----------+-----------+
           |
           v
+----------------------+
| ESP32 / IoT NODE     |
| Edge validation      |
| Device ID            |
| Timestamp            |
| GPS/location         |
+----------+-----------+
           |
           v
+----------------------+
| MQTT / IoT GATEWAY   |
+----------+-----------+
           |
           v
+----------------------+
| BACKEND INGESTION    |
| Validation           |
| Normalization        |
| Storage              |
+----------+-----------+
           |
     +-----+------+
     |            |
     v            v
 MongoDB       Supabase
 raw/time      auth/
 series        realtime/
 data          metadata
     |            |
     +-----+------+
           |
           v
+----------------------+
| AI/ML ENGINE         |
| Feature Engineering  |
| Prediction           |
| Risk Score           |
| Confidence           |
| Anomaly Detection    |
+----------+-----------+
           |
           v
+----------------------+
| DECISION ENGINE      |
| Thresholds           |
| Sensor fusion        |
| Temporal validation  |
| False-positive gate  |
| Severity classifier  |
+----------+-----------+
           |
     +-----+-----------+
     |                 |
     v                 v
EARLY WARNING      RESCUE SYSTEM
     |                 |
     v                 v
Citizens          Agencies
Authorities       Teams
                  Resources
                  Incidents
                       |
                       v
                  Citizen SOS
                       |
                       v
                RESPONSE ACTION
                       |
                       v
                POST-DISASTER
                ASSESSMENT
```

---

# 5. TECHNOLOGY STACK

## Frontend

Preferred:
- React
- Vite
- Tailwind CSS
- TypeScript
- React Router
- Recharts or equivalent charting library
- MapLibre GL JS or Leaflet

Use TypeScript throughout the frontend.

## Backend

Preferred:
- Python
- FastAPI
- Pydantic
- Uvicorn
- WebSockets
- MQTT client

Backend must expose clean REST APIs and real-time channels.

## AI/ML

Primary:
- Python
- pandas
- NumPy
- scikit-learn
- XGBoost
- PyTorch only where justified

Do not use deep learning merely for appearance. Prefer the simplest model that performs reliably.

## Databases

### MongoDB
Use for:
- Sensor readings
- IoT telemetry
- Time-oriented environmental records
- Incident/event documents where document structure is useful
- AI prediction records
- Alert history

### Supabase
Use for:
- Authentication
- User profiles
- Role/permission metadata
- Agency metadata
- Structured relational entities
- Realtime events where appropriate
- PostgreSQL/PostGIS capabilities if used

Do not duplicate the same authoritative record unnecessarily between MongoDB and Supabase.

## Deployment

### Frontend
Netlify

### Backend/API
Render

### Database
MongoDB Atlas + Supabase

### Version control
Git + GitHub

### Containerization
Docker for reproducible backend/AI/IoT services where useful.

---

# 6. AI MODEL STRATEGY

The system must be a HYBRID AI architecture.

Do not train one universal model for every disaster.

Use disaster-specific models with a common risk-engine interface.

Common interface:

```text
Input features
    ↓
Preprocessing
    ↓
Hazard-specific ML model
    ↓
Probability
    ↓
Risk score
    ↓
Confidence score
    ↓
Decision engine
    ↓
Alert / No alert / Monitor
```

## Recommended model allocation

### Flood

Start with:
- XGBoost
- Random Forest baseline

Potential features:
- rainfall intensity
- cumulative rainfall
- rainfall over multiple windows
- water level
- water-level trend
- river/stream flow
- soil moisture
- temperature
- humidity
- elevation
- slope
- drainage characteristics
- historical flood occurrence
- upstream measurements
- forecast weather variables

### Forest Fire

Start with:
- XGBoost
- Random Forest baseline

Potential features:
- temperature
- relative humidity
- wind speed
- wind direction
- rainfall
- soil moisture
- vegetation indices
- vegetation dryness
- smoke/gas sensor values
- historical fire frequency
- terrain
- fuel/vegetation characteristics

### Drought

Start with:
- XGBoost / Random Forest
- time-series methods only if justified

Potential features:
- cumulative rainfall deficit
- temperature
- soil moisture
- vegetation index
- evapotranspiration-related indicators
- groundwater-related variables where available
- historical drought indicators

### Heat Wave

Start with:
- XGBoost / Random Forest
- time-series forecasting where useful

Potential features:
- temperature
- humidity
- heat index
- minimum/maximum temperature
- nighttime temperature
- wind
- duration of abnormal temperature
- historical heat events

---

# 7. FALSE DETECTION / FALSE POSITIVE MITIGATION

This is a CORE requirement.

Never trigger a critical disaster alert from a single noisy sensor reading.

Implement layered validation:

## Layer 1 — Sensor validation

- Range checks
- Missing-value detection
- Sensor-health checks
- Impossible-value rejection
- Calibration status
- Duplicate timestamp detection

## Layer 2 — Temporal validation

Example:

Do not classify a one-second abnormal temperature spike as a disaster.

Require persistence over a configurable period where appropriate.

## Layer 3 — Spatial validation

Compare readings from nearby sensors where available.

Example:
- Sensor A detects abnormal smoke.
- Nearby sensors do not.
- Mark as suspicious/anomaly rather than immediately issuing a critical regional alert.

## Layer 4 — Multi-source fusion

Combine:
- IoT data
- Weather data
- Historical patterns
- Satellite/environmental data
- GIS/topographic information
- Citizen reports

## Layer 5 — ML confidence

Store:
- probability
- confidence
- model version
- feature snapshot
- timestamp

## Layer 6 — Decision rules

Example:

```text
IF probability >= 0.85
AND confidence >= configured threshold
AND sensor quality = GOOD
AND anomaly persists
THEN HIGH/CRITICAL

ELSE IF probability >= 0.65
AND supporting evidence exists
THEN WATCH

ELSE
MONITOR
```

Thresholds must be configurable by authorized administrators.

Do not claim that the system can eliminate false positives. The objective is to REDUCE and manage them.

---

# 8. RISK SCORING

Use a standardized risk representation.

Example:

```text
Hazard Probability: 0–100%
Impact: 0–100
Exposure: 0–100
Confidence: 0–100%

Risk Score =
weighted combination of
probability + impact + exposure
with confidence used as a reliability gate
```

Do not present invented mathematical certainty.

Keep the scoring formula configurable.

Risk levels:

```text
0–24   SAFE
25–49  LOW
50–69  MODERATE
70–84  HIGH
85–100 CRITICAL
```

These ranges are initial prototype defaults and must be configurable after validation.

---

# 9. IoT HARDWARE ARCHITECTURE

Design the physical system from scratch.

## General environmental node

Recommended starting controller:
- ESP32

Possible sensors:
- Temperature/humidity
- Rainfall
- Soil moisture
- Water level
- Smoke/gas
- Wind speed/direction

Not every node needs every sensor.

Use a HYBRID topology.

## Flood node

Priority:
- Water level
- Rainfall
- Soil moisture
- Temperature/humidity

## Forest-fire node

Priority:
- Temperature
- Humidity
- Smoke/gas
- Wind
- Optional flame/thermal detection

## Drought node

Priority:
- Soil moisture
- Temperature
- Humidity
- Rainfall

## Heat-wave node

Priority:
- Temperature
- Humidity
- Wind

Each physical device must have:

```text
device_id
node_id
zone_id
sensor_type
firmware_version
timestamp
latitude
longitude
battery/power status
connectivity status
sensor health
```

---

# 10. IoT COMMUNICATION

Use MQTT as the preferred prototype messaging protocol.

Example topic structure:

```text
disaster/{zone_id}/{node_id}/telemetry
disaster/{zone_id}/{node_id}/health
disaster/{zone_id}/{node_id}/alerts
```

Example telemetry:

```json
{
  "device_id": "NODE-FLOOD-001",
  "zone_id": "ZONE-001",
  "timestamp": "ISO-8601",
  "temperature": 31.4,
  "humidity": 82.1,
  "rainfall_mm": 44.2,
  "water_level_m": 2.14,
  "soil_moisture": 71.3,
  "battery": 89,
  "signal": -62
}
```

Do not hard-code secrets in firmware repositories.

---

# 11. SENSOR DEPLOYMENT MODEL

The system should support multiple zones.

Example:

```text
ZONE A
 ├── Flood Node 01
 ├── Flood Node 02
 └── Rain Node 01

ZONE B
 ├── Forest Node 01
 ├── Forest Node 02
 └── Weather Node 01

ZONE C
 ├── Drought Node 01
 └── Heat Node 01
```

The AI must understand that measurements are geographically contextual.

Every reading should map to a zone.

---

# 12. EARLY WARNING DASHBOARD

The third primary page should look like an emergency intelligence/control center.

## Main sections

### Top KPI row

- Active hazards
- Critical zones
- Sensors online
- Active alerts
- Active incidents

### Main map

Show:
- Hazard polygons/zones
- Sensor nodes
- Risk levels
- Rescue resources
- Shelters
- SOS incidents

### Live telemetry

Charts for:
- Temperature
- Humidity
- Rainfall
- Water level
- Soil moisture
- Smoke/gas

### AI panel

Show:

```text
HAZARD
Flood

Probability
87%

Risk
HIGH

Confidence
91%

Trend
INCREASING

Model
Flood-XGB-v1.2

Recommended action
Pre-position rescue resources
and issue local preparedness alert
```

---

# 13. CITIZEN PAGE

The citizen interface must prioritize simplicity.

## Landing/login

Primary actions:

```text
LOGIN
REGISTER
SEND EMERGENCY SOS
VIEW ACTIVE WARNINGS
```

Avoid overwhelming citizens with technical AI metrics.

## Citizen dashboard

Show:
- Current warnings
- Nearby hazards
- Safe shelters
- Emergency contacts
- My SOS incidents
- Location status

## SOS workflow

```text
SEND SOS
    ↓
Permission/location
    ↓
Emergency category
    ↓
Number of people
    ↓
Optional description/photo
    ↓
Confirm
    ↓
Incident created
    ↓
Nearest suitable agency notified
    ↓
Incident tracking
```

Emergency categories:
- Medical
- Fire
- Flood
- Trapped
- Missing person
- Evacuation
- Infrastructure danger
- Other

Citizen should see:
- Incident ID
- Status
- Assigned agency where appropriate
- Important safety instruction

---

# 14. RESCUE AGENCY PAGE

This is an OPERATIONS CENTER, not a generic admin panel.

## Main dashboard

Show:
- Active disasters
- New SOS
- Assigned incidents
- Unassigned incidents
- Available teams
- Available vehicles
- Equipment
- Shelters
- Nearby agencies

## Live map

Layers:
- Disaster zones
- Citizen SOS
- Agencies
- Rescue teams
- Ambulances
- Fire units
- Hospitals
- Shelters
- IoT nodes

## Inter-agency coordination

Allow verified agencies to:
- See relevant incidents
- Offer assistance
- Request assistance
- Assign teams
- Update status
- Share resource availability
- Escalate incidents
- Transfer responsibility
- Broadcast operational messages

Do not expose sensitive citizen information to every user. Use role/incident-based permissions.

---

# 15. POST-DISASTER MODULE

Add a recovery/assessment layer.

Possible inputs:
- Satellite imagery
- Drone imagery
- Before/after imagery
- Incident reports
- Agency reports

AI-assisted outputs:
- Damaged buildings
- Burned area
- Flooded area
- Road/infrastructure damage
- Priority zones
- Relief requirements

For SIH MVP, this can be a simulated or dataset-backed module if live satellite/drone integration is too large.

---

# 16. GIS DESIGN

Use MapLibre/Leaflet.

Map should support:
- Zoom
- Search
- Layer controls
- Risk zones
- Sensors
- Incidents
- Agencies
- Shelters
- Rescue assets

Suggested layer colors:

```text
SAFE       #16A34A
LOW        #84CC16
MODERATE   #FACC15
HIGH       #F97316
CRITICAL   #DC2626
INFO       #2563EB
```

Do not use red everywhere. Red should mean danger.

---

# 17. VISUAL DESIGN SYSTEM

The platform should feel like a professional emergency operations system.

## Overall style

- Dark command-center theme for agency/AI dashboards
- Light, accessible citizen interface
- High contrast
- Clear status indicators
- Minimal decorative animation
- No unnecessary gradients
- No excessive glassmorphism

## Suggested palette

```text
Background dark: #0B1220
Surface:          #111827
Surface elevated: #1F2937
Text primary:     #F9FAFB
Text secondary:   #CBD5E1

Success:          #16A34A
Warning:          #F59E0B
Danger:           #F97316
Critical:         #DC2626
Info:             #2563EB
```

## Typography

Use:
- Inter or equivalent modern sans-serif
- Strong numeric hierarchy
- Large emergency headings
- Accessible body text

## UI principles

- 8px spacing system
- 12–16px card radius
- Consistent button hierarchy
- Keyboard accessibility
- Responsive layouts
- WCAG-conscious contrast
- Clear focus states

---

# 18. RESPONSIVE DESIGN

The citizen interface must work especially well on mobile.

Agency and AI dashboards prioritize:
- Desktop
- Large tablet
- Command-center displays

Breakpoints should be handled systematically.

Do not simply shrink desktop layouts onto mobile.

---

# 19. DATABASE MODEL

## Supabase/PostgreSQL

Recommended entities:

```text
users
roles
user_roles
citizen_profiles
agencies
agency_members
teams
resources
shelters
incidents
incident_assignments
incident_status_history
emergency_messages
audit_logs
```

## MongoDB

Recommended collections:

```text
sensor_readings
device_health
ai_predictions
risk_events
alert_events
environmental_timeseries
model_runs
anomaly_events
```

Use timestamps and indexes carefully.

High-volume telemetry must not be stored inefficiently.

---

# 20. API DESIGN

Example REST structure:

```text
/api/v1/auth
/api/v1/citizens
/api/v1/agencies
/api/v1/incidents
/api/v1/sos
/api/v1/sensors
/api/v1/telemetry
/api/v1/predictions
/api/v1/risks
/api/v1/alerts
/api/v1/resources
/api/v1/shelters
/api/v1/maps
/api/v1/models
/api/v1/admin
```

Example:

```text
POST /api/v1/sos
GET  /api/v1/incidents
PATCH /api/v1/incidents/{id}
GET  /api/v1/agencies/nearby
POST /api/v1/incidents/{id}/assign
GET  /api/v1/risk-zones
GET  /api/v1/sensors/{id}/telemetry
```

Use:
- authentication
- authorization
- request validation
- rate limiting
- structured error responses
- audit logging

---

# 21. REAL-TIME ARCHITECTURE

Use WebSockets where real-time updates materially matter.

Examples:
- New SOS
- AI risk escalation
- Sensor anomaly
- Agency assignment
- Incident status
- Resource availability

Do not poll every page every few seconds.

---

# 22. SECURITY

Security is mandatory.

Implement:
- Password hashing
- JWT/session security
- Role-based access control
- Input validation
- API rate limiting
- CORS configuration
- Environment secrets
- Audit logs
- Secure file upload validation
- Least-privilege permissions
- Location-data minimization

Never expose:
- database credentials
- API keys
- MQTT credentials
- JWT signing secrets

in frontend source code or Git.

---

# 23. DATA PRIVACY

Citizen GPS and SOS data are sensitive operational data.

Rules:
- Only collect necessary information.
- Only authorized agencies should see relevant incident details.
- Do not expose exact citizen locations publicly.
- Log access to sensitive incidents.
- Define data retention policies.
- Separate public hazard information from private emergency information.

---

# 24. AI TRAINING PIPELINE

The AI system should distinguish TRAINING from REAL-TIME INFERENCE.

```text
Historical datasets
      +
Validated sensor data
      +
External environmental data
      |
      v
Data cleaning
      |
      v
Feature engineering
      |
      v
Train/validation/test split
      |
      v
Baseline model
      |
      v
XGBoost / RF
      |
      v
Evaluation
      |
      v
Model registry/version
      |
      v
Deployment
      |
      v
Real-time inference
```

Avoid leakage:
- Do not randomly mix future information into historical training.
- For time-series problems, use chronological validation.

Evaluate with suitable metrics:
- Precision
- Recall
- F1
- ROC-AUC where appropriate
- PR-AUC for imbalanced events
- Calibration
- False-positive rate
- False-negative rate

For disaster warning systems, do not optimize only for accuracy.

---

# 25. DATA QUALITY

Every sensor reading needs quality metadata.

Example:

```text
quality = GOOD
quality = SUSPECT
quality = INVALID
```

Reasons:
- out of range
- missing
- stale
- sensor disconnected
- calibration issue
- communication error
- conflicting nearby measurements

The AI should not blindly train on bad sensor readings.

---

# 26. MODEL OUTPUT CONTRACT

Every prediction should return something conceptually like:

```json
{
  "hazard": "flood",
  "zone_id": "ZONE-001",
  "probability": 0.87,
  "risk_score": 82,
  "confidence": 0.91,
  "severity": "HIGH",
  "trend": "INCREASING",
  "model_version": "flood-xgb-1.2",
  "timestamp": "ISO-8601",
  "recommended_actions": [
    "Prepare rescue resources",
    "Monitor water-level trend",
    "Issue localized preparedness alert"
  ]
}
```

---

# 27. RECOMMENDATION ENGINE

The system should not stop at prediction.

Example:

```text
Prediction
    ↓
Risk
    ↓
Exposure
    ↓
Available resources
    ↓
Recommended action
```

Potential actions:
- Issue warning
- Monitor
- Increase sensor sampling
- Notify authority
- Pre-position rescue team
- Prepare shelter
- Recommend evacuation
- Request additional agency support

Recommendations must be presented as decision support, not unquestionable autonomous commands.

---

# 28. PROJECT DIRECTORY

Recommended monorepo:

```text
invincible-disaster-platform/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── maps/
│   │   ├── charts/
│   │   ├── auth/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── auth/
│   │   ├── websocket/
│   │   ├── database/
│   │   └── main.py
│   └── requirements.txt
│
├── ai/
│   ├── datasets/
│   ├── preprocessing/
│   ├── features/
│   ├── models/
│   ├── training/
│   ├── inference/
│   ├── evaluation/
│   └── model_registry/
│
├── iot/
│   ├── firmware/
│   ├── sensor_configs/
│   ├── mqtt/
│   └── simulators/
│
├── docs/
├── tests/
├── docker/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 29. DEVELOPMENT PHASES

DO NOT build everything at once.

## Phase 1
Repository + architecture + coding standards

## Phase 2
Supabase authentication + RBAC

## Phase 3
MongoDB telemetry architecture

## Phase 4
Backend API foundation

## Phase 5
Frontend shell + routing

## Phase 6
Citizen interface

## Phase 7
Agency operations interface

## Phase 8
GIS/map interface

## Phase 9
IoT simulator

Before connecting physical hardware, create a simulator producing realistic telemetry.

## Phase 10
Real ESP32 sensor integration

## Phase 11
AI baseline models

## Phase 12
Risk scoring + false-positive engine

## Phase 13
Real-time alerts

## Phase 14
Citizen SOS → agency workflow

## Phase 15
Post-disaster assessment

## Phase 16
Testing

## Phase 17
Deployment

## Phase 18
SIH demonstration scenario

---

# 30. MODEL SELECTION FOR CODING/AI ASSISTANCE

Use the strongest reasoning/coding model available in the user's ChatGPT/Codex environment for:

- System architecture
- Database design
- Backend architecture
- AI pipeline
- ML debugging
- IoT/backend integration
- Security
- Difficult bugs
- Cross-module refactoring
- Production deployment problems

Use a faster coding model for:
- Simple UI components
- CSS adjustments
- Basic CRUD screens
- Boilerplate
- Small refactors
- Documentation

Do not ask an LLM to invent scientific model performance. Model metrics must come from actual experiments.

For difficult AI/data-science work, prefer a high-reasoning model and provide the actual dataset/schema.

---

# 31. CODEX OPERATING RULES

When using this document with Codex:

1. Read this entire specification before modifying the repository.
2. Inspect the existing repository before writing code.
3. Do not delete working functionality without justification.
4. Do not invent API keys, database URLs, hardware measurements, datasets, or model accuracy.
5. Use environment variables for secrets.
6. Keep modules loosely coupled.
7. Use TypeScript in frontend code.
8. Use Python type hints and Pydantic schemas in backend code.
9. Add tests for critical logic.
10. Keep AI models independently testable.
11. Keep sensor ingestion independently testable.
12. Use mocked/simulated IoT data before requiring physical hardware.
13. Document setup commands.
14. Maintain `.env.example`.
15. Never commit `.env`.
16. Prefer reusable components.
17. Do not hard-code emergency agency data.
18. Clearly label simulated data in the UI.
19. Do not claim a prediction is guaranteed.
20. Preserve auditability of AI predictions and emergency actions.

---

# 32. SIH DEMO STRATEGY

The demo should tell ONE continuous story.

Example:

### STEP 1
IoT sensor node sends real-time environmental readings.

### STEP 2
Dashboard receives the readings.

### STEP 3
AI detects increasing hazard probability.

### STEP 4
Risk score rises.

### STEP 5
System validates the signal against temporal/spatial/multi-source rules.

### STEP 6
Localized warning is generated.

### STEP 7
Rescue dashboard sees the affected zone.

### STEP 8
Resources are pre-positioned.

### STEP 9
A simulated citizen in the affected zone sends SOS.

### STEP 10
Nearest suitable agency receives the incident.

### STEP 11
Agency assigns a rescue team.

### STEP 12
Incident status updates in real time.

### STEP 13
After the simulated event, damage assessment/recovery screen displays affected areas.

This creates a complete story:

> **Real sensor → AI → warning → preparedness → citizen → rescue agency → coordination → recovery**

---

# 33. MVP VS ADVANCED FEATURES

## MVP — MUST WORK

- Authentication
- Citizen dashboard
- Agency dashboard
- AI/early-warning dashboard
- Interactive map
- Real-time sensor ingestion
- IoT simulator
- At least one real ESP32 sensor node
- AI prediction pipeline
- Risk score
- Alert system
- Citizen SOS
- Agency assignment
- Real-time incident status

## ADVANCED

- All four hazard models
- Multiple physical zones
- Satellite integration
- Drone imagery
- Automated damage detection
- Resource optimization
- Advanced forecasting
- Mobile PWA
- Offline support
- Multi-language interface

Never sacrifice MVP reliability for advanced features.

---

# 34. FINAL PROJECT POSITIONING

Do NOT describe the project as:

> "A website for disaster management."

Describe it as:

> **An AI- and IoT-powered multi-hazard disaster intelligence and emergency coordination platform that converts real-time environmental observations into localized risk predictions, actionable early warnings, and coordinated citizen-to-agency response.**

Core innovation:

> **Closing the loop between environmental sensing, AI prediction, early warning, citizen reporting, and inter-agency emergency response.**

---

# 35. SUCCESS CRITERIA

The prototype is successful when:

1. A real sensor produces data.
2. IoT reliably transports that data.
3. Backend validates and stores it.
4. AI consumes it.
5. AI generates a measurable prediction.
6. Risk engine produces a severity score.
7. False-positive safeguards are applied.
8. Alert appears on the appropriate dashboard.
9. Citizen can create SOS.
10. Agency can receive and assign SOS.
11. Multiple agencies can coordinate.
12. GIS map reflects the operational state.
13. Incident status updates in real time.
14. The system can explain why an alert was generated.
15. The demo can run reliably using both real hardware and simulated data.

---

# 36. IMPORTANT ENGINEERING PRINCIPLE

This is a disaster-management decision-support platform.

The system should:

**ASSIST humans → not pretend to replace emergency authorities.**

AI predictions must be:
- explainable enough for operators
- auditable
- confidence-aware
- versioned
- traceable to input data

Emergency decisions should remain under authorized human control.

---

# 37. FIRST IMPLEMENTATION TASK FOR CODEX

Before writing application code, Codex should produce:

1. Final architecture diagram
2. Repository structure
3. Database ER/data model
4. API contract
5. IoT message contract
6. AI input/output contract
7. Authentication/RBAC matrix
8. UI route map
9. Design-token file
10. Development task backlog

Only after those are reviewed should implementation begin.

---

# END OF MASTER SPECIFICATION
