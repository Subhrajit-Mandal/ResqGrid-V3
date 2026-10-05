import { flushSync } from "react-dom";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  Link,
  NavLink,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Map,
  Radio,
  Thermometer,
  Flame,
  Waves,
  Sun,
  Leaf,
  ShieldCheck,
  Users,
  Boxes,
  LifeBuoy,
  ClipboardList,
  Settings2,
  Bell,
  Menu,
  X,
  ChevronDown,
  MessageSquare,
  History,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { useDemo } from "./domain/store";
import { zones } from "./domain/fixtures";
const Intelligence = lazy(() =>
  import("./pages/Intelligence").then((m) => ({ default: m.Intelligence })),
);
const Devices = lazy(() =>
  import("./pages/Intelligence").then((m) => ({ default: m.Devices })),
);
const ModelStatus = lazy(() =>
  import("./pages/Intelligence").then((m) => ({ default: m.ModelStatus })),
);
import { Citizen, Sos, MyRequests, Shelters, Messages } from "./pages/Citizen";
const Operations = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.Operations })),
);
const Resources = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.Resources })),
);
const Coordination = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.Coordination })),
);
const Administration = lazy(() =>
  import("./pages/AdminRecovery").then((m) => ({ default: m.Administration })),
);
const Recovery = lazy(() =>
  import("./pages/AdminRecovery").then((m) => ({ default: m.Recovery })),
);
import { Badge, formatTime } from "./shared/ui";
import { useWebTools } from "./shared/webmcp";
import { DemoAuthProvider, RoleGuard, useDemoAuth } from "./auth/DemoAuth";
import { LoginPage } from "./auth/Login";
import { Landing } from "./pages/Landing";
import { roles } from "./auth/config";
const intelLinks = [
  ["/intelligence", "Situation overview", LayoutDashboard],
  ["/intelligence/zones", "Risk zones", Map],
  ["/intelligence/devices", "Sensor network", Radio],
  ["/intelligence/warnings", "Warnings", Bell],
  ["/intelligence/models", "Models & evidence", Activity],
  ["/intelligence/history", "Event history", History],
] as const;
const opsLinks = [
  ["/operations", "Operations overview", LayoutDashboard],
  ["/operations/incidents", "Incident queue", ClipboardList],
  ["/operations/map", "Operational map", Map],
  ["/operations/resources", "Teams & resources", Boxes],
  ["/operations/coordination", "Coordination", Users],
  ["/operations/shelters", "Shelters", Building2],
  ["/operations/recovery", "Recovery", LifeBuoy],
] as const;
export function App() {
  return (
    <DemoAuthProvider>
      <AppShell />
    </DemoAuthProvider>
  );
}
function AppShell() {
  useWebTools();
  const { session, logout } = useDemoAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const staff =
    pathname.startsWith("/intelligence") ||
    pathname.startsWith("/operations") ||
    pathname.startsWith("/admin");
  const ops = pathname.startsWith("/operations");
  const admin = pathname.startsWith("/admin");
  const accountRef = useRef<HTMLDetailsElement>(null);
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [zone, setZone] = useState("Z-01");
  const { state, reset, notify } = useDemo();
  useEffect(() => {
    setMobile(false);
    setNotifications(false);
    if (accountRef.current) accountRef.current.open = false;
    window.scrollTo(0, 0);
    document.title = `${pathname === "/" ? "RESQGRID India" : ops ? "Rescue operations" : admin ? "Administration" : staff ? "Intelligence" : "Citizen services"} · RESQGRID`;
  }, [pathname, ops, admin, staff]);
  const links = admin
    ? ([
        ["/admin", "Administration", Settings2],
        ["/admin/agencies", "Agency verification", ShieldCheck],
        ["/admin/rules", "Decision rules", Settings2],
        ["/admin/audit", "Audit trail", History],
      ] as const)
    : ops
      ? opsLinks
      : intelLinks;
  if (pathname === "/")
    return (
      <div className="app dark landing-app">
        <a className="skip-link" href="#landing-title">
          Skip to content
        </a>
        <Landing />
      </div>
    );
  return (
    <div
      className={`app workspace-theme ${staff && !ops && !admin ? "dark intelligence-theme" : "light"} ${staff ? "command-shell" : "citizen-theme"} ${ops ? "agency-theme" : admin ? "admin-theme" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="environment-bar">
        <span>
          <span className="env-marker" />
          SIH DEMONSTRATION
        </span>
        <span>
          Simulated data · browser-local workflows · no emergency delivery
        </span>
      </div>
      <header className="topbar">
        <Link className="brand" to="/">
          <ShieldCheck className="command-brand-icon" size={30} />
          <span>
            RESQGRID <b>INDIA</b>
            <small>DISASTER INTELLIGENCE & RESPONSE</small>
          </span>
        </Link>
        <nav className="workspace-nav" aria-label="Primary workspaces">
          {(!session ||
            session.role === "citizen" ||
            session.role === "admin") && <NavLink to="/me">Citizen</NavLink>}
          {(session?.role === "agency" || session?.role === "admin") && (
            <NavLink to="/operations">Rescue operations</NavLink>
          )}
          {session?.role === "admin" && (
            <>
              <NavLink to="/intelligence">Intelligence</NavLink>
              <NavLink to="/admin">Administration</NavLink>
            </>
          )}
        </nav>
        <div className="topbar-actions">
          <button
            className="icon-button notification-button"
            aria-label="View demo notifications"
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={19} />
            <span className="notification-count">
              {session?.role === "citizen"
                ? state.incidents.filter(
                    (i) =>
                      i.ownerId === "demo-citizen" &&
                      !["Closed", "Resolved"].includes(i.status),
                  ).length
                : state.incidents.filter((i) => i.status === "New").length}
            </span>
          </button>
          <details className="account" ref={accountRef}>
            <summary>
              <span className="avatar">
                {session?.role === "citizen"
                  ? "CT"
                  : session?.role === "agency"
                    ? "AO"
                    : session
                      ? "SA"
                      : "—"}
              </span>
              <span>
                {session
                  ? roles.find((r) => r.id === session.role)?.name
                  : "Public visitor"}
                <small>
                  {session ? "Demo session" : "Read-only information"}
                </small>
              </span>
              <ChevronDown size={14} />
            </summary>
            <div className="account-menu">
              <p>
                Demo access only. This switcher does not authenticate a live
                user.
              </p>
              {session?.role === "admin" && !admin && (
                <Link to="/admin">Administration</Link>
              )}
              <button
                onClick={() => {
                  flushSync(() => navigate("/auth/sign-in"));
                  logout();
                }}
              >
                {session ? "Log out / switch role" : "Log in"}
              </button>
              {session?.role === "admin" && (
                <button
                  onClick={() => {
                    if (window.confirm("Reset browser-local demo changes?")) {
                      reset();
                      notify("Demo environment reset");
                    }
                  }}
                >
                  Reset demo data
                </button>
              )}
            </div>
          </details>
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
        {notifications && (
          <div className="notification-menu">
            <h3>Demo activity</h3>
            {session?.role === "citizen"
              ? state.incidents
                  .filter((i) => i.ownerId === "demo-citizen")
                  .slice(0, 4)
                  .map((i) => (
                    <div key={i.id}>
                      <span>
                        {i.id} · {i.status}
                      </span>
                      <small>{formatTime(i.createdAt)}</small>
                    </div>
                  ))
              : state.audit.slice(0, 4).map((a) => (
                  <div key={a.id}>
                    <span>{a.action}</span>
                    <small>{formatTime(a.time)}</small>
                  </div>
                ))}
            {session?.role === "admin" && (
              <Link to="/admin/audit">View audit trail</Link>
            )}
          </div>
        )}
      </header>
      <div className="app-body">
        {staff && (
          <aside className={`sidebar ${mobile ? "open" : ""}`}>
            <span className="sidebar-label">
              {admin
                ? "GOVERNANCE"
                : ops
                  ? "RESCUE OPERATIONS"
                  : "INTELLIGENCE"}
            </span>
            {session?.role === "admin" && (
              <nav className="mobile-primary" aria-label="Mobile workspaces">
                <NavLink to="/me">Citizen services</NavLink>
                <NavLink to="/operations">Rescue operations</NavLink>
                <NavLink to="/intelligence">Intelligence</NavLink>
                <NavLink to="/admin">Administration</NavLink>
              </nav>
            )}
            <nav aria-label="Workspace navigation">
              {links.map(([url, label, Icon]) => (
                <NavLink
                  key={url}
                  to={url}
                  end={
                    url === "/intelligence" ||
                    url === "/operations" ||
                    url === "/admin"
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {label === "Warnings" && (
                    <span className="nav-count">
                      {
                        state.warnings.filter((w) => w.status === "Draft")
                          .length
                      }
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            {!ops && !admin && (
              <>
                <span className="sidebar-label module-label">
                  HAZARD MODULES
                </span>
                <nav>
                  {(
                    [
                      ["flood", "Flood", Waves],
                      ["forest-fire", "Forest fire", Flame],
                      ["drought", "Drought", Leaf],
                      ["heat-wave", "Heat wave", Sun],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <NavLink key={id} to={`/intelligence/hazards/${id}`}>
                      <Icon size={18} />
                      <span>{label}</span>
                      {id !== "flood" && <span className="module-off">—</span>}
                    </NavLink>
                  ))}
                </nav>
              </>
            )}
            <div className="sidebar-bottom">
              {session?.role === "admin" && !admin && (
                <Link to="/admin">
                  <Settings2 size={17} />
                  Administration
                </Link>
              )}
              <div className="system-status">
                <Activity size={15} />
                <div>
                  Demonstration mode<small>Live services not connected</small>
                </div>
              </div>
              <span className="sidebar-version">RESQGRID V3 / INVINCIBLE</span>
            </div>
          </aside>
        )}
        {!staff && mobile && (
          <nav className="mobile-workspaces">
            <Link to="/me">Citizen</Link>
            {(session?.role === "agency" || session?.role === "admin") && (
              <Link to="/operations">Rescue operations</Link>
            )}
            {session?.role === "admin" && (
              <Link to="/intelligence">Intelligence</Link>
            )}
          </nav>
        )}
        <main id="main" className={staff ? "workspace-main" : "citizen-main"}>
          <Suspense
            fallback={
              <div className="workspace-loading" role="status">
                Loading workspace…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route element={<RoleGuard role="citizen" />}>
                <Route path="/me" element={<Citizen />} />

                <Route path="/sos" element={<Sos />} />
                <Route path="/me/requests" element={<MyRequests />} />
                <Route
                  path="/me/requests/:incidentId"
                  element={<MyRequests />}
                />
                <Route path="/me/messages" element={<Messages />} />
              </Route>
              <Route path="/warnings" element={<Citizen warningsOnly />} />
              <Route path="/shelters" element={<Shelters />} />
              <Route path="/help" element={<Citizen />} />
              <Route path="/auth/:flow" element={<LoginPage />} />
              <Route element={<RoleGuard role="admin" />}>
                <Route path="/intelligence/devices" element={<Devices />} />
                <Route path="/intelligence/models" element={<ModelStatus />} />
                <Route
                  path="/intelligence/history"
                  element={<Administration auditOnly />}
                />
                <Route
                  path="/intelligence/*"
                  element={<Intelligence selected={zone} onSelect={setZone} />}
                />
              </Route>
              <Route element={<RoleGuard role="agency" />}>
                <Route path="/operations/resources" element={<Resources />} />
                <Route
                  path="/operations/coordination"
                  element={<Coordination />}
                />
                <Route path="/operations/recovery/*" element={<Recovery />} />
                <Route path="/operations/shelters" element={<Shelters />} />
                <Route path="/operations/*" element={<Operations />} />
              </Route>
              <Route element={<RoleGuard role="admin" />}>
                <Route path="/admin/*" element={<Administration />} />
              </Route>
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Page not found</h1>
                    <Link className="button primary" to="/">
                      Return to the public situation
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
      {!staff && (
        <footer className="citizen-footer">
          <span>RESQGRID V3 · INVINCIBLE</span>
          <span>
            SIH prototype. All agencies, shelters and events shown are
            demonstration fixtures.
          </span>
          <Link to="/">RESQGRID India</Link>
        </footer>
      )}
    </div>
  );
}
