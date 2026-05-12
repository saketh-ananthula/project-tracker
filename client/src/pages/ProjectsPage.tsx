import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ProjectSummary } from "../types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<{ projects: ProjectSummary[] }>("/api/projects");
      setProjects(data.projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
        }),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Projects</h1>
      <p className="muted">Create a project and invite teammates by email</p>

      {error ? (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: "1.25rem" }}>
        <h2>New project</h2>
        <form onSubmit={createProject}>
          <div className="form-group">
            <label htmlFor="pname">Name</label>
            <input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="pdesc">Description (optional)</label>
            <textarea
              id="pdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Your projects</h2>
        {projects.length === 0 ? (
          <p className="muted">No projects yet. Create one above.</p>
        ) : (
          <div>
            {projects.map((p) => (
              <div key={p.id} className="list-item">
                <div>
                  <Link to={`/projects/${p.id}`}>
                    <strong>{p.name}</strong>
                  </Link>
                  {p.description ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {p.description.slice(0, 120)}
                      {p.description.length > 120 ? "…" : ""}
                    </div>
                  ) : null}
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {p.memberCount} members · {p.taskCount} tasks
                  </div>
                </div>
                <span
                  className={`badge ${p.role === "ADMIN" ? "badge-admin" : "badge-member"}`}
                >
                  {p.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
