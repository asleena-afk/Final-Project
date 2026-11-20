import { STATUS_LABEL } from "../constants";

export const StatusPill = ({ status }) => <span className="pill">{STATUS_LABEL[status] || status}</span>;

export const HealthPill = ({ health }) => (
  <span className={`pill health-${health}`}>● {health[0].toUpperCase() + health.slice(1)}</span>
);

export const ErrorBox = ({ error }) => (error ? <div className="error" role="alert">{error}</div> : null);

export const Progress = ({ pct }) => (
  <div className="bar" aria-label={`${pct}% done`}><div style={{ width: `${pct}%` }} /></div>
);

export function Field({ label, children, wide }) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
