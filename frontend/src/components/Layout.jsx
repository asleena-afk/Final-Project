import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";

export default function Layout() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  const reloadProjects = useCallback(async () => {
    try { setProjects(await api.get("/projects")); } catch { /* shown on the page itself */ }
  }, []);
  useEffect(() => { reloadProjects(); }, [reloadProjects]);

  function signOut() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">TaskTracker</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <div className="nav-group">Projects</div>
          {projects.map((p) => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className="sub">{p.name}</NavLink>
          ))}
          {projects.length === 0 && <div className="sub muted">No projects yet</div>}
          <NavLink to="/meetings">My Meetings</NavLink>
          <NavLink to="/reports" className="disabled">Reports <span className="pill">coming soon</span></NavLink>
        </nav>
        <button className="btn" onClick={signOut}>Sign out</button>
      </aside>
      <main className="main">
        <Outlet context={{ projects, reloadProjects }} />
      </main>
    </div>
  );
}
