import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../api";
import { STATUSES } from "../constants";
import { ErrorBox, HealthPill, Progress } from "../components/Bits.jsx";
import ProjectForm from "../components/ProjectForm.jsx";

const COLORS = { todo: "#c9ced6", in_progress: "#6d8fc7", pending_review: "#e0a64a", done: "#3f7d58" };

export default function Dashboard() {
  const { reloadProjects } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    try { setData(await api.get("/dashboard")); setError(""); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div><h1>Dashboard</h1><ErrorBox error={error} />{!error && <p className="muted">Loading…</p>}</div>;

  const { kpis, tasks_by_status: by, projects } = data;
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const pie = STATUSES.map(([k, label]) => ({ key: k, name: label, value: by[k] })).filter((d) => d.value > 0);

  return (
    <div className="stack">
      <div className="row between">
        <h1>Dashboard</h1>
        <button className="btn primary" onClick={() => setAdding(true)}>Add project</button>
      </div>
      <ErrorBox error={error} />
      <div className="kpis">
        <Kpi label="Total projects" value={kpis.total_projects} note="all statuses" />
        <Kpi label="Open tasks" value={kpis.open_tasks} note="not done" />
        <Kpi label="Blocked" value={kpis.blocked} note="tasks with a blocker" />
        <Kpi label="Due soon" value={kpis.due_soon} note="within 7 days" />
      </div>
      <div className="two">
        <section className="card">
          <h3>Tasks by status</h3>
          {total === 0 ? <p className="muted">No tasks yet.</p> : (
            <div className="donut">
              <div className="donut-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie isAnimationActive={false} data={pie} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={1} stroke="none">
                      {pie.map((d) => <Cell key={d.key} fill={COLORS[d.key]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-total"><b>{total}</b><span>tasks</span></div>
              </div>
              <ul className="legend">
                {STATUSES.map(([k, l]) => <li key={k}><i style={{ background: COLORS[k] }} />{l}: {by[k]}</li>)}
              </ul>
            </div>
          )}
        </section>
        <section className="card">
          <h3>Progress by project (done / total)</h3>
          {projects.length === 0 && <p className="muted">No projects yet. Add one to get started.</p>}
          {projects.map((p) => (
            <div key={p.id} className="prog-row">
              <div className="row between small"><span>{p.name}</span><span>{p.done} of {p.total}, {p.progress_pct}%</span></div>
              <Progress pct={p.progress_pct} />
            </div>
          ))}
        </section>
      </div>
      <section className="card flush">
        <h3 className="pad">Projects</h3>
        <table>
          <thead><tr><th>Project</th><th>Health</th><th>Tasks</th><th>To Do</th><th>In Progress</th><th>Pending Review</th><th>Done</th><th>Blocked</th><th>Progress</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/projects/${p.id}`} className="strong">{p.name}</Link></td>
                <td><HealthPill health={p.health} /></td>
                <td>{p.total}</td><td>{p.todo}</td><td>{p.in_progress}</td><td>{p.pending_review}</td><td>{p.done}</td><td>{p.blocked}</td>
                <td className="w160"><div className="row gap"><Progress pct={p.progress_pct} /><span className="small">{p.progress_pct}%</span></div></td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td colSpan={9} className="muted">No projects yet.</td></tr>}
          </tbody>
        </table>
      </section>
      {adding && (
        <ProjectForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); reloadProjects(); }} />
      )}
    </div>
  );
}

const Kpi = ({ label, value, note }) => (
  <div className="card kpi"><div className="small muted">{label}</div><div className="big">{value}</div><div className="small muted">{note}</div></div>
);
