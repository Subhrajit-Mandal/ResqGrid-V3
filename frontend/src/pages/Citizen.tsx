import { createId } from "../shared/ids";
import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  ShieldCheck,
  LifeBuoy,
  Bell,
  Building2,
  ClipboardList,
  CheckCircle2,
  MessageSquare,
  Users,
  Waves,
  Flame,
  HeartPulse,
  TriangleAlert,
  Navigation,
  Info,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { useDemo } from "../domain/store";
import { zones, shelters } from "../domain/fixtures";
import type { Incident } from "../domain/types";
import { Badge, Panel, DemoNote, Empty, formatTime } from "../shared/ui";
import { MapView } from "../shared/MapView";
function CitizenNav() {
  return (
    <nav className="citizen-subnav" aria-label="Citizen navigation">
      <NavLink to="/me" end>
        <Bell size={16} />
        Local situation
      </NavLink>
      <NavLink to="/sos">
        <LifeBuoy size={16} />
        Request help
      </NavLink>
      <NavLink to="/me/requests">
        <ClipboardList size={16} />
        My requests
      </NavLink>
      <NavLink to="/shelters">
        <Building2 size={16} />
        Shelters
      </NavLink>
      <NavLink to="/me/messages">
        <MessageSquare size={16} />
        Messages
      </NavLink>
    </nav>
  );
}
export function Citizen({ warningsOnly = false }: { warningsOnly?: boolean }) {
  const { state } = useDemo();
  const [selected, setSelected] = useState("Z-01");
  const published = state.warnings.filter(
    (w) => w.status === "Published" && new Date(w.expiresAt) > new Date(),
  );
  return (
    <>
      <CitizenNav />
      <div className="citizen-heading">
        <div>
          <span className="eyebrow">CITIZEN SERVICES</span>
          <h1>
            {warningsOnly ? "Published demo warnings" : "Your local situation"}
          </h1>
          <p>Warnings, places of refuge and a clear way to request help.</p>
        </div>
        <label className="select-with-icon">
          <MapPin size={16} />
          <select
            aria-label="Your demo area"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} · Assam
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="citizen-summary">
        <div>
          <span className="mini-label">CURRENT AREA</span>
          <h2>{zones.find((z) => z.id === selected)?.name}</h2>
          <span className="muted">
            Guwahati region · demonstration locations
          </span>
        </div>
        <div className="summary-number">
          <strong>
            {published.filter((w) => w.zoneId === selected).length}
          </strong>
          <span>
            published demo
            <br />
            warnings in this area
          </span>
        </div>
        <Link to="/sos" className="button emergency">
          <LifeBuoy size={19} />
          Request demo SOS
        </Link>
      </div>
      <div className="citizen-content-grid">
        <div>
          <Panel
            title="Current warnings"
            action={<Badge tone="info">SIMULATED</Badge>}
          >
            <div className="citizen-warning-list">
              {published
                .filter((w) => w.zoneId === selected)
                .map((w) => (
                  <article className="citizen-warning" key={w.id}>
                    <div className="warning-icon">
                      <TriangleAlert size={23} />
                    </div>
                    <div>
                      <div className="warning-title">
                        <Badge tone={w.severity}>{w.severity} scenario</Badge>
                        <span>{formatTime(w.createdAt)}</span>
                      </div>
                      <h3>{w.title}</h3>
                      <p>{w.instructions}</p>
                      <small>
                        Demo publisher · expires {formatTime(w.expiresAt)}
                      </small>
                    </div>
                  </article>
                ))}
              {!published.some((w) => w.zoneId === selected) && (
                <Empty
                  title="No published demo warning"
                  text="This does not establish that the area is safe. Live conditions have not been assessed."
                />
              )}
            </div>
          </Panel>
          <div className="citizen-quick-grid">
            <Link className="quick-card" to="/me/requests">
              <ClipboardList size={25} />
              <h3>Track a request</h3>
              <p>See acknowledgement and assignment updates.</p>
            </Link>
            <Link className="quick-card" to="/shelters">
              <Building2 size={25} />
              <h3>Find a shelter</h3>
              <p>Inspect example locations, capacity and facilities.</p>
            </Link>
          </div>
          <div className="contact-note">
            <ShieldCheck size={21} />
            <div>
              <strong>Live emergency contacts are not configured</strong>
              <p>
                This prototype cannot dispatch emergency assistance. Use
                verified local emergency channels for a real emergency.
              </p>
            </div>
          </div>
        </div>
        <Panel className="citizen-map-panel" title="Area overview">
          <MapView selected={selected} onSelect={setSelected} light />
          <div className="map-caption">
            <span>Illustrative hazard zones</span>
            <Link to="/shelters">View shelter list</Link>
          </div>
        </Panel>
      </div>
      <section className="citizen-support-strip">
        <ShieldCheck size={22} />
        <div>
          <h2>Your next step, clearly explained.</h2>
          <p>
            Review local warnings, request demo assistance, or follow your
            request timeline from this workspace.
          </p>
        </div>
        <Link to="/me/requests">Track my requests</Link>
      </section>
    </>
  );
}
const categories = [
  ["Medical", HeartPulse],
  ["Fire", Flame],
  ["Flood", Waves],
  ["Trapped", LifeBuoy],
  ["Missing person", Users],
  ["Evacuation", Navigation],
  ["Infrastructure danger", TriangleAlert],
  ["Other", Info],
] as const;
export function Sos() {
  const { mutate, notify } = useDemo();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Flood");
  const [zoneId, setZone] = useState("Z-01");
  const [landmark, setLandmark] = useState("");
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  function next() {
    setError("");
    if (step === 1 && !landmark.trim()) {
      setError("Add a demo landmark so the request has a useful location.");
      return;
    }
    if (
      step === 2 &&
      (!Number.isInteger(people) || people < 1 || people > 1000)
    ) {
      setError("Enter a whole number between 1 and 1000.");
      return;
    }
    setStep((s) => s + 1);
  }
  function submit() {
    if (sent) return;
    setSent(true);
    const id = `RG-${createId().slice(0, 8).toUpperCase()}`;
    const time = new Date().toISOString();
    const incident: Incident = {
      id,
      category,
      people,
      description: description.trim(),
      zoneId,
      landmark: landmark.trim(),
      status: "New",
      priority:
        category === "Medical" || category === "Trapped" ? "Critical" : "High",
      ownerId: "demo-citizen",
      agencyId: null,
      teamId: null,
      createdAt: time,
      version: 1,
      timeline: [{ time, action: "Demo SOS received in this browser" }],
    };
    mutate(
      (s) => ({ ...s, incidents: [incident, ...s.incidents] }),
      `${id}: demo SOS received`,
    );
    notify("Demo request created. No emergency service was contacted.");
    navigate(`/me/requests/${id}`);
  }
  return (
    <>
      <CitizenNav />
      <div className="sos-layout">
        <div className="sos-intro">
          <span className="eyebrow">CITIZEN EMERGENCY WORKFLOW</span>
          <h1>Request help</h1>
          <p>Share the essential details, then review before sending.</p>
          <DemoNote />
          <div className="sos-steps">
            {["Location & category", "People & details", "Review & submit"].map(
              (label, i) => (
                <div
                  className={
                    step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                  }
                  key={label}
                >
                  <span>
                    {step > i + 1 ? <CheckCircle2 size={17} /> : i + 1}
                  </span>
                  <strong>{label}</strong>
                </div>
              ),
            )}
          </div>
          <div className="contact-note">
            <Lock size={20} />
            <p>
              Use fictional details only. Demo requests are stored in this
              browser.
            </p>
          </div>
        </div>
        <Panel className="sos-form">
          <span className="eyebrow">STEP {step} OF 3</span>
          <h2>
            {step === 1
              ? "Where do you need help?"
              : step === 2
                ? "What assistance is needed?"
                : "Review your demo request"}
          </h2>
          {step === 1 && (
            <>
              <label className="field">
                Demo zone
                <select
                  value={zoneId}
                  onChange={(e) => setZone(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <small>
                  No precise real-world location is collected in this demo.
                </small>
              </label>
              <label className="field">
                Demo landmark
                <input
                  autoComplete="off"
                  maxLength={160}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="For example: Riverside lane, blue gate"
                />
              </label>
              <fieldset className="category-fieldset">
                <legend>Emergency category</legend>
                <div className="category-grid">
                  {categories.map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      className={category === name ? "selected" : ""}
                      aria-pressed={category === name}
                      onClick={() => setCategory(name)}
                    >
                      <Icon size={19} />
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {step === 2 && (
            <>
              <label className="field">
                Number of people
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={people}
                  onChange={(e) => setPeople(Number(e.target.value))}
                />
              </label>
              <label className="field">
                Description <span className="muted">(optional)</span>
                <textarea
                  value={description}
                  maxLength={1000}
                  rows={5}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell the responding team what they need to know. Use demo details only."
                />
                <small>{description.length}/1000 characters</small>
              </label>
              <div className="upload-note">
                <Info size={16} />
                Photo uploads require private storage and are unavailable in
                this demo.
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <dl className="detail-list review-details">
                <div>
                  <dt>Category</dt>
                  <dd>{category}</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{zones.find((z) => z.id === zoneId)?.name}</dd>
                </div>
                <div>
                  <dt>Landmark</dt>
                  <dd>{landmark}</dd>
                </div>
                <div>
                  <dt>People</dt>
                  <dd>{people}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{description || "Not provided"}</dd>
                </div>
              </dl>
              <div className="notice-box">
                <TriangleAlert size={21} />
                <p>
                  This will create a simulated incident in this browser. No real
                  rescue agency will receive it.
                </p>
              </div>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {step > 1 ? (
              <button
                className="button secondary"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                Back
              </button>
            ) : (
              <Link className="button secondary" to="/me">
                Cancel
              </Link>
            )}
            {step < 3 ? (
              <button className="button primary" onClick={next}>
                Continue
              </button>
            ) : (
              <button
                disabled={sent}
                className="button emergency"
                onClick={submit}
              >
                Confirm demo SOS
              </button>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
export function MyRequests() {
  const { state } = useDemo();
  const { incidentId } = useParams();
  const incident = state.incidents.find(
    (i) => i.id === incidentId && i.ownerId === "demo-citizen",
  );
  const requests = state.incidents.filter((i) => i.ownerId === "demo-citizen");
  return (
    <>
      <CitizenNav />
      <div className="citizen-heading">
        <div>
          <span className="eyebrow">YOUR REQUESTS</span>
          <h1>{incident ? "Request tracking" : "My demo requests"}</h1>
          <p>Received, acknowledged and assigned are separate milestones.</p>
        </div>
        <Link className="button secondary" to="/sos">
          New demo request
        </Link>
      </div>
      {incidentId && !incident ? (
        <Empty
          title="Request not available"
          text="This request is not part of the current demo citizen session."
        />
      ) : incident ? (
        <div className="request-detail-grid">
          <Panel
            title={incident.id}
            action={
              <Badge tone={incident.status === "New" ? "warning" : "info"}>
                {incident.status}
              </Badge>
            }
          >
            <dl className="detail-list">
              <div>
                <dt>Category</dt>
                <dd>{incident.category}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{incident.landmark}</dd>
              </div>
              <div>
                <dt>People</dt>
                <dd>{incident.people}</dd>
              </div>
              <div>
                <dt>Assigned agency</dt>
                <dd>
                  {state.agencies.find((a) => a.id === incident.agencyId)
                    ?.name || "Awaiting assignment"}
                </dd>
              </div>
              <div>
                <dt>Assigned team</dt>
                <dd>
                  {state.resources.find((r) => r.id === incident.teamId)
                    ?.name || "Not assigned"}
                </dd>
              </div>
            </dl>
            <DemoNote compact />
            <Link className="button secondary" to="/me/messages">
              View response messages
            </Link>
          </Panel>
          <Panel title="Response timeline">
            <ol className="timeline">
              {incident.timeline.map((e, i) => (
                <li key={`${e.time}-${i}`}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{e.action}</strong>
                    <small>{formatTime(e.time)} · simulated workflow</small>
                  </div>
                </li>
              ))}
            </ol>
            <Link className="text-link" to="/me/messages">
              Send a demo message
            </Link>
          </Panel>
        </div>
      ) : (
        <Panel title="Requests in this demo session">
          <div className="request-list">
            {requests.map((i) => (
              <Link key={i.id} to={`/me/requests/${i.id}`}>
                <span className="request-icon">
                  <LifeBuoy size={22} />
                </span>
                <div>
                  <strong>
                    {i.category} · {i.id}
                  </strong>
                  <p>{i.landmark}</p>
                  <small>
                    {i.people} people · {formatTime(i.createdAt)}
                  </small>
                </div>
                <Badge tone={i.status === "New" ? "warning" : "info"}>
                  {i.status}
                </Badge>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
export function Shelters() {
  const [selected, setSelected] = useState("Z-02");
  return (
    <>
      <CitizenNav />
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLACES OF REFUGE</span>
          <h1>Shelter directory</h1>
          <p>
            Example facilities. Capacity and access are simulated, not verified
            availability.
          </p>
        </div>
        <Badge tone="info">DEMO DIRECTORY</Badge>
      </div>
      <div className="shelter-grid">
        {shelters.map((s) => (
          <Panel key={s.id} title={s.name} action={<Building2 size={22} />}>
            <div className="shelter-location">
              <MapPin size={15} />
              {zones.find((z) => z.id === s.zoneId)?.name}
            </div>
            <div className="shelter-capacity">
              <strong>{s.capacity - s.occupied}</strong>
              <span>illustrative spaces remaining</span>
            </div>
            <div className="capacity-track">
              <span style={{ width: `${(s.occupied / s.capacity) * 100}%` }} />
            </div>
            <p>
              {s.occupied} / {s.capacity} illustrative occupancy
            </p>
            <Badge tone={s.accessible ? "success" : "neutral"}>
              {s.accessible
                ? "Example accessible facilities"
                : "Accessibility not specified"}
            </Badge>
            <button
              className="button secondary full"
              onClick={() => {
                setSelected(s.zoneId);
                document
                  .getElementById("shelter-map")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Locate on demo map
            </button>
          </Panel>
        ))}
      </div>
      <Panel title="Shelter area map" className="shelter-map">
        <div id="shelter-map">
          <MapView selected={selected} onSelect={setSelected} light />
        </div>
        <p className="map-caption">
          Enable the shelter layer to inspect example points. Safe travel routes
          have not been assessed.
        </p>
      </Panel>
    </>
  );
}
export function Messages() {
  const { state, mutate, notify } = useDemo();
  const [incidentId, setIncident] = useState(
    state.incidents.find((i) => i.ownerId === "demo-citizen")?.id || "",
  );
  const [text, setText] = useState("");
  const own = state.incidents.filter((i) => i.ownerId === "demo-citizen");
  return (
    <>
      <CitizenNav />
      <div className="citizen-heading">
        <div>
          <span className="eyebrow">EMERGENCY QUERIES</span>
          <h1>Messages</h1>
          <p>Demo conversation attached to your request.</p>
        </div>
      </div>
      <Panel title="Incident conversation">
        <label className="field">
          Your request
          <select
            value={incidentId}
            onChange={(e) => setIncident(e.target.value)}
          >
            {own.map((i) => (
              <option value={i.id} key={i.id}>
                {i.id} · {i.category}
              </option>
            ))}
          </select>
        </label>
        <div className="message-list">
          {state.messages
            .filter((m) => m.incidentId === incidentId)
            .map((m) => (
              <div className={`message ${m.sender.toLowerCase()}`} key={m.id}>
                <strong>
                  {m.sender} · {formatTime(m.createdAt)}
                </strong>
                <p>{m.text}</p>
              </div>
            ))}
          {!state.messages.some((m) => m.incidentId === incidentId) && (
            <Empty
              title="No demo messages"
              text="Send a fictional update. Agency replies can be entered from the rescue workspace."
            />
          )}
        </div>
        <form
          className="message-compose"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim() || !incidentId) return;
            mutate(
              (s) => ({
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: createId(),
                    incidentId,
                    text: text.trim(),
                    sender: "Citizen",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }),
              "Demo citizen message added",
            );
            setText("");
            notify("Demo message stored in this browser");
          }}
        >
          <label className="field">
            Message
            <textarea
              rows={3}
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a demo update"
              required
            />
          </label>
          <button
            className="button primary"
            disabled={!incidentId || !text.trim()}
          >
            Send demo message
          </button>
        </form>
      </Panel>
    </>
  );
}
