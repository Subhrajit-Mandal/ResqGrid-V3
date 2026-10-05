import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock3,
  Shield,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone.toLowerCase().replaceAll(" ", "-")}`}>
      {children}
    </span>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function Panel({
  title,
  eyebrow,
  children,
  action,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <HelpCircle size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function DemoNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-note ${compact ? "compact" : ""}`}>
      <Shield size={15} />
      <span>
        {compact
          ? "All values and locations are simulated."
          : "Demonstration environment. Data is simulated; requests do not reach emergency services."}
      </span>
    </div>
  );
}
export function Quality({ quality }: { quality: string }) {
  return (
    <Badge tone={quality === "GOOD" ? "success" : "warning"}>
      {quality === "GOOD" ? (
        <CheckCircle2 size={12} />
      ) : (
        <AlertTriangle size={12} />
      )}{" "}
      {quality}
    </Badge>
  );
}
export function Meta({ children }: { children: ReactNode }) {
  return (
    <div className="meta">
      <Clock3 size={13} />
      {children}
    </div>
  );
}
export function LocationText({ children }: { children: ReactNode }) {
  return (
    <span className="location-text">
      <MapPin size={14} />
      {children}
    </span>
  );
}
export function formatTime(time: string) {
  return new Date(time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
