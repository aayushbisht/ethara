import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import Modal from "../components/Modal";
import api from "../api/axios";
import "./Projects.css";

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function fetchProjects() {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProjects(); }, []);

  function onProjectCreated(project) {
    setProjects((prev) => [project, ...prev]);
    setShowCreate(false);
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        {user?.role === "admin" && (
          <button
            id="create-project-btn"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            New Project
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="dash-loading"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>No projects yet</h3>
          <p>
            {user?.role === "admin"
              ? "Create your first project to get started."
              : "You have not been added to any project yet."}
          </p>
          {user?.role === "admin" && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <ProjectCard key={p._id} project={p} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={onProjectCreated}
        />
      )}
    </AppLayout>
  );
}

function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project._id}`} className="project-card" id={`project-${project._id}`}>
      <div className="project-card-header">
        <div className="project-icon">{project.name[0].toUpperCase()}</div>
        <div className="project-card-title">{project.name}</div>
      </div>
      {project.description && (
        <p className="project-card-desc">{project.description}</p>
      )}
      <div className="project-card-meta">
        <span className="project-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
        </span>
        <span className="project-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {project.taskCount} task{project.taskCount !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/projects", form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Create Project" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="proj-name">Project Name</label>
          <input
            id="proj-name"
            className="input"
            placeholder="Enter project name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="proj-desc">Description (optional)</label>
          <textarea
            id="proj-desc"
            className="input"
            placeholder="Brief project description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            style={{ resize: "vertical" }}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button id="proj-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
