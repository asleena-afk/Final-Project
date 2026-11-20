import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api, qs } from "../api";
import { PRIORITY_LABEL, STAGE_TO_STATUS, STATUSES, taskToBody } from "../constants";
import { ErrorBox } from "../components/Bits.jsx";
import Filters from "../components/Filters.jsx";
import ProjectForm from "../components/ProjectForm.jsx";
import ProjectHeader from "../components/ProjectHeader.jsx";
import TaskForm from "../components/TaskForm.jsx";

export default function ProjectBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadProjects } = useOutletContext();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [f, setF] = useState({ status: "", assignee: "", blocked: false });
  const [error, setError] = useState("");
  const [taskForm, setTaskForm] = useState(null);
  const [editingProject, setEditingProject] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = qs({ project_id: id, status: f.status, assignee: f.assignee.trim(), blocked: f.blocked, sort: "due_date", page_size: 500 });
      const [p, t] = await Promise.all([api.get(`/projects/${id}`), api.get(`/tasks?${q}`)]);
      setProject(p); setTasks(t.items); setError("");
    } catch (e) { setError(e.message); }
  }, [id, f]);
  useEffect(() => { load(); }, [load]);

  async function move(t, status) {
    // A ticket stage sets the status on the server, so a manual move that disagrees clears the stage.
    const stageAgrees = t.ticket_stage && STAGE_TO_STATUS[t.ticket_stage] === status;
    const body = taskToBody(t, { status, ticket_stage: stageAgrees ? t.ticket_stage : null });
    try { await api.put(`/tasks/${t.id}`, body); load(); } catch (e) { setError(e.message); }
  }

  if (!project) return <div><ErrorBox error={error} />{!error && <p className="muted">Loading…</p>}</div>;

  return (
    <div className="stack">
      <ProjectHeader project={project} onEdit={() => setEditingProject(true)} onAdd={() => setTaskForm({})} />
      <Filters f={f} setF={setF} />
      <ErrorBox error={error} />
      <div className="board">
        {STATUSES.map(([key, label]) => {
          const list = tasks.filter((t) => t.status === key);
          return (
            <div key={key} className="column">
              <div className="col-head">{label.toUpperCase()} ({list.length})</div>
              {list.map((t) => (
                <div key={t.id} className={`tcard${t.is_blocked ? " blocked" : ""}${key === "done" ? " done" : ""}`}>
                  <div className={`strong${key === "done" ? " struck" : ""}`}>{t.title}</div>
                  <div className="small muted">{[t.ticket_ref, t.module].filter(Boolean).join(" · ") || "No ticket yet"}</div>
                  {t.ticket_stage && <span className="pill">Stage: {t.ticket_stage}</span>}
                  <div className="row gap wrap">
                    <span className="pill">{PRIORITY_LABEL[t.priority]} priority</span>
                    {t.is_blocked && <span className="pill health-red">Blocked: {t.blocker_reason}</span>}
                  </div>
                  <div className="small muted">{t.assignee || "Unassigned"}{t.due_date ? ` · due ${t.due_date}` : ""}</div>
                  <div className="row gap">
                    <select aria-label="Move to status" value={t.status} onChange={(e) => move(t, e.target.value)}>
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button className="btn sm" onClick={() => setTaskForm(t)}>Edit</button>
                  </div>
                </div>
              ))}
              {list.length === 0 && <div className="small muted">Nothing here</div>}
            </div>
          );
        })}
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
