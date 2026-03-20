import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiEdit2, FiList, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProgressBar from '../../components/ProgressBar';
import StatCard from '../../components/StatCard';

const statuses = ['Pending', 'In Progress', 'Completed'];
const priorities = ['all', 'Low', 'Medium', 'High'];

const statusTone = {
  Pending: 'bg-slate-200 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  todo: 'bg-slate-200 text-slate-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700'
};

const normalizeStatus = (status) => {
  const map = { todo: 'Pending', 'in-progress': 'In Progress', done: 'Completed' };
  return map[status] || status;
};

const progressColor = {
  Pending: 'bg-slate-500',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-emerald-500'
};

const progressValue = {
  Pending: 20,
  'In Progress': 60,
  Completed: 100
};

const statusOrder = {
  Pending: 1,
  'In Progress': 2,
  Completed: 3
};

const personalInitial = {
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
  dueTime: ''
};

const editInitial = {
  id: '',
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
  dueTime: ''
};

const getTaskDueTimestamp = (task) => {
  const datePart = task.dueDate || task.deadline;
  if (!datePart) return Number.MAX_SAFE_INTEGER;

  const normalizedDate = new Date(datePart);
  if (Number.isNaN(normalizedDate.getTime())) return Number.MAX_SAFE_INTEGER;

  if (!task.dueTime) return normalizedDate.getTime();

  const [hours = '0', minutes = '0'] = task.dueTime.split(':');
  normalizedDate.setHours(Number(hours), Number(minutes), 0, 0);
  return normalizedDate.getTime();
};

const formatDueDateTime = (task) => {
  const datePart = task.dueDate || task.deadline;
  if (!datePart) return 'No due date';

  const dateLabel = new Date(datePart).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return task.dueTime ? `${dateLabel}, ${task.dueTime}` : dateLabel;
};

