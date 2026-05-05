import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import api from "../api/axios";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/tasks/dashboard")
      .then((res) => setStats(res.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.username}</p>
        </div>
        {user?.role === "admin" && (
          <Link to="/projects" className="btn btn-primary">
            New Project
          </Link>
        )}
      </div>

      {loading && (
        <div className="dash-loading">
          <div className="spinner" />
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <div className="dash-stats">
            <StatCard label="Total Projects" value={stats.totalProjects} color="accent" icon="folder" />
            <StatCard label="Total Tasks" value={stats.totalTasks} color="info" icon="tasks" />
            <StatCard label="My Tasks" value={stats.myTasks} color="success" icon="person" />
            <StatCard label="Overdue" value={stats.overdue} color="danger" icon="alert" />
          </div>

          <div className="dash-section-title">Task Status Overview</div>
          <div className="dash-status-row">
            <StatusBar label="To Do" count={stats.byStatus.todo} total={stats.totalTasks} color="var(--text-muted)" />
            <StatusBar label="In Progress" count={stats.byStatus.inProgress} total={stats.totalTasks} color="var(--accent)" />
            <StatusBar label="Done" count={stats.byStatus.done} total={stats.totalTasks} color="var(--success)" />
          </div>
        </>
      )}
    </AppLayout>
  );
}

function StatCard({ label, value, color, icon }) {
  const icons = {
    folder: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    tasks: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    person: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    alert: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  };

  const colorMap = {
    accent: { bg: "var(--accent-light)", fg: "var(--accent)" },
    info: { bg: "var(--accent-light)", fg: "var(--accent)" },
    success: { bg: "var(--success-light)", fg: "var(--success)" },
    danger: { bg: "var(--danger-light)", fg: "var(--danger)" },
  };

  const c = colorMap[color] || colorMap.accent;

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: c.bg, color: c.fg }}>
        {icons[icon]}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="status-bar-card">
      <div className="status-bar-top">
        <span className="status-bar-label">{label}</span>
        <span className="status-bar-count">{count}</span>
      </div>
      <div className="status-bar-track">
        <div
          className="status-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="status-bar-pct">{pct}%</div>
    </div>
  );
}
