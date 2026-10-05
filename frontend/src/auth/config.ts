export const DEMO_PASSWORD =
  import.meta.env?.VITE_RESQGRID_DEMO_PASSWORD || "RESQGRID2026";
export const SESSION_KEY = "resqgrid-v3-demo-session-v1";
export type DemoRole = "citizen" | "agency" | "admin";
export const roles = [
  {
    id: "citizen",
    label: "Citizen Login",
    name: "Citizen",
    home: "/me",
    description: "Local warnings, assistance and request tracking",
  },
  {
    id: "agency",
    label: "Agency Login",
    name: "Agency operator",
    home: "/operations",
    description: "Incidents, rescue teams and field coordination",
  },
  {
    id: "admin",
    label: "Super Admin Login",
    name: "Super Admin",
    home: "/admin",
    description: "Governance, intelligence and decision review",
  },
] as const;
export function allowed(role: DemoRole, path: string) {
  if (path.startsWith("/admin") || path.startsWith("/intelligence"))
    return role === "admin";
  if (path.startsWith("/operations"))
    return role === "agency" || role === "admin";
  if (path.startsWith("/me") || path === "/sos")
    return role === "citizen" || role === "admin";
  return true;
}
