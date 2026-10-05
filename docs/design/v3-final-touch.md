# RESQGRID V3 frontend final touch — 2026-10-05

## Repository findings and boundaries
This is an incremental frontend refactor of the existing React/Vite Site, not a replacement project. The previous browser-local data key, fixture shapes, workflow engine, routes, API clients and backend contracts are retained. FastAPI, databases, model pipeline, MQTT and firmware are unchanged. The master blueprint remains authoritative for production scope; this update completes the requested review UI rather than claiming a commissioned operational system.

## Landing and visual system
Following the latest explicit user correction, the landing displays their uploaded image unchanged as `frontend/public/art/landing-approved.png`. Accessible real LOGIN and lifecycle links are aligned to the artwork on desktop. On small screens the image scales intact, with readable interactive controls below. This replaces the initial authored landing and generated artwork; it does not change any operational workspace or workflow.

`frontend/src/design/v3.css` owns the new navy/cyan/ice/teal palette, component treatments, spacing, radii, focus states, reduced-motion overrides and responsive rules. Red indicates danger and SOS; lifecycle recovery uses muted coral. Command screens use evidence/response briefs, legible status groupings, priority ordered incident rows and a quieter sidebar. Citizen screens remain light with clear navigation, warning instructions, SOS review and tracking.

## Access and role routing
`frontend/src/auth/config.ts` defines the three role choices, one shared public password (`RESQGRID2026`) and route permissions. `DemoAuth.tsx` handles a validated browser session, 12-hour expiry, cross-tab session synchronization, logout and guards. `Login.tsx` provides native-dialog focus containment, keyboard/Escape dismissal, validation, password error and loading states. Roles enter Citizen `/me`, Agency `/operations`, Super Admin `/admin`; authorized deep links may resume. Citizen cannot open Intelligence, Administration or Operations, and Agency cannot open Intelligence/Administration or private Citizen flows. Public warnings/shelters remain read-only entry points.

Logout retains fictional operational data for SIH role demonstrations. It does not reset SOS records or published warnings. Supabase live identity is still pending; these client-side demo restrictions can be bypassed by editing browser storage and must not protect real incident data.

## Preserved workflows and production-build repairs
SOS validation/review, ownership filtering, suitable verified team assignment, conflict checks, state transitions, conversations, warnings, retraction, evidence gates, resources, coordination and recovery remain supported. Queue display now sorts by priority then age without changing assignment semantics. Citizen navigation no longer presents direct operator controls. Optional agent scenario mutation requires the demo admin role.

Browser QA exposed an existing production MapLibre worker packaging issue. The map now uses Vite's bundled worker URL rather than relying on a missing sibling worker file. It also exposed HTTP preview contexts lacking `crypto.randomUUID`; `shared/ids.ts` preserves UUID-format IDs using `crypto.getRandomValues` as a fallback. No backend identifier contract changed. Map fallback notices no longer overlap zone buttons. Charts render without decorative loading animation.

## Verification
- 25 frontend domain/UI tests, including invalid password, expiry, role protection and shared cross-role workflows.
- 40 baseline backend tests, with no backend modifications in this pass.
- 8 Playwright production-bundle checks, including SOS → role switch → agency assignment → role switch → citizen tracking; admin publication → citizen warning; scenario safeguards; optional tool validation; persistence; focus/Escape; responsive overflow; map controls.
- TypeScript/Vite production build and `npm run lint` (type plus Prettier checks). No ESLint dependency is introduced.
- Visual inspection of the landing, login, Citizen, Intelligence, Operations, Administration and Recovery screens; landing sizes 1920×1080, 1366×768, 768×1024 and 390×844.

When the managed preview is unavailable to the local runner, set `PLAYWRIGHT_STATIC_BUILD=dist` to fulfill requests with the exact built files through the test fixture. `PLAYWRIGHT_CHROMIUM_PATH` optionally selects a provisioned local Chromium binary; no browser binary is shipped with the app. `PLAYWRIGHT_SCREENSHOT_DIR` optionally saves QA screenshots outside the repository. Connected CI/staging should also run the tests normally against the dev/preview server.

## Real limitations
This remains a simulated review UI. No live dispatch, authenticated Supabase frontend, cross-browser shared data, GPS/upload flow, provider delivery, commissioned hardware or validated disaster model is claimed. The local browser cannot reach the managed preview, so production files are tested in isolation. OSM base tiles cannot be fetched in this environment; GeoJSON overlays, bundled workers, zoom/selection/layers and the equivalent zone list are verified, but external basemap delivery needs connected staging. Accessibility checks cover keyboard/focus and responsive behavior, not a formal accessibility audit. Generated India terrain is a conceptual hazard illustration, not an authoritative boundary or risk map.

## User-directed landing replacement
The subsequent user correction replaces the authored landing composition with the exact uploaded 2048×1152 PNG, copied unchanged to `frontend/public/art/landing-approved.png`. Desktop LOGIN and lifecycle cards have aligned, keyboard-accessible real controls. The image is never cropped or stretched. On widths at or below 900px it scales intact, with readable login/navigation controls below. Existing role sessions, destinations, guards and all workspaces are retained. This supersedes the earlier instruction against a screenshot-led landing; the latest user explicitly requested their image itself.

## Workspace colour and hierarchy refinement
The user approved the image landing and existing workflows, then requested a more professional and attractive workspace theme. `design/workspaces.css` now scopes midnight navy navigation, light Rescue Operations/Administration/Citizen canvases and graphite Intelligence surfaces. Cobalt primary actions, semantic teal/amber/red status colours, larger supporting labels, consistent panels, readable incident dialogs and 44px buttons improve scanning. Chart styles inherit workspace tokens; map overlays match the semantic risk scale. No auth, routes, workflow engine, API/backend, data contracts, model or hardware behaviour changes. The approved image landing is untouched.

Visual checks cover each main workspace at 1366px, 768px and 390px, mobile incident dialogs/navigation and landing at 1920/1366/768/390px. Browser checks continue to exercise SOS/assignment/tracking and publication flows on the exact production bundle. Existing external basemap/preview transport limitations still apply.
