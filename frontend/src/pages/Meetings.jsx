import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { api, qs } from "../api";
import { ErrorBox } from "../components/Bits.jsx";

export default function Meetings() {
  const { projects } = useOutletContext();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setList(await api.get(`/meetings?${qs({ project_id: projectId })}`)); setError(""); } catch (e) { setError(e.message); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function remove(m) {
    if (!window.confirm(`Delete "${m.title}"? Tasks already created from it are kept.`)) return;
    try { await api.del(`/meetings/${m.id}`); load(); } catch (e) { setError(e.message); }
  }

  return (
    <div className="stack">
      <div className="row between">
        <h1>My Meetings</h1>
        <button className="btn primary" onClick={() => navigate("/meetings/new")}>Add meeting</button>
      </div>
      <label className="field narrow"><span>Project</span>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <ErrorBox error={error} />
      <section className="card flush">
        <table>
          <thead><tr><th>Meeting</th><th>Project</th><th>Date</th><th>Summary</th><th>Tasks created</th><th>Actions</th></tr></thead>
          <tbody>
            {(list || []).map((m) => (
              <tr key={m.id}>
                <td><Link className="strong" to={m.summarised ? `/meetings/${m.id}/summary` : `/meetings/${m.id}`}>{m.title}</Link></td>
                <td>{m.project_name}</td>
                <td>{m.meeting_date || "-"}</td>
                <td><span className="pill">{m.summarised ? "Summarised" : "Not yet"}</span></td>
                <td>{Number(m.tasks_created) || "-"}</td>
                <td className="nowrap">
                  <button className="btn sm" onClick={() => navigate(`/meetings/${m.id}`)}>Open</button>{" "}
                  <button className="btn sm danger" onClick={() => remove(m)}>Delete</button>
                </td>
              </tr>
            ))}
            {list && list.length === 0 && <tr><td colSpan={6} className="muted">No meetings yet. Add one and upload a transcript.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
