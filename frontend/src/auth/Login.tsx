import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Users,
  X,
  LockKeyhole,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { allowed, DEMO_PASSWORD, roles, type DemoRole } from "./config";
import { useDemoAuth } from "./DemoAuth";
export function Login({ onClose }: { onClose: () => void }) {
  const [params] = useSearchParams();
  const [role, setRole] = useState<DemoRole | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const { login } = useDemoAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      window.clearTimeout(timer.current);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  useEffect(() => {
    if (role) input.current?.focus();
  }, [role]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    timer.current = window.setTimeout(() => {
      if (!role || !login(role, password)) {
        setError("Incorrect demo password. Please try again.");
        setBusy(false);
        return;
      }
      const returnTo = params.get("returnTo");
      const home = roles.find((r) => r.id === role)!.home;
      const safe =
        returnTo &&
        /^\/(me(?:\/|$)|sos$|operations(?:\/|$)|intelligence(?:\/|$)|admin(?:\/|$))/.test(
          returnTo,
        ) &&
        allowed(role, returnTo);
      onClose();
      navigate(safe ? returnTo : home);
    }, 250);
  }
  return (
    <dialog
      className="login-dialog"
      ref={dialog}
      aria-labelledby="login-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <button
        className="icon-button login-close"
        aria-label="Close login"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="login-emblem">
        <ShieldCheck size={30} />
      </span>
      <span className="eyebrow">RESQGRID INDIA / DEMONSTRATION</span>
      <h1 id="login-title">
        {role
          ? roles.find((r) => r.id === role)?.label
          : "Choose your workspace"}
      </h1>
      <p className="login-intro">
        {role
          ? "Enter the shared demo password to continue."
          : "One coordinated system. A focused view for every role."}
      </p>
      {!role ? (
        <div className="role-options">
          {roles.map((r, i) => {
            const Icon = [Users, Building2, ShieldCheck][i];
            return (
              <button
                key={r.id}
                className="role-option"
                onClick={() => setRole(r.id)}
              >
                <Icon size={24} />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.description}</small>
                </span>
                <ArrowRight size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="demo-password">Demo password</label>
          <div className="password-field">
            <LockKeyhole size={18} />
            <input
              ref={input}
              id="demo-password"
              type="password"
              autoComplete="off"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : "demo-password-hint"}
            />
          </div>
          {error && (
            <p id="login-error" className="login-error" role="alert">
              {error}
            </p>
          )}
          <p id="demo-password-hint" className="demo-password-hint">
            Shared demonstration password: <code>{DEMO_PASSWORD}</code>
          </p>
          <button
            className="button primary login-submit"
            disabled={busy}
            type="submit"
          >
            {busy ? "Opening workspace…" : "Enter workspace"}
            <ArrowRight size={18} />
          </button>
          <button
            className="button ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              setRole(null);
              setPassword("");
              setError("");
            }}
          >
            Choose a different role
          </button>
        </form>
      )}
      <p className="login-disclaimer">
        Demo access only. These role guards do not authenticate a live emergency
        service. Your simulated requests persist when you switch roles.
      </p>
    </dialog>
  );
}
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return (
    <div className="login-page">
      <h1>Workspace access</h1>
      <p>Select a role to enter the SIH demonstration.</p>
      <Login
        key={params.toString()}
        onClose={() => navigate("/", { replace: true })}
      />
    </div>
  );
}
