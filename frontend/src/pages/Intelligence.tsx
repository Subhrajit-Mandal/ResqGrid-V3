import { createId } from "../shared/ids";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Radio,
  ShieldCheck,
  MapPin,
  Play,
  Pause,
  CheckCircle2,
  Clock3,
  Download,
  SlidersHorizontal,
  Database,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDemo } from "../domain/store";
import { zones } from "../domain/fixtures";
import {
  hazardNames,
  severity,
  type Hazard,
  type Scenario,
} from "../domain/types";
import { scenarioEvidence } from "../domain/engine";
import { Badge, Panel, Stat, Quality, formatTime, Empty } from "../shared/ui";
import { MapView } from "../shared/MapView";
export function Intelligence({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { state, mutate, notify } = useDemo();
  const { pathname } = useLocation();
  const [running, setRunning] = useState(false);
  const [metric, setMetric] = useState<"water" | "rain">("water");
  const [filter, setFilter] = useState("all");
  const hazard = pathname.split("/hazards/")[1] as Hazard | undefined;
  const warningsPage = pathname.endsWith("/warnings");
  const zonesPage = pathname.endsWith("/zones");
  const zone = zones.find((z) => z.id === selected)!;
  const evidence = scenarioEvidence(state.scenario, state.sample, state.rules);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(
      () => mutate((s) => ({ ...s, sample: s.sample + 1 })),
      3000,
    );
    return () => clearInterval(t);
  }, [running, mutate]);
  const data = Array.from({ length: 12 }, (_, i) => ({
    time: `${String(9 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}`,
    water:
      state.scenario === "stale"
        ? null
        : state.scenario === "normal"
          ? 1.4 + i * 0.01
          : state.scenario === "spike"
            ? i === 10
              ? 2.75
              : 1.48
            : 1.73 + i * 0.06 + Math.min(state.sample, 12) * 0.018,
    rain:
      state.scenario === "stale"
        ? null
        : state.scenario === "normal"
          ? 2 + (i % 3)
          : state.scenario === "spike"
            ? 4 + (i % 3)
            : 14 + i * 3,
  }));
  function draftWarning() {
    if (!evidence.gate) {
      notify("Warning candidate blocked: evidence requirements are not met.");
      return;
    }
    if (
      state.warnings.some((w) => w.zoneId === selected && w.status === "Draft")
    ) {
      notify("A draft already exists for this zone. Review it in Warnings.");
      return;
    }
    mutate(
      (s) => ({
        ...s,
        warnings: [
          {
            id: `W-${createId().slice(0, 6)}`,
            zoneId: selected,
            hazard: "flood",
            title: `Elevated water-level scenario in ${zone.name.toLowerCase()}`,
            instructions:
              "Simulated preparedness warning. Review affected locations and pre-position appropriate resources. This notice has no live emergency authority.",
            severity: "High",
            status: "Draft",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          ...s.warnings,
        ],
      }),
      "Warning candidate created from simulated evidence",
    );
    notify("Demo warning candidate created. Publisher review is required.");
  }
  function publish(id: string) {
    if (
      !window.confirm(
        "Publish this simulated warning to the demo citizen workspace?",
      )
    )
      return;
    mutate(
      (s) => ({
        ...s,
        warnings: s.warnings.map((w) =>
          w.id === id ? { ...w, status: "Published" } : w,
        ),
      }),
      "Demo warning approved and published",
    );
    notify("Simulated warning published to citizen view");
  }
  function exportEvidence() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            source: "simulated",
            zone: zone.name,
            scenario: state.scenario,
            evidence,
            model: null,
            notice:
              "No trained model or measured hazard probability is available.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resqgrid-demo-evidence.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EARLY WARNING & DISASTER INTELLIGENCE</div>
          <h1>
            {warningsPage
              ? "Warning review"
              : zonesPage
                ? "Risk zones"
                : hazard
                  ? `${hazardNames[hazard] || "Hazard"} intelligence`
                  : "Situation overview"}
          </h1>
          <p>
            Environmental evidence, geographic context and response readiness.
          </p>
        </div>
        <div className="heading-controls">
          <label className="select-with-icon">
            <MapPin size={15} />
            <select
              aria-label="Select zone"
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
            >
              {zones.map((z) => (
                <option value={z.id} key={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" onClick={exportEvidence}>
            <Download size={16} />
            Export evidence
          </button>
        </div>
      </div>
      {hazard && hazard !== "flood" && (
        <div className="notice-box">
          <Info size={20} />
          <div>
            <strong>
              No active {hazardNames[hazard]?.toLowerCase()} model
            </strong>
            <p>
              This module has a shared interface. Validated datasets, trained
              models and suitable live features have not been connected. The map
              below shows the general demo situation.
            </p>
          </div>
        </div>
      )}
      <section
        className="command-brief intelligence-brief"
        aria-label="Evidence readiness"
      >
        <div className="brief-label">
          <Activity size={20} />
          <span>COMMAND CONTEXT</span>
        </div>
        <div>
          <strong>{zone.name}</strong>
          <span>
            {selected === "Z-01"
              ? "Synthetic flood evidence · human review required"
              : "Illustrative zone preview · no connected model"}
          </span>
        </div>
        <div className="brief-evidence">
          <span>
            Data quality
            <Quality
              quality={selected === "Z-04" ? "SUSPECT" : evidence.quality}
            />
          </span>
          <span>
            Decision readiness
            <Badge
              tone={
                selected === "Z-01" && evidence.gate ? "success" : "neutral"
              }
            >
              {selected === "Z-01" && evidence.gate
                ? "Review candidate"
                : "Monitor / preview"}
            </Badge>
          </span>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          label="Active demo hazards"
          value="01"
          detail="Flood scenario under observation"
          icon={Activity}
        />
        <Stat
          label="Elevated-risk zones"
          value="02"
          detail="Illustrative scenario values"
          icon={AlertTriangle}
        />
        <Stat
          label="Demo sensors online"
          value={state.scenario === "stale" ? "06 / 09" : "09 / 09"}
          detail={
            state.scenario === "stale"
              ? "Three stale observations"
              : "Simulated sensor network"
          }
          icon={Radio}
        />
        <Stat
          label="Published demo warnings"
          value={String(
            state.warnings.filter((w) => w.status === "Published").length,
          ).padStart(2, "0")}
          detail="Human-reviewed demo notices"
          icon={ShieldCheck}
        />
      </div>
      {warningsPage ? (
        <Panel
          title="Warning lifecycle"
          eyebrow="PUBLISHER REVIEW"
          action={<Badge tone="info">Simulated publisher</Badge>}
        >
          <div className="warning-review-list">
            {state.warnings.map((w) => (
              <article className="warning-review" key={w.id}>
                <div>
                  <Badge tone={w.severity}>{w.severity}</Badge>
                  <Badge
                    tone={w.status === "Published" ? "success" : "neutral"}
                  >
                    {w.status}
                  </Badge>
                  <h3>{w.title}</h3>
                  <p>{w.instructions}</p>
                  <small>
                    {zones.find((z) => z.id === w.zoneId)?.name} ·{" "}
                    {formatTime(w.createdAt)} · simulated
                  </small>
                </div>
                <div className="warning-actions">
                  {w.status === "Draft" && (
                    <button
                      className="button primary"
                      onClick={() => publish(w.id)}
                    >
                      Approve & publish
                    </button>
                  )}
                  {w.status === "Published" && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        if (window.confirm("Retract this demo warning?")) {
                          mutate(
                            (s) => ({
                              ...s,
                              warnings: s.warnings.map((x) =>
                                x.id === w.id
                                  ? { ...x, status: "Retracted" }
                                  : x,
                              ),
                            }),
                            "Demo warning retracted",
                          );
                          notify("Demo warning retracted");
                        }
                      }}
                    >
                      Retract warning
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : (
        <>
          <div className="intelligence-grid">
            <Panel
              className="map-panel"
              title="Regional risk map"
              eyebrow="GEOGRAPHIC CONTEXT"
              action={<Badge tone="neutral">DEMO ZONES</Badge>}
            >
              <MapView
                selected={selected}
                onSelect={onSelect}
                incidents={state.incidents}
              />
              <div className="map-caption">
                <span>
                  <MapPin size={14} />
                  Kamrup region, Assam
                </span>
                <span>Boundaries and risk values are illustrative</span>
              </div>
            </Panel>
            <Panel
              className="decision-panel"
              title="Decision support"
              eyebrow="SELECTED ZONE"
            >
              <div className="decision-zone">
                <div>
                  <span>{zone.id}</span>
                  <h3>{zone.name}</h3>
                </div>
                <Badge
                  tone={
                    selected === "Z-01"
                      ? severity(evidence.score)
                      : severity(zone.risk)
                  }
                >
                  {selected === "Z-01"
                    ? severity(evidence.score)
                    : severity(zone.risk)}
                </Badge>
              </div>
              <div className="risk-number">
                <span>
                  {selected === "Z-01"
                    ? (evidence.score ?? "—")
                    : (zone.risk ?? "—")}
                </span>
                <div>
                  <strong>Scenario score</strong>
                  <small>Illustrative · not an ML prediction</small>
                </div>
              </div>
              <div className="risk-scale">
                <i
                  style={{
                    left: `${selected === "Z-01" ? (evidence.score ?? 0) : (zone.risk ?? 0)}%`,
                  }}
                />
              </div>
              <div className="decision-metrics">
                <div>
                  <span>Hazard probability</span>
                  <strong>Not available</strong>
                </div>
                <div>
                  <span>Trained model</span>
                  <strong>Not connected</strong>
                </div>
                <div>
                  <span>Evidence quality</span>
                  <Quality
                    quality={selected === "Z-04" ? "SUSPECT" : evidence.quality}
                  />
                </div>
                <div>
                  <span>Decision</span>
                  <strong>
                    {selected !== "Z-01"
                      ? "Zone preview"
                      : evidence.gate
                        ? "Review candidate"
                        : evidence.score === null
                          ? "Insufficient data"
                          : "Monitor"}
                  </strong>
                </div>
              </div>
              <div className="recommendation">
                <ShieldCheck size={17} />
                <div>
                  <span>RECOMMENDED NEXT STEP</span>
                  <p>
                    {selected !== "Z-01"
                      ? "Select the river corridor to inspect and run the flood demonstration."
                      : evidence.gate
                        ? "Review supporting evidence and prepare appropriate demo response resources."
                        : evidence.reason}
                  </p>
                </div>
              </div>
              <button
                className="button primary full"
                disabled={selected !== "Z-01" || !evidence.gate}
                onClick={draftWarning}
              >
                Create warning candidate
              </button>
              <Link className="text-link" to="/intelligence/models">
                Inspect model and evidence status
              </Link>
            </Panel>
          </div>
          <div className="lower-grid">
            <Panel
              title="Environmental observations"
              eyebrow="SIMULATED TIME SERIES"
              action={
                <div className="segmented">
                  <button
                    className={metric === "water" ? "active" : ""}
                    onClick={() => setMetric("water")}
                  >
                    Water level
                  </button>
                  <button
                    className={metric === "rain" ? "active" : ""}
                    onClick={() => setMetric("rain")}
                  >
                    Rainfall
                  </button>
                </div>
              }
            >
              <div className="chart-summary">
                <strong>
                  {metric === "water"
                    ? evidence.water === null
                      ? "—"
                      : `${evidence.water} m`
                    : evidence.rain === null
                      ? "—"
                      : `${evidence.rain} mm`}
                </strong>
                <span>
                  {state.scenario === "stale"
                    ? "Stale · excluded from current assessment"
                    : "Scenario observations · illustrative 2-hour window"}
                </span>
                <Badge tone={state.scenario === "stale" ? "warning" : "info"}>
                  {state.scenario === "stale" ? "Stale" : "Simulated"}
                </Badge>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--action)"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--action)"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      vertical={false}
                      strokeDasharray="3 4"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      domain={metric === "water" ? [1, 3] : [0, 60]}
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--text)",
                      }}
                      formatter={(v: number) => [
                        `${v.toFixed(2)} ${metric === "water" ? "m" : "mm"}`,
                        "Simulated reading",
                      ]}
                    />
                    <Area
                      isAnimationActive={false}
                      type="linear"
                      dataKey={metric}
                      stroke="var(--action)"
                      strokeWidth={2}
                      fill="url(#chartFill)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Evidence safeguards" eyebrow="FALSE-POSITIVE CONTROL">
              <div className="safeguards">
                {[
                  [
                    evidence.quality === "GOOD",
                    "Sensor validation",
                    evidence.quality === "GOOD"
                      ? "Range and freshness checks pass"
                      : "Stale input cannot support a current decision",
                  ],
                  [
                    evidence.persistence >= state.rules.persistence,
                    "Temporal persistence",
                    `${evidence.persistence} samples / ${state.rules.persistence} required`,
                  ],
                  [
                    evidence.support >= state.rules.minimumSupport,
                    "Supporting sources",
                    `${evidence.support} simulated sources / ${state.rules.minimumSupport} required`,
                  ],
                  [
                    false,
                    "ML confidence gate",
                    "No trained model: no ML confidence asserted",
                  ],
                ].map(([ok, label, detail]) => (
                  <div key={String(label)}>
                    <span className={ok ? "check pass" : "check pending"}>
                      {ok ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="safeguard-note">
                Scenario rules demonstrate validation. Operational warnings
                require validated models and authorized review.
              </div>
            </Panel>
          </div>
        </>
      )}
      <Panel
        title={zonesPage ? "Zone register" : "Zones requiring attention"}
        eyebrow="MULTI-HAZARD COVERAGE"
        action={
          <label className="inline-filter">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Filter zones by risk"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All zones</option>
              <option value="elevated">Elevated risk</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Hazard</th>
                <th>Scenario risk</th>
                <th>Sensor nodes</th>
                <th>Evidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {zones
                .filter(
                  (z) =>
                    filter === "all" ||
                    (filter === "unknown" && z.risk === null) ||
                    (filter === "elevated" && z.risk !== null && z.risk >= 50),
                )
                .map((z) => (
                  <tr key={z.id}>
                    <td>
                      <strong>{z.name}</strong>
                      <small>
                        {z.id} · {z.district}
                      </small>
                    </td>
                    <td>{hazardNames[z.hazard]}</td>
                    <td>
                      <Badge tone={severity(z.risk)}>
                        {severity(z.risk)} {z.risk !== null && `· ${z.risk}`}
                      </Badge>
                    </td>
                    <td>
                      {z.sensors ? `${z.sensors} simulated` : "No active nodes"}
                    </td>
                    <td>
                      {z.risk === null
                        ? "Insufficient data"
                        : "Demo observations"}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => {
                          onSelect(z.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Inspect zone
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="simulation-console">
        <div>
          <Radio size={19} />
          <div>
            <strong>Scenario controls</strong>
            <small>Runs locally. Does not send hardware measurements.</small>
          </div>
        </div>
        <select
          aria-label="Select simulated scenario"
          value={state.scenario}
          onChange={(e) => {
            setRunning(false);
            mutate(
              (s) => ({
                ...s,
                scenario: e.target.value as Scenario,
                sample: 0,
              }),
              "Demo scenario changed",
            );
          }}
        >
          <option value="normal">Normal conditions</option>
          <option value="rising">Rising water</option>
          <option value="spike">Single-sample spike</option>
          <option value="stale">Stale observations</option>
        </select>
        <button
          className="button secondary"
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}{" "}
          {running ? "Pause scenario" : "Run scenario"}
        </button>
        <button
          className="text-button"
          onClick={() => mutate((s) => ({ ...s, sample: s.sample + 1 }))}
        >
          Advance sample
        </button>
        <span className="sample-count">Sample {state.sample}</span>
      </div>
    </>
  );
}
export function Devices() {
  const { state } = useDemo();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SENSOR NETWORK</div>
          <h1>Device health</h1>
          <p>Simulated node inventory and observation quality.</p>
        </div>
        <Badge tone="info">No physical nodes connected</Badge>
      </div>
      <Panel title="Environmental nodes">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Node</th>
                <th>Zone</th>
                <th>Channels</th>
                <th>Quality</th>
                <th>Power</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {zones.flatMap((z) =>
                Array.from({ length: z.sensors }, (_, i) => (
                  <tr key={`${z.id}-${i}`}>
                    <td>
                      <strong>
                        NODE-{z.id}-{String(i + 1).padStart(2, "0")}
                      </strong>
                      <small>Firmware: simulator-v1</small>
                    </td>
                    <td>{z.name}</td>
                    <td>
                      {i % 2
                        ? "Temperature · humidity"
                        : "Water level · rainfall"}
                    </td>
                    <td>
                      <Quality
                        quality={
                          state.scenario === "stale" && z.id === "Z-01"
                            ? "SUSPECT"
                            : "GOOD"
                        }
                      />
                    </td>
                    <td>
                      {89 - i * 7}% <small>Illustrative battery</small>
                    </td>
                    <td>
                      <Badge tone="info">Simulator</Badge>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function ModelStatus() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MODEL GOVERNANCE</div>
          <h1>Models & evidence</h1>
          <p>
            Activation requires a reviewed dataset, measured evaluation and
            feature parity.
          </p>
        </div>
      </div>
      <div className="model-grid">
        {Object.entries(hazardNames).map(([id, name]) => (
          <Panel key={id} title={name}>
            <div className="model-status">
              <Database size={27} />
              <Badge>No trained artifact</Badge>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Prediction probability</dt>
                <dd>Unavailable</dd>
              </div>
              <div>
                <dt>Measured performance</dt>
                <dd>Not evaluated</dd>
              </div>
              <div>
                <dt>Model activation</dt>
                <dd>Blocked pending validation</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  {id === "flood"
                    ? "Scenario rules only"
                    : "No active inference"}
                </dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
      <div className="notice-box">
        <ShieldCheck size={22} />
        <div>
          <strong>Honest model status</strong>
          <p>
            The demo does not invent model accuracy, confidence or trained
            XGBoost versions. Offline training and evaluation are part of the V3
            source package and require an appropriate dataset.
          </p>
        </div>
      </div>
    </>
  );
}
