import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden />
      <div className="landing-orbit" aria-hidden />

      <header className="landing-nav">
        <div className="landing-brand">
          Team<span>Tasks</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-link">
            Sign in
          </Link>
          <Link to="/register" className="landing-cta landing-cta-primary">
            Start free
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-eyebrow">
            <span className="landing-pulse" />
            Built for real teams — projects, roles, and delivery
          </p>
          <h1 className="landing-title">
            One calm place to
            <span className="landing-title-accent"> ship work together</span>
          </h1>
          <p className="landing-lede">
            Replace scattered chats with clear projects, Admin and Member roles,
            assignable tasks, due dates, and a dashboard that surfaces what is
            overdue and what is on your plate next.
          </p>
          <div className="landing-hero-cta">
            <Link to="/register" className="landing-cta landing-cta-primary landing-cta-lg">
              Create your workspace
            </Link>
            <Link to="/login" className="landing-cta landing-cta-ghost landing-cta-lg">
              I already have an account
            </Link>
          </div>
          <p className="landing-micro">
            No credit card for this demo · PostgreSQL · REST API · JWT auth
          </p>
        </section>

        <aside className="landing-showcase" aria-label="Product preview">
          <div className="landing-preview">
            <div className="landing-preview-chrome">
              <span className="landing-dot" />
              <span className="landing-dot" />
              <span className="landing-dot" />
              <span className="landing-preview-url">app · Dashboard</span>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-row landing-preview-head">
                <span>Task</span>
                <span>Status</span>
                <span>Due</span>
              </div>
              <div className="landing-preview-row">
                <span>Launch checklist</span>
                <span className="landing-tag landing-tag-warn">In progress</span>
                <span className="landing-muted">Today</span>
              </div>
              <div className="landing-preview-row">
                <span>Stakeholder deck</span>
                <span className="landing-tag landing-tag-ok">Done</span>
                <span className="landing-muted">—</span>
              </div>
              <div className="landing-preview-row landing-preview-hot">
                <span>API hardening</span>
                <span className="landing-tag landing-tag-bad">Overdue</span>
                <span className="landing-muted">Yesterday</span>
              </div>
              <div className="landing-preview-metric">
                <strong>12</strong> open across projects · <strong>3</strong> assigned to you
              </div>
            </div>
          </div>
          <ul className="landing-features">
            <li>
              <strong>Role-based access</strong>
              <span>Admins manage members and assignments; members collaborate safely.</span>
            </li>
            <li>
              <strong>Delivery radar</strong>
              <span>Status totals, overdue alerts, and your upcoming deadlines.</span>
            </li>
            <li>
              <strong>REST + PostgreSQL</strong>
              <span>Prisma schema, validated APIs, ready to deploy.</span>
            </li>
          </ul>
        </aside>
      </main>

      <footer className="landing-footer">
        Team Task Manager · Full-stack demo
      </footer>
    </div>
  );
}
