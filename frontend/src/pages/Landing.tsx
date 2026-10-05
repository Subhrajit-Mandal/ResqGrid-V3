import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Login } from "../auth/Login";
import { useDemoAuth } from "../auth/DemoAuth";
import { roles } from "../auth/config";
const sections = [
  {
    title: "Risk Mitigation",
    route: "/intelligence/zones",
    className: "mitigation",
    description: "Review risk zones and disaster evidence.",
  },
  {
    title: "Preparedness & Planning",
    route: "/operations/resources",
    className: "planning",
    description: "Inspect teams and response resources.",
  },
  {
    title: "Dynamic Response",
    route: "/operations",
    className: "response",
    description: "Open rescue operations and incident coordination.",
  },
  {
    title: "Recovery Solutions",
    route: "/operations/recovery",
    className: "recovery",
    description: "Open recovery tasks and assessments.",
  },
];
export function Landing() {
  const [login, setLogin] = useState(false);
  const { session } = useDemoAuth();
  return (
    <main className="image-landing" aria-labelledby="landing-title">
      <div className="landing-accessible-copy">
        <h1 id="landing-title" tabIndex={-1}>
          Welcome to RESQGRID INDIA
        </h1>
        <p>Real-time insights. Smarter decisions. A safer tomorrow.</p>
        <p>
          Explore climate disaster data, monitor risks, and stay informed with
          analytics and predictive tools.
        </p>
      </div>
      <div className="image-landing-frame">
        <img
          className="approved-landing-image"
          src="/art/landing-approved.png"
          width="2048"
          height="1152"
          alt="Conceptual multi-hazard India terrain with flood, fire and drought, and illustrated disaster management sections."
          fetchPriority="high"
        />
        <button
          className="image-landing-login"
          aria-label="LOGIN"
          title="Login to RESQGRID"
          onClick={() => setLogin(true)}
        >
          <span className="landing-accessible-copy">LOGIN</span>
        </button>
        <nav
          className="image-landing-sections"
          aria-label="Disaster management lifecycle"
        >
          {sections.map((section) => (
            <Link
              key={section.className}
              className={`image-landing-link ${section.className}`}
              to={section.route}
              aria-label={section.title}
              title={section.title}
            >
              <span className="landing-accessible-copy">
                {section.title}. {section.description}
              </span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="image-landing-mobile-controls">
        <nav aria-label="Mobile disaster management lifecycle">
          {sections.map((section) => (
            <Link key={section.className} to={section.route}>
              <span>{section.title}</span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      </div>
      <footer className="image-landing-footer">
        <span>
          SIH demonstration · Simulated data · No live emergency delivery
        </span>
        <div>
          {session && (
            <Link to={roles.find((role) => role.id === session.role)!.home}>
              My workspace
            </Link>
          )}
          <Link to="/warnings">Public warnings</Link>
          <Link to="/shelters">Shelter information</Link>
        </div>
      </footer>
      {login && <Login onClose={() => setLogin(false)} />}
    </main>
  );
}
