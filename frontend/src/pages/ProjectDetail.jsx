import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import Modal from "../components/Modal";
import api from "../api/axios";
import "./ProjectDetail.css";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [removing, setRemoving] = useState(null);

  async function fetchProject() {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProject(); }, [id]);

  async function handleRemoveMember(userId) {
    if (!window.confirm("Remove this member from the project?")) return;
    setRemoving(userId);
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemoving(null);
    }
  }

  async function handleDeleteProject() {
    if (!window.confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate("/projects");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project.");
    }
  }

  function onMemberAdded(member) {
    setProject((prev) => ({ ...prev, members: [...prev.members, member] }));
    setShowAddMember(false);
  }

  if (loading) return <AppLayout><div className="dash-loading"><div className="spinner" /></div></AppLayout>;
  if (error) return <AppLayout><div className="alert alert-error">{error}</div></AppLayout>;

  const isAdmin = user?.role === "admin";
  const isCreator = project?.createdBy === user?._id?.toString();

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/projects" className="breadcrumb-link">Projects</Link>
            <span className="breadcrumb-sep">/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>
              Add Member
            </button>
          )}
          {isCreator && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>
              Delete Project
            </button>
          )}
        </div>
      </div>

      <div className="project-detail-layout">
        {/* Members panel */}
        <div className="members-panel">
          <div className="panel-title">
            Members
            <span className="panel-count">{project.members.length}</span>
          </div>
          <div className="members-list">
            {project.members.map((m) => (
              <div key={m.userId} className="member-row">
                <div className="member-avatar">{m.username?.[0]?.toUpperCase()}</div>
                <div className="member-info">
                  <div className="member-name">{m.username}</div>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                </div>
                {isAdmin && m.userId !== project.createdBy && (
                  <button
                    className="member-remove"
                    onClick={() => handleRemoveMember(m.userId)}
                    disabled={removing === m.userId}
                    title="Remove member"
                  >
                    {removing === m.userId ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <>&times;</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks panel */}
        <div className="tasks-section">
          <div className="tasks-section-header">
            <div className="panel-title">Tasks</div>
            {isAdmin && (
              <Link to={`/projects/${id}/tasks`} className="btn btn-primary btn-sm">
                Manage Tasks
              </Link>
            )}
          </div>
          <TaskPreviewList projectId={id} currentUser={user} />
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdded={onMemberAdded}
        />
      )}
    </AppLayout>
  );
}

function TaskPreviewList({ projectId, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api
      .get(`/tasks/project/${projectId}`)
      .then((res) => setTasks(res.data))
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleStatusChange(taskId, status) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  }

  if (loading) return <div className="dash-loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="task-filters">
        {["all", "todo", "in-progress", "done"].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "filter-btn-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "in-progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h3>No tasks</h3>
          <p>No tasks match the current filter.</p>
        </div>
      ) : (
        <div className="task-preview-list">
          {filtered.map((task) => {
            const isAssignee = task.assignedTo === currentUser?._id?.toString();
            const canUpdateStatus = currentUser?.role === "admin" || isAssignee;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

            return (
              <div key={task._id} className={`task-row ${isOverdue ? "task-row-overdue" : ""}`}>
                <div className="task-row-left">
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  <div>
                    <div className="task-row-title">{task.title}</div>
                    {task.assignedToUsername && (
                      <div className="task-row-assignee">{task.assignedToUsername}</div>
                    )}
                  </div>
                </div>
                <div className="task-row-right">
                  {task.dueDate && (
                    <span className={`task-due ${isOverdue ? "task-due-overdue" : ""}`}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {canUpdateStatus ? (
                    <select
                      className="input task-status-select"
                      value={task.status}
                      onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${task.status}`}>
                      {task.status === "in-progress" ? "In Progress" : task.status === "todo" ? "To Do" : "Done"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { username });
      onAdded({ userId: res.data.userId, username: res.data.username, role: "member" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Member" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="add-member-username">Username</label>
          <input
            id="add-member-username"
            className="input"
            placeholder="Enter exact username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="add-member-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
