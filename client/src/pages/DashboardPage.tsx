import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { DashboardData, TaskStatus } from "../types";

function statusBadge(status: TaskStatus) {
  const cls =
    status === "DONE"
      ? "badge-done"
      : status === "IN_PROGRESS"
        ? "badge-progress"
        : "badge-todo";
  return (
    <span className={`badge ${cls}`}>
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api<DashboardData>("/api/dashboard");
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!data) {
    return <p className="muted">Loading dashboard…</p>;
  }

  const { summary } = data;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Overview of tasks across your projects</p>

      <div className="card" style={{ marginTop: "1.25rem" }}>
        <h2>Task summary</h2>
        <div className="grid stats" style={{ marginTop: "0.5rem" }}>
          <div className="stat">
            <div className="num">{summary.totalTasks}</div>
            <div className="label">Total</div>
          </div>
          <div className="stat">
            <div className="num">{summary.todo}</div>
            <div className="label">To do</div>
          </div>
          <div className="stat">
            <div className="num">{summary.inProgress}</div>
            <div className="label">In progress</div>
          </div>
          <div className="stat">
            <div className="num">{summary.done}</div>
            <div className="label">Done</div>
          </div>
        </div>
        <div
          className="row"
          style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}
        >
          <div className="stat" style={{ textAlign: "left" }}>
            <div className="num" style={{ color: "var(--danger)" }}>
              {summary.overdue}
            </div>
            <div className="label">Overdue (open)</div>
          </div>
          <div className="stat" style={{ textAlign: "left" }}>
            <div className="num">{summary.myAssignedOpen}</div>
            <div className="label">Assigned to you (open)</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Overdue tasks</h2>
        {data.overdueTasks.length === 0 ? (
          <p className="muted">No overdue tasks. Nice work.</p>
        ) : (
          <div className="stack-sm">
            {data.overdueTasks.map((t) => (
              <div key={t.id} className="list-item">
                <div>
                  <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {t.project.name}
                    {t.assignee ? ` · ${t.assignee.name}` : ""}
                  </div>
                </div>
                <div>{statusBadge(t.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Your upcoming assignments</h2>
        {data.myUpcoming.length === 0 ? (
          <p className="muted">No upcoming due dates on your open tasks.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.myUpcoming.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                  </td>
                  <td>{t.project.name}</td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
