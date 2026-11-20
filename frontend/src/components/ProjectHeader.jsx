import { NavLink } from "react-router-dom";
import { HealthPill } from "./Bits.jsx";
import { PROJECT_STATUSES } from "../constants";

export default function ProjectHeader({ project, onEdit, onAdd }) {
  const status = Object.fromEntries(PROJECT_STATUSES)[project.status];
  return (
    <>
      <div className="row between">
        <div className="row gap">
          <span className="muted small">Projects /</span>
          <h1>{project.name}</h1>
          <span className="pill">{status}</span>
          <HealthPill health={project.health} />
        </div>
        <button className="btn" onClick={onEdit}>Edit project</button>
      </div>
      {project.health_note && <div className="muted small">Health note: {project.health_note}</div>}
      <div className="row between">
        <div className="toggle">
          <NavLink to={`/projects/${project.id}`} end>Table</NavLink>
          <NavLink to={`/projects/${project.id}/board`}>Board</NavLink>
        </div>
        <button className="btn primary" onClick={onAdd}>Add task</button>
      </div>
    </>
  );
}
