import { createId } from "../shared/ids";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  ClipboardList,
  LifeBuoy,
  Users,
  Truck,
  Search,
  MapPin,
  X,
  MessageSquare,
  ShieldCheck,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useDemo } from "../domain/store";
import { zones } from "../domain/fixtures";
import { assignTeam, transitionIncident } from "../domain/engine";
import { transitions, type Incident } from "../domain/types";
import { Panel, Stat, Badge, Empty, formatTime } from "../shared/ui";
import { MapView } from "../shared/MapView";
export function Operations() {
  const { state, mutate, notify } = useDemo();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<string | null>(null);
  const [resource, setResource] = useState("");
  const [reply, setReply] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const incident = state.incidents.find((i) => i.id === selected);
  const mapOnly = pathname.endsWith("/map");
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  const visible = state.incidents.filter(
    (i) =>
      (filter === "all" ||
        (filter === "new" && i.status === "New") ||
        (filter === "active" && !["Resolved", "Closed"].includes(i.status))) &&
      `${i.id} ${i.category} ${i.landmark}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const priorityOrder: Record<string, number> = {
    Critical: 0,
    High: 1,
    Moderate: 2,
    Low: 3,
  };
  visible.sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4) ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const urgent = state.incidents.filter(
    (i) =>
      ["Critical", "High"].includes(i.priority) &&
      !["Resolved", "Closed"].includes(i.status),
  );
  const teams = incident
    ? state.resources.filter(
        (r) =>
          r.type === "Rescue team" &&
          r.status === "Available" &&
          state.agencies.find((a) => a.id === r.agencyId)?.verified &&
          state.agencies
            .find((a) => a.id === r.agencyId)
            ?.capabilities.includes(incident.category),
      )
    : [];
  function assign() {
    if (!incident || !resource) return;
    try {
      const next = assignTeam(state, incident.id, resource);
      mutate(() => next, `${incident.id}: demo team assigned`);
      setResource("");
      notify("Demo assignment recorded; citizen tracking updated");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function progress() {
    if (!incident) return;
    const next = transitions[incident.status][0];
    if (!next) return;
    try {
      const result = transitionIncident(state, incident.id, next);
      mutate(() => result, `${incident.id}: ${next}`);
      notify(`Demo incident ${next.toLowerCase()}`);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RESCUE OPERATIONS</span>
          <h1>
            {mapOnly
              ? "Operational map"
              : pathname.endsWith("/incidents")
                ? "Incident queue"
                : "Response overview"}
          </h1>
          <p>Clear ownership. Suitable teams. Coordinated action.</p>
        </div>
        <Badge tone="info">Verified demo agencies</Badge>
      </div>
      <section
        className="command-brief operations-brief"
        aria-label="Response priorities"
      >
        <div className="brief-label">
          <LifeBuoy size={20} />
          <span>RESPONSE PRIORITIES</span>
        </div>
        <div>
          <strong>{urgent.length} urgent active cases</strong>
          <span>
            Critical and high priority cases appear first. Every assignment
            requires a verified, available team.
          </span>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setFilter("new");
            setQuery("");
          }}
        >
          Review new requests
        </button>
      </section>
      <div className="stats-grid">
        <Stat
          label="Active demo incidents"
          value={String(
            state.incidents.filter(
              (i) => !["Resolved", "Closed"].includes(i.status),
            ).length,
          ).padStart(2, "0")}
          detail="Across the demonstration region"
          icon={ClipboardList}
        />
        <Stat
          label="Awaiting acknowledgement"
          value={String(
            state.incidents.filter((i) => i.status === "New").length,
          ).padStart(2, "0")}
          detail="Citizen requests in the queue"
          icon={LifeBuoy}
        />
        <Stat
          label="Available teams"
          value={String(
            state.resources.filter(
              (r) => r.type === "Rescue team" && r.status === "Available",
            ).length,
          ).padStart(2, "0")}
          detail="Capability matching required"
          icon={Users}
        />
        <Stat
          label="Available vehicles / boats"
          value={String(
            state.resources.filter(
              (r) => r.type !== "Rescue team" && r.status === "Available",
            ).length,
          ).padStart(2, "0")}
          detail="Illustrative resource availability"
          icon={Truck}
        />
      </div>
      {mapOnly ? (
        <Panel title="Response geography">
          <MapView incidents={state.incidents} large />
        </Panel>
      ) : (
        <div className="operations-grid">
          <Panel
            title="Incident queue"
            eyebrow="CITIZEN RESPONSE"
            action={
              <div className="queue-order">
                <span>PRIORITY → OLDEST FIRST</span>
                <Badge>{visible.length} cases</Badge>
              </div>
            }
          >
            <div className="queue-controls">
              <label className="search-input">
                <Search size={16} />
                <input
                  aria-label="Search incidents"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search incident, category or location"
                />
              </label>
              <select
                aria-label="Filter incident status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="active">Active incidents</option>
                <option value="new">New requests</option>
                <option value="all">All incidents</option>
              </select>
            </div>
            <div className="incident-list">
              {visible.map((i) => (
                <button
                  className={`incident-row priority-${i.priority.toLowerCase()}`}
                  key={i.id}
                  onClick={() => {
                    setSelected(i.id);
                    setResource("");
                  }}
                >
                  <span
                    className={`incident-priority ${i.priority.toLowerCase()}`}
                  >
                    <LifeBuoy size={19} />
                  </span>
                  <div className="incident-summary">
                    <div>
                      <strong>{i.id}</strong>
                      <Badge tone={i.priority}>{i.priority}</Badge>
                    </div>
                    <h3>
                      {i.category} assistance · {i.people}{" "}
                      {i.people === 1 ? "person" : "people"}
                    </h3>
                    <span>
                      <MapPin size={13} />
                      {i.landmark}
                    </span>
                    <small>
                      {state.agencies.find((a) => a.id === i.agencyId)?.name ||
                        "No agency assigned"}
                    </small>
                  </div>
                  <div className="incident-state">
                    <Badge tone={i.status === "New" ? "warning" : "neutral"}>
                      {i.status}
                    </Badge>
                    <small>{formatTime(i.createdAt)}</small>
                  </div>
                </button>
              ))}
              {!visible.length && (
                <Empty
                  title="No matching incidents"
                  text="Try another filter or create a demo SOS from Citizen services."
                />
              )}
            </div>
          </Panel>
          <Panel title="Operational map" eyebrow="DEMO LOCATIONS">
            <MapView incidents={state.incidents} />
            <div className="readiness-note">
              <ShieldCheck size={18} />
              <p>
                Map locations are fictional operational fixtures. Agency
                suitability includes capability and availability.
              </p>
            </div>
          </Panel>
        </div>
      )}
      <dialog
        className="incident-dialog"
        ref={dialog}
        onClose={() => setSelected(null)}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">DEMO INCIDENT DETAIL</span>
            <h2>{incident?.id}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close incident"
            onClick={() => setSelected(null)}
          >
            <X size={21} />
          </button>
        </div>
        {incident && (
          <>
            <div className="incident-detail-top">
              <Badge tone={incident.priority}>{incident.priority}</Badge>
              <Badge>{incident.status}</Badge>
              <span>Version {incident.version}</span>
            </div>
            <h3>
              {incident.category} · {incident.people} people
            </h3>
            <p>{incident.description || "No additional details supplied."}</p>
            <div className="detail-location">
              <MapPin size={17} />
              {incident.landmark} ·{" "}
              {zones.find((z) => z.id === incident.zoneId)?.name}
            </div>
            <dl className="detail-list">
              <div>
                <dt>Lead agency</dt>
                <dd>
                  {state.agencies.find((a) => a.id === incident.agencyId)
                    ?.name || "Unassigned"}
                </dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd>
                  {state.resources.find((r) => r.id === incident.teamId)
                    ?.name || "Unassigned"}
                </dd>
              </div>
            </dl>
            {["New", "Acknowledged"].includes(incident.status) && (
              <div className="assignment-block">
                <h3>Assign a suitable team</h3>
                <label className="field">
                  Available team
                  <select
                    value={resource}
                    onChange={(e) => setResource(e.target.value)}
                  >
                    <option value="">Select a suitable team</option>
                    {teams.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.name} ·{" "}
                        {state.agencies.find((a) => a.id === t.agencyId)?.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!teams.length && (
                  <p className="form-error">
                    No suitable team is available. Request assistance from
                    Coordination.
                  </p>
                )}
                <button
                  className="button primary"
                  onClick={assign}
                  disabled={!resource}
                >
                  Assign team
                </button>
              </div>
            )}
            {transitions[incident.status][0] &&
              transitions[incident.status][0] !== "Assigned" && (
                <button className="button secondary" onClick={progress}>
                  {incident.status === "New"
                    ? "Acknowledge incident"
                    : `Mark ${transitions[incident.status][0].toLowerCase()}`}
                </button>
              )}
            <h3 className="section-subtitle">Response timeline</h3>
            <ol className="timeline">
              {incident.timeline.map((e, i) => (
                <li key={i}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{e.action}</strong>
                    <small>{formatTime(e.time)}</small>
                  </div>
                </li>
              ))}
            </ol>
            <h3 className="section-subtitle">Citizen communication</h3>
            <div className="message-list compact">
              {state.messages
                .filter((m) => m.incidentId === incident.id)
                .map((m) => (
                  <div className="message" key={m.id}>
                    <strong>{m.sender}</strong>
                    <p>{m.text}</p>
                  </div>
                ))}
            </div>
            <form
              className="message-compose"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                mutate(
                  (s) => ({
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        id: createId(),
                        incidentId: incident.id,
                        text: reply.trim(),
                        sender: "Agency",
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }),
                  `${incident.id}: demo agency message`,
                );
                setReply("");
                notify("Demo reply added");
              }}
            >
              <label className="field">
                Demo reply
                <textarea
                  rows={2}
                  value={reply}
                  maxLength={1000}
                  onChange={(e) => setReply(e.target.value)}
                  required
                />
              </label>
              <button className="button secondary">Send demo reply</button>
            </form>
          </>
        )}
      </dialog>
    </>
  );
}
export function Resources() {
  const { state, mutate, notify } = useDemo();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RESPONSE READINESS</span>
          <h1>Teams & resources</h1>
          <p>Availability changes are visible to the assignment workflow.</p>
        </div>
        <Badge tone="info">DEMO INVENTORY</Badge>
      </div>
      <Panel title="Resource register">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Agency</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Assignment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.resources.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.id}</small>
                  </td>
                  <td>
                    {state.agencies.find((a) => a.id === r.agencyId)?.name}
                  </td>
                  <td>{r.type}</td>
                  <td>{r.capacity} people</td>
                  <td>
                    <Badge
                      tone={
                        r.status === "Available"
                          ? "success"
                          : r.status === "Maintenance"
                            ? "warning"
                            : "info"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td>{r.incidentId || "—"}</td>
                  <td>
                    <button
                      className="text-button"
                      disabled={r.status === "Assigned"}
                      onClick={() => {
                        mutate(
                          (s) => ({
                            ...s,
                            resources: s.resources.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    status:
                                      x.status === "Available"
                                        ? "Maintenance"
                                        : "Available",
                                  }
                                : x,
                            ),
                          }),
                          `${r.name}: availability updated`,
                        );
                        notify("Demo resource availability updated");
                      }}
                    >
                      {r.status === "Maintenance"
                        ? "Mark available"
                        : "Set maintenance"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function Coordination() {
  const { state, mutate, notify } = useDemo();
  const [incidentId, setIncident] = useState(
    state.incidents.find((i) => !["Resolved", "Closed"].includes(i.status))
      ?.id || "",
  );
  const [agencyId, setAgency] = useState("A-02");
  const [note, setNote] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INTER-AGENCY COORDINATION</span>
          <h1>Assistance requests</h1>
          <p>
            Supporting agencies can accept a request without silently changing
            lead responsibility.
          </p>
        </div>
      </div>
      <div className="coordination-grid">
        <Panel title="Request assistance">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              mutate(
                (s) => ({
                  ...s,
                  coordination: [
                    {
                      id: createId(),
                      incidentId,
                      agencyId,
                      note: note.trim(),
                      state: "Requested",
                    },
                    ...s.coordination,
                  ],
                }),
                "Demo inter-agency assistance requested",
              );
              setNote("");
              notify("Demo assistance request created");
            }}
          >
            <label className="field">
              Incident
              <select
                value={incidentId}
                onChange={(e) => setIncident(e.target.value)}
              >
                {state.incidents
                  .filter((i) => !["Resolved", "Closed"].includes(i.status))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id} · {i.category}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Supporting agency
              <select
                value={agencyId}
                onChange={(e) => setAgency(e.target.value)}
              >
                {state.agencies
                  .filter((a) => a.verified)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              What support is needed?
              <textarea
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={4}
              />
            </label>
            <button className="button primary" disabled={!incidentId}>
              Request demo assistance
            </button>
          </form>
        </Panel>
        <Panel title="Coordination activity">
          {!state.coordination.length && (
            <Empty
              title="No assistance requests"
              text="Create a demo request to demonstrate coordination between verified agencies."
            />
          )}
          {state.coordination.map((c) => (
            <article className="coordination-item" key={c.id}>
              <div>
                <strong>{c.incidentId}</strong>
                <Badge tone={c.state === "Accepted" ? "success" : "warning"}>
                  {c.state}
                </Badge>
              </div>
              <h3>{state.agencies.find((a) => a.id === c.agencyId)?.name}</h3>
              <p>{c.note}</p>
              {c.state === "Requested" && (
                <button
                  className="button secondary"
                  onClick={() => {
                    mutate(
                      (s) => ({
                        ...s,
                        coordination: s.coordination.map((x) =>
                          x.id === c.id ? { ...x, state: "Accepted" } : x,
                        ),
                      }),
                      "Demo assistance accepted",
                    );
                    notify("Supporting agency accepted the demo request");
                  }}
                >
                  <CheckCircle2 size={15} />
                  Accept demo assistance
                </button>
              )}
            </article>
          ))}
        </Panel>
      </div>
    </>
  );
}
