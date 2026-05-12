import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type {
  ProjectDetail,
  ProjectMember,
  Task,
  TaskStatus,
} from "../types";

function statusClass(status: TaskStatus) {
  if (status === "DONE") return "badge-done";
  if (status === "IN_PROGRESS") return "badge-progress";
  return "badge-todo";
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    const [p, t] = await Promise.all([
      api<{ project: ProjectDetail }>(`/api/projects/${projectId}`),
      api<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`),
    ]);
    setProject(p.project);
    setTasks(t.tasks);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projectId) return;
      try {
        await loadAll();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadAll]);

  const isAdmin = project?.yourRole === "ADMIN";

  async function inviteMember(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function removeMember(memberId: string) {
    if (!projectId || !confirm("Remove this member from the project?")) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function changeMemberRole(memberId: string, role: "ADMIN" | "MEMBER") {
    if (!projectId) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc || null,
          dueDate: taskDue ? new Date(taskDue).toISOString() : null,
          assigneeId: taskAssignee || null,
        }),
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setTaskAssignee("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task create failed");
    }
  }

  async function updateTask(
    taskId: string,
    patch: Partial<{
      status: TaskStatus;
      title: string;
      description: string | null;
      dueDate: string | null;
      assigneeId: string | null;
    }>
  ) {
    if (!projectId) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteTask(taskId: string) {
    if (!projectId || !confirm("Delete this task?")) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function deleteProject() {
    if (!projectId || !confirm("Delete entire project and all tasks?")) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      window.location.href = "/projects";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error && !project) {
    return (
      <>
        <Link to="/projects">← Projects</Link>
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      </>
    );
  }
  if (!project) {
    return <p className="muted">Loading…</p>;
  }

  const memberOptions: ProjectMember[] = project.members;

  return (
    <>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link to="/projects">← Projects</Link>
      </p>
      <h1>{project.name}</h1>
      <p className="muted">
        You are{" "}
        <span className={`badge ${isAdmin ? "badge-admin" : "badge-member"}`}>
          {project.yourRole}
        </span>
        {project.description ? (
          <>
            <br />
            {project.description}
          </>
        ) : null}
      </p>

      {error ? (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="card" style={{ marginTop: "1.25rem" }}>
          <h2>Team</h2>
          <form onSubmit={inviteMember} className="row" style={{ marginBottom: "1rem" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label htmlFor="invite">Invite by email</label>
              <input
                id="invite"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div style={{ width: "140px" }}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "ADMIN" | "MEMBER")
                }
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Add member
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {isAdmin ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {project.members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td style={{ fontSize: "0.85rem" }}>{m.email}</td>
                  <td>
                    {isAdmin && m.id !== project.ownerId ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          changeMemberRole(
                            m.id,
                            e.target.value as "ADMIN" | "MEMBER"
                          )
                        }
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <span className={`badge ${m.role === "ADMIN" ? "badge-admin" : "badge-member"}`}>
                        {m.role}
                      </span>
                    )}
                  </td>
                  {isAdmin ? (
                    <td>
                      {m.id !== project.ownerId && m.id !== user?.id ? (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                          onClick={() => removeMember(m.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn-danger" onClick={deleteProject}>
              Delete project
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: "1.25rem" }}>
          <h2>Team</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {project.members.map((m) => (
              <li key={m.id}>
                {m.name} ({m.role})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>New task</h2>
        <form onSubmit={createTask}>
          <div className="form-group">
            <label htmlFor="ttitle">Title</label>
            <input
              id="ttitle"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="tdesc">Description</label>
            <textarea
              id="tdesc"
              rows={2}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
            />
          </div>
          <div className="row">
            <div style={{ flex: "1 1 160px" }}>
              <label htmlFor="tdue">Due date</label>
              <input
                id="tdue"
                type="datetime-local"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label htmlFor="tassign">Assignee</label>
              <select
                id="tassign"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                disabled={!isAdmin}
              >
                <option value="">Unassigned</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!isAdmin ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Only admins can assign tasks when creating. You can still create
              unassigned tasks.
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary">
            Add task
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="muted">No tasks yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const now = new Date();
                  const overdue =
                    t.dueDate &&
                    t.status !== "DONE" &&
                    new Date(t.dueDate) < now;
                  const canEditAssign =
                    isAdmin ||
                    t.assigneeId === user?.id ||
                    t.createdBy.id === user?.id;
                  return (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.description ? (
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            {t.description.slice(0, 80)}
                            {t.description.length > 80 ? "…" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <select
                          value={t.status}
                          disabled={!canEditAssign && !isAdmin}
                          onChange={(e) =>
                            updateTask(t.id, {
                              status: e.target.value as TaskStatus,
                            })
                          }
                        >
                          <option value="TODO">To do</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={t.assignee?.id ?? ""}
                            onChange={(e) =>
                              updateTask(t.id, {
                                assigneeId: e.target.value || null,
                              })
                            }
                          >
                            <option value="">Unassigned</option>
                            {memberOptions.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="muted">
                            {t.assignee?.name ?? "—"}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${overdue ? "badge-overdue" : statusClass(t.status)}`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {t.dueDate
                            ? new Date(t.dueDate).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </span>
                      </td>
                      <td>
                        {(isAdmin || t.createdBy.id === user?.id) && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                            onClick={() => deleteTask(t.id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
