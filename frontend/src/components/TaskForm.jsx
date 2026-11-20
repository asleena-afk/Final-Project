import { useState } from "react";
import { api } from "../api";
import { PRIORITIES, STAGES, STAGE_TO_STATUS, STATUSES } from "../constants";
import Modal from "./Modal.jsx";
import { ErrorBox, Field } from "./Bits.jsx";

export default function TaskForm({ task, projectId, meetingId, initialTitle, onSaved, onClose }) {
  const editing = !!task;
  const [f, setF] = useState({
    title: task?.title ?? initialTitle ?? "", notes: task?.notes ?? "",
    status: task?.status ?? "todo", priority: task?.priority ?? "medium",
    due_date: task?.due_date ?? "", assignee: task?.assignee ?? "",
    is_blocked: task?.is_blocked ?? false, blocker_reason: task?.blocker_reason ?? "",
    ticket_ref: task?.ticket_ref ?? "", module: task?.module ?? "",
    estimate_hrs: task?.estimate_hrs ?? "", ticket_stage: task?.ticket_stage ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const stageSetsStatus = !!f.ticket_stage;

  function pickStage(e) {
    const stage = e.target.value;
    setF({ ...f, ticket_stage: stage, status: stage ? STAGE_TO_STATUS[stage] : f.status });
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    if (f.is_blocked && !f.blocker_reason.trim()) return setError("Blocker reason is required when blocked");
    setBusy(true);
    const body = {
      project_id: task?.project_id ?? projectId,
      meeting_id: task?.meeting_id ?? meetingId ?? null,
      title: f.title, notes: f.notes, status: f.status, priority: f.priority,
      due_date: f.due_date || null, assignee: f.assignee.trim() || null,
      is_blocked: f.is_blocked, blocker_reason: f.is_blocked ? f.blocker_reason.trim() : null,
      ticket_ref: f.ticket_ref.trim() || null, module: f.module.trim() || null,
      estimate_hrs: f.estimate_hrs === "" ? null : Number(f.estimate_hrs),
      ticket_stage: f.ticket_stage || null,
    };
    try {
      const saved = editing ? await api.put(`/tasks/${task.id}`, body) : await api.post("/tasks", body);
      onSaved(saved);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={editing ? "Edit task" : "Add task"} onClose={onClose}>
      <form onSubmit={save} className="form-grid three">
        <Field label="Title (required, up to 160 characters)" wide>
          <input value={f.title} onChange={set("title")} maxLength={160} required autoFocus placeholder="What needs doing?" />
        </Field>
        <Field label={stageSetsStatus ? "Status (set by ticket stage)" : "Status"}>
          <select value={f.status} onChange={set("status")} disabled={stageSetsStatus}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={set("priority")}>{PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Due date"><input type="date" value={f.due_date} onChange={set("due_date")} /></Field>
        <Field label="Assignee (who holds it now)"><input value={f.assignee} onChange={set("assignee")} maxLength={80} /></Field>
        <Field label="Estimate (hrs)"><input type="number" min="0" step="0.5" value={f.estimate_hrs} onChange={set("estimate_hrs")} placeholder="Optional" /></Field>
        <Field label="Ticket number"><input value={f.ticket_ref} onChange={set("ticket_ref")} maxLength={40} placeholder="Optional" /></Field>
        <Field label="Module"><input value={f.module} onChange={set("module")} maxLength={60} placeholder="Optional" /></Field>
        <Field label="Ticket stage">
          <select value={f.ticket_stage} onChange={pickStage}>
            <option value="">None</option>
            {STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div className="box wide">
          <label className="check"><input type="checkbox" checked={f.is_blocked} onChange={(e) => setF({ ...f, is_blocked: e.target.checked })} /> Blocked</label>
          {f.is_blocked && (
            <Field label="Blocker reason (required, up to 300 characters)">
              <input value={f.blocker_reason} onChange={set("blocker_reason")} maxLength={300} placeholder="e.g. waiting for client reply" />
            </Field>
          )}
        </div>
        <Field label="Notes" wide><textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
        <div className="wide"><ErrorBox error={error} /></div>
        <div className="actions wide">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>Save task</button>
        </div>
      </form>
    </Modal>
  );
}
