import type { ReactNode } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "./auth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { LandingPage } from "./pages/LandingPage";

function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  if (loading) {
    return (
      <div className="layout">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/dashboard" className="brand">
          Team<span>Tasks</span>
        </Link>
        <nav className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <span className="muted">{user.name}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateLayout>
            <DashboardPage />
          </PrivateLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateLayout>
            <ProjectsPage />
          </PrivateLayout>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <PrivateLayout>
            <ProjectDetailPage />
          </PrivateLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
