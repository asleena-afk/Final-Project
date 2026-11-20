import { useState } from "react";
import { api } from "../api";
import { HEALTHS, PROJECT_STATUSES } from "../constants";
import Modal from "./Modal.jsx";
import { ErrorBox, Field } from "./Bits.jsx";

export default function ProjectForm({ project, onSaved, onDeleted, onClose }) {
  const editing = !!project;
  const [f, setF] = useState({
    name: project?.name || "", description: project?.description || "",
    status: project?.status || "active", health: project?.health || "green",
    health_note: project?.health_note || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const body = { ...f, health_note: f.health_note.trim() || null };
    try {
      const saved = editing ? await api.put(`/projects/${project.id}`, body) : await api.post("/projects", body);
      onSaved(saved);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this project? Its tasks and meetings are deleted too.")) return;
    try { await api.del(`/projects/${project.id}`); onDeleted(); } catch (err) { setError(err.message); }
  }

  return (
    <Modal title={editing ? "Edit project" : "Add project"} onClose={onClose}>
      <form onSubmit={save} className="form-grid">
        <Field label="Name (required, up to 120 characters)" wide>
          <input value={f.name} onChange={set("name")} maxLength={120} required autoFocus />
        </Field>
        <Field label="Description" wide><textarea rows={2} value={f.description} onChange={set("description")} /></Field>
        <Field label="Status">
          <select value={f.status} onChange={set("status")}>{PROJECT_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Health (set by you)">
          <select value={f.health} onChange={set("health")}>{HEALTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Health note (optional, up to 300 characters)" wide>
          <input value={f.health_note} onChange={set("health_note")} maxLength={300} placeholder="e.g. UAT delayed by client" />
        </Field>
        <div className="wide"><ErrorBox error={error} /></div>
        <div className="actions wide">
          {editing && <button type="button" className="btn danger left" onClick={remove}>Delete project</button>}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>Save project</button>
        </div>
      </form>
    </Modal>
  );
}
