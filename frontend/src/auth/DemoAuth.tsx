import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { allowed, DEMO_PASSWORD, SESSION_KEY, type DemoRole } from "./config";
type Session = { role: DemoRole; expiresAt: number };
function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s &&
      ["citizen", "agency", "admin"].includes(s.role) &&
      Number.isFinite(s.expiresAt) &&
      s.expiresAt > Date.now()
      ? s
      : null;
  } catch {
    return null;
  }
}
const Context = createContext<{
  session: Session | null;
  login: (role: DemoRole, password: string) => boolean;
  logout: () => void;
} | null>(null);
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      logout,
      Math.max(0, session.expiresAt - Date.now()),
    );
    const sync = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, [session]);
  return (
    <Context.Provider
      value={{
        session,
        logout,
        login: (role, password) => {
          if (
            password !== DEMO_PASSWORD ||
            !["citizen", "agency", "admin"].includes(role)
          )
            return false;
          const next = { role, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          setSession(next);
          return true;
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemoAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoAuthProvider required");
  return value;
}
export function RoleGuard({ role }: { role: DemoRole }) {
  const { session } = useDemoAuth();
  const location = useLocation();
  if (!session || !allowed(session.role, location.pathname))
    return (
      <Navigate
        replace
        to={`/auth/sign-in?role=${role}&returnTo=${encodeURIComponent(location.pathname)}`}
      />
    );
  return <Outlet />;
}
