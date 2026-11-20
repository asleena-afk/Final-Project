import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectTable from "./pages/ProjectTable.jsx";
import ProjectBoard from "./pages/ProjectBoard.jsx";
import Meetings from "./pages/Meetings.jsx";
import MeetingDetail from "./pages/MeetingDetail.jsx";
import Reports from "./pages/Reports.jsx";

function Protected({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectTable />} />
        <Route path="/projects/:id/board" element={<ProjectBoard />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/meetings/:id" element={<MeetingDetail tab="transcript" />} />
        <Route path="/meetings/:id/summary" element={<MeetingDetail tab="summary" />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