export default function TaskListPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [personalForm, setPersonalForm] = useState(personalInitial);
  const [editForm, setEditForm] = useState(editInitial);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState({});

  const fetchTasks = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/v1/tasks/me');
      const items = response.data?.data || [];
      setTasks(items);
      setStatusUpdates(
        items.reduce((acc, task) => {
          acc[task._id] = {
            status: normalizeStatus(task.status),
            remark: task.remark || ''
          };
          return acc;
        }, {})
      );
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        status: normalizeStatus(task.status)
      })),
    [tasks]
  );

  const filteredTasks = useMemo(
    () =>
      normalizedTasks
        .filter((task) => {
          const statusMatch = statusFilter === 'all' || task.status === statusFilter;
          const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
          const typeMatch = typeFilter === 'all' || task.taskType === typeFilter;
          const searchMatch =
            !searchText ||
            task.title?.toLowerCase().includes(searchText.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchText.toLowerCase());

          return statusMatch && priorityMatch && typeMatch && searchMatch;
        })
        .sort((a, b) => {
          const orderDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          if (orderDiff !== 0) return orderDiff;

          const createdAtDiff = new Date(b.createdAt) - new Date(a.createdAt);
          if (createdAtDiff !== 0) return createdAtDiff;

          return getTaskDueTimestamp(a) - getTaskDueTimestamp(b);
        }),
    [normalizedTasks, priorityFilter, searchText, statusFilter, typeFilter]
  );

  const stats = useMemo(() => {
    const total = normalizedTasks.length;
    const done = normalizedTasks.filter((task) => task.status === 'Completed').length;
    const inProgress = normalizedTasks.filter((task) => task.status === 'In Progress').length;
    const pending = normalizedTasks.filter((task) => task.status === 'Pending').length;
    const completion = total ? Math.round((done / total) * 100) : 0;

    return { total, done, inProgress, pending, completion };
  }, [normalizedTasks]);

  const handleStatusChange = async (taskId) => {
    const update = statusUpdates[taskId];
    if (!update?.status) return;

    try {
      await api.patch(`/v1/tasks/${taskId}/status`, update);
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId ? { ...task, status: update.status, remark: update.remark } : task
        )
      );
      toast.success(update.status === 'Completed' ? 'Task completed' : 'Task status updated');
    } catch (apiError) {
      const message = apiError.response?.data?.message || 'Status update failed';
      setError(message);
      toast.error(message);
    }
  };

  const createPersonalTask = async (event) => {
    event.preventDefault();
    try {
      await api.post('/v1/tasks', { ...personalForm, taskType: 'personal' });
      toast.success('Personal task created');
      setPersonalForm(personalInitial);
      await fetchTasks();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to create personal task');
    }
  };

  const openEditModal = (task) => {
    setEditForm({
      id: task._id,
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      dueTime: task.dueTime || ''
    });
    setShowEditModal(true);
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/v1/todos/${editForm.id}`, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
        dueTime: editForm.dueTime || ''
      });
      toast.success('TODO updated');
      setShowEditModal(false);
      setEditForm(editInitial);
      await fetchTasks();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to update TODO');
    }
  };

  const handleTodoDelete = async (taskId) => {
    const confirmed = window.confirm('Are you sure you want to delete this TODO?');
    if (!confirmed) return;

    try {
      await api.delete(`/v1/todos/${taskId}`);
      toast.success('TODO deleted');
      await fetchTasks();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to delete TODO');
    }
  };

  if (loading) return <LoadingSpinner text="Loading tasks..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Task Management</h1>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="slate" icon={FiList} />
        <StatCard label="Pending" value={stats.pending} tone="amber" icon={FiClock} />
        <StatCard label="In Progress" value={stats.inProgress} tone="blue" icon={FiClock} />
        <StatCard label="Completed" value={stats.done} hint={`${stats.completion}% completion`} tone="emerald" icon={FiCheckCircle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Create Personal TODO">
          <form className="space-y-3" onSubmit={createPersonalTask}>
            <input
              value={personalForm.title}
              onChange={(event) => setPersonalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <textarea
              value={personalForm.description}
              onChange={(event) => setPersonalForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              rows="2"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={personalForm.priority}
                onChange={(event) => setPersonalForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <input
                type="date"
                value={personalForm.dueDate}
                onChange={(event) => setPersonalForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              <input
                type="time"
                value={personalForm.dueTime}
                onChange={(event) => setPersonalForm((prev) => ({ ...prev, dueTime: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white">
              <FiPlus /> Add Personal Task
            </button>
          </form>
        </PageCard>

        <PageCard title="Filters">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search tasks..."
              className="rounded-xl border border-slate-300 px-3 py-2 sm:col-span-2"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2">
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority === 'all' ? 'All priorities' : priority}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 sm:col-span-2">
              <option value="all">All task types</option>
              <option value="assigned">Assigned</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </PageCard>
      </div>

      <PageCard title="Overall Progress">
        <ProgressBar value={stats.completion} color="bg-emerald-500" />
      </PageCard>

      <PageCard>
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="font-semibold text-slate-800">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.description || 'No description'}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Type: <span className="capitalize">{task.taskType || 'assigned'}</span></p>
                    <p>Priority: <span className="capitalize">{task.priority}</span></p>
                    <p>Due: {formatDueDateTime(task)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className={`rounded-full px-3 py-1 text-center text-xs font-medium ${statusTone[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="w-full max-w-xs space-y-2">
                    <select
                      value={statusUpdates[task._id]?.status || task.status}
                      onChange={(event) =>
                        setStatusUpdates((prev) => ({
                          ...prev,
                          [task._id]: { ...(prev[task._id] || {}), status: event.target.value }
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <textarea
                      value={statusUpdates[task._id]?.remark || ''}
                      onChange={(event) =>
                        setStatusUpdates((prev) => ({
                          ...prev,
                          [task._id]: { ...(prev[task._id] || {}), remark: event.target.value }
                        }))
                      }
                      placeholder="Remark / Feedback"
                      rows="2"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleStatusChange(task._id)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
                    >
                      Update Status
                    </button>
                  </div>
                  {task.remark ? <p className="max-w-xs text-xs text-slate-500">Latest Remark: {task.remark}</p> : null}
                  {task.taskType === 'personal' ? (
                    <div className="flex gap-3 text-sm">
                      <button type="button" onClick={() => openEditModal(task)} className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900">
                        <FiEdit2 /> Edit
                      </button>
                      <button type="button" onClick={() => handleTodoDelete(task._id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800">
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar value={progressValue[task.status] || 0} color={progressColor[task.status] || 'bg-slate-500'} />
              </div>
            </div>
          ))}
          {!filteredTasks.length ? <p className="px-2 py-3 text-sm text-slate-500">No tasks match current filters.</p> : null}
        </div>
      </PageCard>

      {showEditModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/50 bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Edit Personal TODO</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEditSave}>
              <label className="text-sm text-slate-700 md:col-span-2">
                Title
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                Description
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows="3"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Priority
                <select
                  value={editForm.priority}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Due Date
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                Due Time
                <input
                  type="time"
                  value={editForm.dueTime}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dueTime: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
