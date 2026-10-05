import {
  transitions,
  type DemoState,
  type IncidentStatus,
  type Scenario,
} from "./types";
export function scenarioEvidence(
  scenario: Scenario,
  sample: number,
  rules: DemoState["rules"],
) {
  const stale = scenario === "stale";
  const spike = scenario === "spike";
  const normal = scenario === "normal";
  const persistence = normal ? 0 : spike ? 1 : sample;
  const support = normal || spike ? 1 : 2;
  const quality = stale ? "SUSPECT" : "GOOD";
  const score = stale
    ? null
    : normal
      ? 22
      : spike
        ? 78
        : Math.min(88, 68 + sample * 3);
  const gate =
    !stale &&
    persistence >= rules.persistence &&
    support >= rules.minimumSupport &&
    score !== null &&
    score >= rules.highThreshold;
  return {
    score,
    quality,
    persistence,
    support,
    gate,
    water: normal
      ? 1.48
      : spike
        ? 2.62
        : stale
          ? null
          : Number((2.06 + Math.min(sample, 12) * 0.055).toFixed(2)),
    rain: normal ? 4 : spike ? 8 : stale ? null : 44 + Math.min(sample, 10),
    reason: stale
      ? "Observations are stale. Current risk cannot be assessed."
      : spike
        ? "Single-sample spike rejected by persistence and supporting-source gates."
        : normal
          ? "Scenario values below the configured high-risk threshold."
          : gate
            ? "Persistent elevated values with two supporting simulated sources."
            : "Waiting for the configured evidence window.",
  };
}
export function transitionIncident(
  state: DemoState,
  id: string,
  next: IncidentStatus,
): DemoState {
  const incident = state.incidents.find((i) => i.id === id);
  if (!incident) throw new Error("Incident not found");
  if (!transitions[incident.status].includes(next))
    throw new Error("Invalid incident transition");
  if (next === "Assigned" && !incident.teamId)
    throw new Error("Assign a team before progressing");
  const time = new Date().toISOString();
  return {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id !== id
        ? i
        : {
            ...i,
            status: next,
            version: i.version + 1,
            timeline: [
              ...i.timeline,
              { time, action: `Status changed to ${next}` },
            ],
          },
    ),
    resources:
      next === "Resolved"
        ? state.resources.map((r) =>
            r.incidentId === id
              ? { ...r, status: "Available", incidentId: undefined }
              : r,
          )
        : state.resources,
  };
}
export function assignTeam(
  state: DemoState,
  id: string,
  resourceId: string,
): DemoState {
  const incident = state.incidents.find((i) => i.id === id);
  const resource = state.resources.find((r) => r.id === resourceId);
  if (!incident || !resource) throw new Error("Incident or team not found");
  if (!["New", "Acknowledged"].includes(incident.status))
    throw new Error("Incident already assigned or closed");
  if (resource.status !== "Available" || resource.type !== "Rescue team")
    throw new Error("Team is not available");
  const agency = state.agencies.find((a) => a.id === resource.agencyId);
  if (!agency?.verified || !agency.capabilities.includes(incident.category))
    throw new Error("Agency is not verified or suitable for this category");
  const time = new Date().toISOString();
  return {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id === id
        ? {
            ...i,
            status: "Assigned",
            agencyId: resource.agencyId,
            teamId: resourceId,
            version: i.version + 1,
            timeline: [
              ...i.timeline,
              { time, action: `${resource.name} assigned` },
            ],
          }
        : i,
    ),
    resources: state.resources.map((r) =>
      r.id === resourceId ? { ...r, status: "Assigned", incidentId: id } : r,
    ),
  };
}
