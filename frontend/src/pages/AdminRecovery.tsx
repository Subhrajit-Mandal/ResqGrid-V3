import { createId } from "../shared/ids";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Settings2,
  Database,
  Radio,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Plus,
  Info,
} from "lucide-react";
import { useDemo } from "../domain/store";
import { zones } from "../domain/fixtures";
import { Panel, Badge, Empty, formatTime } from "../shared/ui";
import { MapView } from "../shared/MapView";
export function Administration({ auditOnly = false }: { auditOnly?: boolean }) {
  const { pathname } = useLocation();
  const { state, mutate, notify } = useDemo();
  const [rules, setRules] = useState(state.rules);
  const [reason, setReason] = useState("");
  const audit = auditOnly || pathname.endsWith("/audit");
  const rulesOnly = pathname.endsWith("/rules");
  const agenciesOnly = pathname.endsWith("/agencies");
  function saveRules(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    if (
      !Number.isInteger(rules.persistence) ||
      rules.persistence < 2 ||
      rules.persistence > 30 ||
      !Number.isInteger(rules.minimumSupport) ||
      rules.minimumSupport < 2 ||
      rules.minimumSupport > 10 ||
      rules.highThreshold < 50 ||
      rules.highThreshold > 95
    ) {
      notify(
        "Rules must retain at least two samples and two supporting sources.",
      );
      return;
    }
    mutate(
      (s) => ({ ...s, rules }),
      `Demo decision rules changed: ${reason.trim()}`,
    );
    setReason("");
    notify("Demo rules updated; changes recorded in audit");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PROTECTED GOVERNANCE · DEMO ACCESS</span>
          <h1>
            {audit
              ? "Audit trail"
              : rulesOnly
                ? "Decision rules"
                : agenciesOnly
                  ? "Agency verification"
                  : "Administration"}
          </h1>
          <p>
            {audit
              ? "Consequential demo actions remain traceable."
              : "Verification, controlled configuration and integration status."}
          </p>
        </div>
        <Badge tone="info">No live administrative access</Badge>
      </div>
      {audit ? (
        <Panel title="Demo audit events">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                {state.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{formatTime(a.time)}</td>
                    <td>{a.action}</td>
                    <td>Demo operator</td>
                    <td>Browser-local simulation</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <>
          {!rulesOnly && (
            <Panel title="Agency register" eyebrow="VERIFICATION">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Agency</th>
                      <th>Capabilities</th>
                      <th>Verification</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.agencies.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          <small>{a.id} · fictional fixture</small>
                        </td>
                        <td>{a.capabilities.join(", ")}</td>
                        <td>
                          <Badge tone={a.verified ? "success" : "warning"}>
                            {a.verified
                              ? "Verified demo agency"
                              : "Pending demo review"}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${a.verified ? "Suspend" : "Verify"} this fictional demo agency?`,
                                )
                              ) {
                                mutate(
                                  (s) => ({
                                    ...s,
                                    agencies: s.agencies.map((x) =>
                                      x.id === a.id
                                        ? { ...x, verified: !x.verified }
                                        : x,
                                    ),
                                  }),
                                  `${a.name}: demo verification ${a.verified ? "suspended" : "approved"}`,
                                );
                                notify("Demo verification status updated");
                              }
                            }}
                          >
                            {a.verified
                              ? "Suspend demo access"
                              : "Approve demo agency"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          {!agenciesOnly && (
            <div className="admin-grid">
              <Panel
                title="Scenario decision rules"
                eyebrow="CONTROLLED CONFIGURATION"
              >
                <form onSubmit={saveRules}>
                  <label className="field">
                    Persistent samples required
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={rules.persistence}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          persistence: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Supporting sources required
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={rules.minimumSupport}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          minimumSupport: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    High scenario threshold
                    <input
                      type="number"
                      min={50}
                      max={95}
                      value={rules.highThreshold}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          highThreshold: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Reason for change
                    <textarea
                      maxLength={300}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      rows={2}
                    />
                  </label>
                  <button className="button primary">Save demo rules</button>
                  <p className="muted">
                    These rules demonstrate validation. They are not validated
                    disaster thresholds.
                  </p>
                </form>
              </Panel>
              <Panel
                title="Live integration status"
                eyebrow="DEPLOYMENT READINESS"
              >
                <div className="integration-status">
                  {[
                    ["Supabase authentication", "Not configured", ShieldCheck],
                    ["PostgreSQL / PostGIS", "Not connected", Database],
                    ["MongoDB telemetry", "Not connected", Database],
                    ["MQTT hardware", "Not connected", Radio],
                    ["Trained AI artifact", "Not available", Settings2],
                  ].map(([label, status, Icon]) => {
                    const Component = Icon as typeof Database;
                    return (
                      <div key={String(label)}>
                        <Component size={19} />
                        <span>{String(label)}</span>
                        <Badge>{String(status)}</Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="notice-box">
                  <Info size={18} />
                  <p>
                    The source includes configuration, migrations, FastAPI
                    services and simulator entry points. Live services require
                    credentials and integration verification.
                  </p>
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}
export function Recovery() {
  const { state, mutate, notify } = useDemo();
  const [zoneId, setZone] = useState("Z-01");
  const [finding, setFinding] = useState("");
  const [needs, setNeeds] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">POST-DISASTER ASSESSMENT</span>
          <h1>Recovery priorities</h1>
          <p>Reviewed findings, affected areas and relief requirements.</p>
        </div>
        <Badge tone="info">Dataset / simulation view</Badge>
      </div>
      <div className="recovery-grid">
        <Panel title="Affected-area context">
          <MapView selected={zoneId} onSelect={setZone} />
          <div className="map-caption">
            Illustrative boundaries · no satellite damage model connected
          </div>
        </Panel>
        <Panel title="Create demo assessment">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!finding.trim() || !needs.trim()) return;
              mutate(
                (s) => ({
                  ...s,
                  assessments: [
                    {
                      id: `AS-${createId().slice(0, 6)}`,
                      zoneId,
                      finding: finding.trim(),
                      needs: needs.trim(),
                      state: "Draft",
                    },
                    ...s.assessments,
                  ],
                }),
                "Demo recovery assessment created",
              );
              setFinding("");
              setNeeds("");
              notify("Demo assessment saved for review");
            }}
          >
            <label className="field">
              Affected zone
              <select value={zoneId} onChange={(e) => setZone(e.target.value)}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Observed damage / finding
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={finding}
                onChange={(e) => setFinding(e.target.value)}
                placeholder="Use fictional assessment details"
              />
            </label>
            <label className="field">
              Relief / recovery needs
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={needs}
                onChange={(e) => setNeeds(e.target.value)}
              />
            </label>
            <button className="button primary">Save demo assessment</button>
          </form>
        </Panel>
      </div>
      <Panel title="Assessment register" eyebrow="OPERATOR REVIEW">
        <div className="assessment-list">
          {state.assessments.map((a) => (
            <article key={a.id}>
              <div>
                <span className="assessment-id">
                  <ClipboardList size={19} />
                  {a.id}
                </span>
                <Badge tone={a.state === "Reviewed" ? "success" : "warning"}>
                  {a.state}
                </Badge>
              </div>
              <h3>{zones.find((z) => z.id === a.zoneId)?.name}</h3>
              <p>{a.finding}</p>
              <div className="assessment-needs">
                <strong>Recovery needs</strong>
                <p>{a.needs}</p>
              </div>
              <small>
                Source: simulated agency report · no automated damage detection
              </small>
              {a.state === "Draft" && (
                <button
                  className="button secondary"
                  onClick={() => {
                    mutate(
                      (s) => ({
                        ...s,
                        assessments: s.assessments.map((x) =>
                          x.id === a.id ? { ...x, state: "Reviewed" } : x,
                        ),
                      }),
                      "Demo assessment reviewed",
                    );
                    notify("Demo assessment reviewed");
                  }}
                >
                  <CheckCircle2 size={15} />
                  Mark reviewed
                </button>
              )}
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}
