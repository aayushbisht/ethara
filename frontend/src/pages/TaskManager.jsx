import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import Modal from "../components/Modal";
import api from "../api/axios";
import "./TaskManager.css";

const STATUSES = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const PRIORITIES = ["low", "medium", "high"];

function withAssignedUsername(task, members = []) {
  if (!task) return task;
  if (task.assignedToUsername || !task.assignedTo) return task;

  const assignedToId =
    typeof task.assignedTo === "object"
      ? task.assignedTo._id || task.assignedTo.id
      : task.assignedTo;

  const matchedMember = members.find((m) => m.userId?.toString() === assignedToId?.toString());
  if (!matchedMember?.username) return task;

  return { ...task, assignedToUsername: matchedMember.username };
}

export default function TaskManager() {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("kanban"); // kanban | list
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const isAdmin = user?.role === "admin";

  const fetchAll = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/tasks/project/${projectId}`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function onTaskCreated(task) {
    setTasks((prev) => [withAssignedUsername(task, project?.members), ...prev]);
    setShowCreate(false);
  }

  function onTaskUpdated(updated) {
    const normalized = withAssignedUsername(updated, project?.members);
    setTasks((prev) => prev.map((t) => (t._id === normalized._id ? normalized : t)));
    setEditTask(null);
  }

  async function handleDelete(taskId) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task.");
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  }

  if (loading) return <AppLayout><div className="dash-loading"><div className="spinner" /></div></AppLayout>;
  if (error) return <AppLayout><div className="alert alert-error">{error}</div></AppLayout>;

  const members = project?.members || [];

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/projects" className="breadcrumb-link">Projects</Link>
            <span className="breadcrumb-sep">/</span>
            <Link to={`/projects/${projectId}`} className="breadcrumb-link">{project?.name}</Link>
            <span className="breadcrumb-sep">/</span>
            <span>Tasks</span>
          </div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-sub">{tasks.length} task{tasks.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex gap-2 items-center" style={{ flexWrap: "wrap" }}>
          <div className="view-toggle">
            <button
              id="view-kanban"
              className={`view-btn ${view === "kanban" ? "view-btn-active" : ""}`}
              onClick={() => setView("kanban")}
              title="Kanban view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1" />
                <rect x="10" y="3" width="5" height="18" rx="1" />
                <rect x="17" y="3" width="5" height="18" rx="1" />
              </svg>
              Kanban
            </button>
            <button
              id="view-list"
              className={`view-btn ${view === "list" ? "view-btn-active" : ""}`}
              onClick={() => setView("list")}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              List
            </button>
          </div>
          {isAdmin && (
            <button id="create-task-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              New Task
            </button>
          )}
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          currentUser={user}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onEdit={setEditTask}
          onDelete={handleDelete}
        />
      ) : (
        <ListView
          tasks={tasks}
          currentUser={user}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onEdit={setEditTask}
          onDelete={handleDelete}
        />
      )}

      {showCreate && (
        <TaskFormModal
          title="Create Task"
          projectId={projectId}
          members={members}
          onClose={() => setShowCreate(false)}
          onSaved={onTaskCreated}
        />
      )}

      {editTask && (
        <TaskFormModal
          title="Edit Task"
          projectId={projectId}
          members={members}
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={onTaskUpdated}
        />
      )}
    </AppLayout>
  );
}

/* -----------------------------------------------
   Kanban Board
----------------------------------------------- */
function KanbanBoard({ tasks, currentUser, isAdmin, onStatusChange, onEdit, onDelete }) {
  return (
    <div className="kanban-board">
      {STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s.key);
        return (
          <div key={s.key} className="kanban-col">
            <div className="kanban-col-header">
              <span className="kanban-col-title">{s.label}</span>
              <span className="kanban-col-count">{col.length}</span>
            </div>
            <div className="kanban-col-body">
              {col.length === 0 ? (
                <div className="kanban-empty">No tasks</div>
              ) : (
                col.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -----------------------------------------------
   List View
----------------------------------------------- */
function ListView({ tasks, currentUser, isAdmin, onStatusChange, onEdit, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <h3>No tasks yet</h3>
        <p>{isAdmin ? "Create your first task using the button above." : "No tasks have been assigned to this project."}</p>
      </div>
    );
  }

  return (
    <div className="list-view">
      <div className="list-header-row">
        <span style={{ flex: 2 }}>Task</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Due Date</span>
        <span>Status</span>
        {isAdmin && <span>Actions</span>}
      </div>
      {tasks.map((task) => {
        const isAssignee = task.assignedTo === currentUser?._id?.toString();
        const canUpdate = isAdmin || isAssignee;
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

        return (
          <div key={task._id} className={`list-row ${isOverdue ? "list-row-overdue" : ""}`}>
            <div className="list-task-name" style={{ flex: 2 }}>
              <div className="list-task-title">{task.title}</div>
              {task.description && <div className="list-task-desc">{task.description}</div>}
            </div>
            <span><span className={`badge badge-${task.priority}`}>{task.priority}</span></span>
            <span className="list-assignee">
              {task.assignedToUsername ? (
                <>
                  <div className="mini-avatar">{task.assignedToUsername[0].toUpperCase()}</div>
                  {task.assignedToUsername}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Unassigned</span>
              )}
            </span>
            <span className={`list-due ${isOverdue ? "task-due-overdue" : ""}`}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
            </span>
            <span>
              {canUpdate ? (
                <select
                  className="input task-status-select"
                  value={task.status}
                  onChange={(e) => onStatusChange(task._id, e.target.value)}
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
            </span>
            {isAdmin && (
              <div className="list-actions">
                <button className="action-btn" onClick={() => onEdit(task)} title="Edit task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn action-btn-danger" onClick={() => onDelete(task._id)} title="Delete task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -----------------------------------------------
   Task Card (Kanban)
----------------------------------------------- */
function TaskCard({ task, currentUser, isAdmin, onStatusChange, onEdit, onDelete }) {
  const isAssignee = task.assignedTo === currentUser?._id?.toString();
  const canUpdate = isAdmin || isAssignee;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div className={`task-card ${isOverdue ? "task-card-overdue" : ""}`} id={`task-${task._id}`}>
      <div className="task-card-top">
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {isAdmin && (
          <div className="task-card-actions">
            <button className="action-btn" onClick={() => onEdit(task)} title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="action-btn action-btn-danger" onClick={() => onDelete(task._id)} title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="task-card-title">{task.title}</div>

      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}

      <div className="task-card-bottom">
        <div className="task-card-meta">
          {task.assignedToUsername ? (
            <div className="task-assignee-chip">
              <div className="mini-avatar">{task.assignedToUsername[0].toUpperCase()}</div>
              <span>{task.assignedToUsername}</span>
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Unassigned</span>
          )}
          {task.dueDate && (
            <span className={`task-due ${isOverdue ? "task-due-overdue" : ""}`}>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {canUpdate && (
          <select
            className="input task-status-select"
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value)}
            style={{ marginTop: 8 }}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        )}
      </div>
    </div>
  );
}

/* -----------------------------------------------
   Task Form Modal (create + edit)
----------------------------------------------- */
function TaskFormModal({ title, projectId, members, task, onClose, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assignedTo: task?.assignedTo || "",
    priority: task?.priority || "medium",
    status: task?.status || "todo",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await api.patch(`/tasks/${task._id}`, form);
        onSaved(res.data);
      } else {
        res = await api.post(`/tasks/project/${projectId}`, form);
        onSaved(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className="input"
            name="title"
            placeholder="Task title"
            value={form.title}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-desc">Description (optional)</label>
          <textarea
            id="task-desc"
            className="input"
            name="description"
            placeholder="Task description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="input" name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="task-status">Status</label>
              <select id="task-status" className="input" name="status" value={form.status} onChange={handleChange}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="task-assignee">Assign To</label>
            <select id="task-assignee" className="input" name="assignedTo" value={form.assignedTo} onChange={handleChange}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.username}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="task-due">Due Date</label>
            <input
              id="task-due"
              className="input"
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="task-form-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
