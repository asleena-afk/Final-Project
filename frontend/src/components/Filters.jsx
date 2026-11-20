import { STATUSES } from "../constants";

export default function Filters({ f, setF }) {
  return (
    <div className="row gap end">
      <label className="field narrow"><span>Status</span>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">All</option>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="field narrow"><span>Assignee</span>
        <input value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} placeholder="Exact name" />
      </label>
      <label className="check"><input type="checkbox" checked={f.blocked} onChange={(e) => setF({ ...f, blocked: e.target.checked })} /> Blocked only</label>
    </div>
  );
}
