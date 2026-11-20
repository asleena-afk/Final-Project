import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api, qs } from "../api";
import { PRIORITY_LABEL } from "../constants";
import { ErrorBox, StatusPill } from "../components/Bits.jsx";
import Filters from "../components/Filters.jsx";
import ProjectForm from "../components/ProjectForm.jsx";
import ProjectHeader from "../components/ProjectHeader.jsx";
import TaskForm from "../components/TaskForm.jsx";

const PAGE_SIZE = 10;
const COLUMNS = [["title", "Task (ticket · module)"], ["status", "Status"], ["priority", "Priority"], ["assignee", "Assignee"], ["due_date", "Due"]];

export default function ProjectTable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadProjects } = useOutletContext();
  const [project, setProject] = useState(null);
  const [res, setRes] = useState({ items: [], total: 0 });
  const [f, setF] = useState({ status: "", assignee: "", blocked: false });
  const [sort, setSort] = useState({ by: "due_date", desc: false });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [taskForm, setTaskForm] = useState(null); // null | {} | task
  const [editingProject, setEditingProject] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = qs({ project_id: id, status: f.status, assignee: f.assignee.trim(), blocked: f.blocked, sort: sort.by, desc: sort.desc, page, page_size: PAGE_SIZE });
      const [p, t] = await Promise.all([api.get(`/projects/${id}`), api.get(`/tasks?${q}`)]);
      setProject(p); setRes(t); setError("");
    } catch (e) { setError(e.message); }
  }, [id, f, sort, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [f, id]);

  async function remove(t) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    try { await api.del(`/tasks/${t.id}`); load(); } catch (e) { setError(e.message); }
  }
  const sortBy = (col) => setSort((s) => ({ by: col, desc: s.by === col ? !s.desc : false }));
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const today = new Date().toLocaleDateString("en-CA"); // your local date, YYYY-MM-DD

  if (!project) return <div><ErrorBox error={error} />{!error && <p className="muted">Loading…</p>}</div>;

  return (
    <div className="stack">
      <ProjectHeader project={project} onEdit={() => setEditingProject(true)} onAdd={() => setTaskForm({})} />
      <Filters f={f} setF={setF} />
      <ErrorBox error={error} />
      <section className="card flush">
        <table>
          <thead>
            <tr>
              {COLUMNS.map(([col, label]) => (
                <th key={col}><button className="th-btn" onClick={() => sortBy(col)}>{label}{sort.by === col ? (sort.desc ? " ▼" : " ▲") : ""}</button></th>
              ))}
              <th>Blocker</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {res.items.map((t) => {
              const overdue = t.due_date && t.due_date < today && t.status !== "done";
              return (
                <tr key={t.id} className={t.is_blocked ? "blocked" : ""}>
                  <td>
                    <div className={`strong${t.status === "done" ? " struck" : ""}`}>{t.title}</div>
                    <div className="small muted">{[t.ticket_ref, t.module].filter(Boolean).join(" · ") || "No ticket yet"}</div>
                  </td>
                  <td><StatusPill status={t.status} />{t.ticket_stage && <div className="stage">{t.ticket_stage}</div>}</td>
                  <td>{PRIORITY_LABEL[t.priority]}</td>
                  <td>{t.assignee || "-"}</td>
                  <td className={overdue ? "overdue" : ""}>{t.due_date ? (overdue ? `Overdue: ${t.due_date}` : t.due_date) : "-"}</td>
                  <td className="small danger-text">{t.is_blocked ? `Blocked: ${t.blocker_reason}` : "-"}</td>
                  <td className="nowrap">
                    <button className="btn sm" onClick={() => setTaskForm(t)}>Edit</button>{" "}
                    <button className="btn sm danger" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {res.items.length === 0 && <tr><td colSpan={7} className="muted">No tasks match. Add a task or try another filter.</td></tr>}
          </tbody>
        </table>
      </section>
      <div className="row between small muted">
        <span>{res.total} task{res.total === 1 ? "" : "s"}. Click a column heading to sort.</span>
        <div className="row gap">
          <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {pages}</span>
          <button className="btn sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
      {taskForm && (
        <TaskForm task={taskForm.id ? taskForm : null} projectId={id} onClose={() => setTaskForm(null)}
          onSaved={() => { setTaskForm(null); load(); }} />
      )}
      {editingProject && (
        <ProjectForm project={project} onClose={() => setEditingProject(false)}
          onSaved={() => { setEditingProject(false); load(); reloadProjects(); }}
          onDeleted={() => { reloadProjects(); navigate("/"); }} />
      )}
    </div>
  );
}
