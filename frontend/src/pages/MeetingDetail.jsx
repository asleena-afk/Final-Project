import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../api";
import { ErrorBox, Field } from "../components/Bits.jsx";

const MAX_CHARS = 200000;
const EMPTY = {
  project_id: "", title: "", meeting_date: "", meeting_time: "", location: "", attendees: "",
  transcript: "", summary_rows: null, next_actions: null,
};

export default function MeetingDetail({ tab }) {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { projects } = useOutletContext();
  const [m, setM] = useState(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState("");
  const [ticked, setTicked] = useState(new Set());
  const fileRef = useRef(null);

  useEffect(() => {
    if (isNew) { setM(EMPTY); setLoaded(true); return; }
    setLoaded(false);
    api.get(`/meetings/${id}`)
      .then((d) => {
        setM({ ...EMPTY, ...d, meeting_date: d.meeting_date || "", meeting_time: d.meeting_time || "",
          location: d.location || "", attendees: d.attendees || "" });
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew && !m.project_id && projects.length) setM((x) => ({ ...x, project_id: projects[0].id }));
  }, [isNew, projects, m.project_id]);

  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });
  const projectName = projects.find((p) => p.id === m.project_id)?.name || "the project";

  function body() {
    return {
      project_id: m.project_id, title: m.title,
      meeting_date: m.meeting_date || null, meeting_time: m.meeting_time.trim() || null,
      location: m.location.trim() || null, attendees: m.attendees.trim() || null,
      transcript: m.transcript,
      summary_rows: m.summary_rows && m.summary_rows.map((r, i) => ({
        no: i + 1, topic: r.topic, details: r.details || "",
        action_items: (r.action_items || []).map((a) => a.trim()).filter(Boolean),
      })),
      next_actions: m.next_actions && m.next_actions.map((a) => a.trim()).filter(Boolean),
    };
  }

  async function save() {
    if (!m.project_id) throw new Error("Choose a project first");
    if (!m.title.trim()) throw new Error("Title is required");
    const saved = isNew ? await api.post("/meetings", body()) : await api.put(`/meetings/${id}`, body());
    setM((x) => ({ ...x, ...saved, meeting_date: saved.meeting_date || "", meeting_time: saved.meeting_time || "",
      location: saved.location || "", attendees: saved.attendees || "" }));
    if (isNew) navigate(`/meetings/${saved.id}${tab === "summary" ? "/summary" : ""}`, { replace: true });
    return saved;
  }

  async function run(label, fn) {
    setBusy(label); setError(""); setInfo("");
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy("");
  }

  const onSave = () => run("save", async () => { await save(); setInfo("Saved"); });

  const onUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    run("upload", async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload("/transcripts/parse", form);
      setM((x) => ({ ...x, transcript: res.text }));
      setInfo(`${file.name} read: ${res.characters.toLocaleString()} characters. Check the text, then Summarize.`);
    });
    e.target.value = "";
  };

  const onSummarize = () => run("summarize", async () => {
    if (!m.transcript.trim()) throw new Error("Add a transcript first");
    const saved = await save();
    const done = await api.post(`/meetings/${saved.id}/summarize`);
    setM((x) => ({ ...x, summary_rows: done.summary_rows, next_actions: done.next_actions }));
    setTicked(new Set());
    navigate(`/meetings/${saved.id}/summary`);
  });

  const onDownload = () => run("download", async () => {
    await save();
    await api.download(`/meetings/${id}/export`, "meeting-summary.xlsx");
  });

  const onDelete = async () => {
    if (!window.confirm("Delete this meeting? Tasks already created from it are kept.")) return;
    run("delete", async () => { await api.del(`/meetings/${id}`); navigate("/meetings"); });
  };

  const onAddTasks = () => run("tasks", async () => {
    const items = [];
    m.summary_rows.forEach((r, ri) => (r.action_items || []).forEach((a, ai) => {
      if (ticked.has(`${ri}:${ai}`) && a.trim()) items.push(a.trim());
    }));
    if (!items.length) throw new Error("Tick at least one action item first");
    for (const text of items) {
      await api.post("/tasks", {
        project_id: m.project_id, meeting_id: id, title: text.slice(0, 160),
        notes: text.length > 160 ? text : "",
      });
    }
    setTicked(new Set());
    setInfo(`${items.length} task${items.length === 1 ? "" : "s"} added to ${projectName}. Assignee and due date are blank for you to fill in.`);
  });

  // ---- summary editing helpers
  const rows = m.summary_rows || [];
  const setRows = (r) => setM({ ...m, summary_rows: r });
  const editRow = (ri, patch) => setRows(rows.map((r, i) => (i === ri ? { ...r, ...patch } : r)));
  const editItem = (ri, ai, v) => editRow(ri, { action_items: rows[ri].action_items.map((a, i) => (i === ai ? v : a)) });
  const toggle = (key) => setTicked((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const next = m.next_actions || [];

  if (!loaded) return <div><ErrorBox error={error} />{!error && <p className="muted">Loading…</p>}</div>;

  return (
    <div className="stack">
      <div className="row between">
        <div className="row gap">
          <span className="muted small">My Meetings /</span>
          <h1>{m.title || "New meeting"}</h1>
        </div>
        <div className="row gap">
          <button className="btn primary" onClick={onSave} disabled={!!busy}>{tab === "summary" ? "Save changes" : "Save meeting"}</button>
          {!isNew && <button className="btn danger" onClick={onDelete} disabled={!!busy}>Delete</button>}
        </div>
      </div>
      <div className="tabs">
        <Link className={tab === "transcript" ? "on" : ""} to={isNew ? "/meetings/new" : `/meetings/${id}`}>Transcript</Link>
        {isNew ? <span className="off">Summary</span> : <Link className={tab === "summary" ? "on" : ""} to={`/meetings/${id}/summary`}>Summary</Link>}
      </div>
      <ErrorBox error={error} />
      {info && <div className="info">{info}</div>}
      {busy === "summarize" && <div className="info">Summarizing… this can take up to a minute for a long transcript.</div>}

      {tab === "transcript" && (
        <>
          <h3>Meeting details</h3>
          <div className="form-grid four">
            <Field label="Title (required)" wide2><input value={m.title} onChange={set("title")} maxLength={160} placeholder="Weekly update" /></Field>
            <Field label="Date"><input type="date" value={m.meeting_date} onChange={set("meeting_date")} /></Field>
            <Field label="Time"><input value={m.meeting_time} onChange={set("meeting_time")} placeholder="2.30pm - 3.40pm" /></Field>
            <Field label="Location"><input value={m.location} onChange={set("location")} placeholder="Ms Teams" /></Field>
            <Field label="Attendees (one group per line)" wide2><textarea rows={2} value={m.attendees} onChange={set("attendees")} placeholder={"Our team: names\nClient: names"} /></Field>
            <Field label="Project">
              <select value={m.project_id} onChange={set("project_id")}>
                {projects.length === 0 && <option value="">Add a project first</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <h3>Transcript</h3>
          <div className="dropzone">
            <input ref={fileRef} type="file" accept=".docx,.vtt,.srt,.txt" onChange={onUpload} hidden />
            <button className="btn" onClick={() => fileRef.current.click()} disabled={!!busy}>Upload file</button>
            <span className="small muted">.docx, .vtt, .srt or .txt, up to 2 MB. The file is read, not stored. Or paste text below.</span>
          </div>
          <Field label="Transcript text (check it and trim anything you do not need)">
            <textarea rows={12} value={m.transcript} onChange={set("transcript")} />
          </Field>
          <div className={`small ${m.transcript.length > MAX_CHARS ? "danger-text" : "muted"}`}>
            {m.transcript.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
          </div>
          <div className="row gap">
            <button className="btn primary" onClick={onSummarize} disabled={!!busy || m.transcript.length > MAX_CHARS}>Summarize</button>
            <span className="small muted">Saves the meeting first, then opens the Summary tab with the result.</span>
          </div>
        </>
      )}

      {tab === "summary" && (m.summary_rows === null ? (
        <p className="muted">No summary yet. Add a transcript on the <Link to={`/meetings/${id}`}>Transcript tab</Link> and press Summarize.</p>
      ) : (
        <>
          <div className="row between">
            <h3>Summary table</h3>
            <div className="row gap">
              <button className="btn" onClick={onSummarize} disabled={!!busy}>Summarize again</button>
              <button className="btn" onClick={onDownload} disabled={!!busy}>Download Excel</button>
            </div>
          </div>
          <div className="small muted">The Excel file starts with the title, date, time, location and attendees, then this table, then the Next action list. "Summarize again" replaces your edits.</div>
          <section className="card flush">
            <table className="edit">
              <thead><tr><th style={{ width: 48 }}>No.</th><th style={{ width: 190 }}>Topic</th><th>Details</th><th>Action Items (tick to make tasks)</th><th style={{ width: 80 }}>Row</th></tr></thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    <td>{ri + 1}</td>
                    <td><textarea rows={2} value={r.topic} onChange={(e) => editRow(ri, { topic: e.target.value })} aria-label={`Topic ${ri + 1}`} /></td>
                    <td><textarea rows={6} value={r.details} onChange={(e) => editRow(ri, { details: e.target.value })} aria-label={`Details ${ri + 1}`} /></td>
                    <td>
                      {(r.action_items || []).map((a, ai) => (
                        <div key={ai} className="item">
                          <input type="checkbox" checked={ticked.has(`${ri}:${ai}`)} onChange={() => toggle(`${ri}:${ai}`)} aria-label="Make this a task" />
                          <input value={a} onChange={(e) => editItem(ri, ai, e.target.value)} />
                          <button className="btn sm" title="Remove item" onClick={() => { editRow(ri, { action_items: r.action_items.filter((_, i) => i !== ai) }); setTicked(new Set()); }}>×</button>
                        </div>
                      ))}
                      {(r.action_items || []).length === 0 && <div className="small muted">No action items (allowed)</div>}
                      <button className="link" onClick={() => editRow(ri, { action_items: [...(r.action_items || []), ""] })}>+ Add item</button>
                    </td>
                    <td><button className="btn sm danger" onClick={() => { setRows(rows.filter((_, i) => i !== ri)); setTicked(new Set()); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="row between">
            <button className="btn" onClick={() => setRows([...rows, { no: rows.length + 1, topic: "", details: "", action_items: [] }])} disabled={rows.length >= 50}>Add row</button>
            <button className="btn primary" onClick={onAddTasks} disabled={!!busy}>Add ticked action items as tasks to {projectName}</button>
          </div>
          <h3>Next action</h3>
          <div className="stack tight">
            {next.map((a, i) => (
              <div key={i} className="item">
                <span className="num">{i + 1}.</span>
                <input value={a} onChange={(e) => setM({ ...m, next_actions: next.map((x, j) => (j === i ? e.target.value : x)) })} placeholder="Key follow-up" aria-label={`Next action ${i + 1}`} />
                <button className="btn sm danger" onClick={() => setM({ ...m, next_actions: next.filter((_, j) => j !== i) })}>Delete</button>
              </div>
            ))}
            <div><button className="btn" onClick={() => setM({ ...m, next_actions: [...next, ""] })}>Add line</button></div>
          </div>
        </>
      ))}
    </div>
  );
}
