export type Hazard = "flood" | "forest-fire" | "drought" | "heat-wave";
export type IncidentStatus =
  | "New"
  | "Acknowledged"
  | "Assigned"
  | "En route"
  | "On scene"
  | "Resolved"
  | "Closed";
export type Priority = "Critical" | "High" | "Moderate";
export interface Zone {
  id: string;
  name: string;
  district: string;
  center: [number, number];
  risk: number | null;
  hazard: Hazard;
  sensors: number;
}
export interface Agency {
  id: string;
  name: string;
  verified: boolean;
  capabilities: string[];
}
export interface Resource {
  id: string;
  name: string;
  agencyId: string;
  type: string;
  capacity: number;
  status: "Available" | "Assigned" | "Maintenance";
  incidentId?: string;
}
export interface Incident {
  id: string;
  category: string;
  people: number;
  description: string;
  zoneId: string;
  landmark: string;
  status: IncidentStatus;
  priority: Priority;
  ownerId: string;
  agencyId: string | null;
  teamId: string | null;
  createdAt: string;
  version: number;
  timeline: { time: string; action: string }[];
}
export interface Warning {
  id: string;
  zoneId: string;
  hazard: Hazard;
  title: string;
  instructions: string;
  severity: "High" | "Critical" | "Moderate";
  status: "Draft" | "Published" | "Retracted";
  createdAt: string;
  expiresAt: string;
}
export interface Message {
  id: string;
  incidentId: string;
  text: string;
  sender: "Citizen" | "Agency";
  createdAt: string;
}
export interface Assessment {
  id: string;
  zoneId: string;
  finding: string;
  needs: string;
  state: "Draft" | "Reviewed";
}
export interface Coordination {
  id: string;
  incidentId: string;
  agencyId: string;
  note: string;
  state: "Requested" | "Accepted";
}
export type Scenario = "normal" | "rising" | "spike" | "stale";
export interface DemoState {
  incidents: Incident[];
  resources: Resource[];
  warnings: Warning[];
  messages: Message[];
  assessments: Assessment[];
  coordination: Coordination[];
  agencies: Agency[];
  scenario: Scenario;
  sample: number;
  rules: { persistence: number; minimumSupport: number; highThreshold: number };
  audit: { id: string; time: string; action: string }[];
}
export const hazardNames: Record<Hazard, string> = {
  flood: "Flood",
  "forest-fire": "Forest fire",
  drought: "Drought",
  "heat-wave": "Heat wave",
};
export const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  New: ["Acknowledged"],
  Acknowledged: ["Assigned"],
  Assigned: ["En route"],
  "En route": ["On scene"],
  "On scene": ["Resolved"],
  Resolved: ["Closed"],
  Closed: [],
};
export const severity = (risk: number | null) =>
  risk === null
    ? "Unknown"
    : risk >= 85
      ? "Critical"
      : risk >= 70
        ? "High"
        : risk >= 50
          ? "Moderate"
          : risk >= 25
            ? "Low"
            : "Safe";
