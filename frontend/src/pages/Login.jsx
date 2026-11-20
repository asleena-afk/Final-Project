import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";
import { ErrorBox, Field } from "../components/Bits.jsx";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await api.post(mode === "login" ? "/login" : "/signup", { email, password });
      if (res.access_token) {
        setToken(res.access_token);
        navigate("/");
      } else {
        setInfo(res.message);
        setMode("login");
      }
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>TaskTracker</h1>
        <p className="muted">{mode === "login" ? "Log in to your projects" : "Create your account"}</p>
        <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
        <Field label="Password (6 or more characters)">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </Field>
        <ErrorBox error={error} />
        {info && <div className="info">{info}</div>}
        <button className="btn primary" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
