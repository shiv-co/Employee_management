import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiList, FiPlus } from 'react-icons/fi';
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

const personalInitial = {
  title: '',
  description: '',
  priority: 'Medium',
  deadline: ''
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

  const fetchTasks = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/v1/tasks/me');
      setTasks(response.data?.data || []);
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
      normalizedTasks.filter((task) => {
        const statusMatch = statusFilter === 'all' || task.status === statusFilter;
        const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
        const typeMatch = typeFilter === 'all' || task.taskType === typeFilter;
        const searchMatch =
          !searchText ||
          task.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchText.toLowerCase());

        return statusMatch && priorityMatch && typeMatch && searchMatch;
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

  const handleStatusChange = async (taskId, status) => {
    try {
      await api.patch(`/v1/tasks/${taskId}/status`, { status });
      setTasks((prev) => prev.map((task) => (task._id === taskId ? { ...task, status } : task)));
      if (status === 'Completed') {
        toast.success('Task completed');
      } else {
        toast.success('Task status updated');
      }
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
          <form className="space-y-2" onSubmit={createPersonalTask}>
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
            <div className="grid gap-2 sm:grid-cols-2">
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
                value={personalForm.deadline}
                onChange={(event) => setPersonalForm((prev) => ({ ...prev, deadline: event.target.value }))}
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-xl">
                  <p className="font-semibold text-slate-800">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.description || 'No description'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Type: <span className="capitalize">{task.taskType || 'assigned'}</span>
                    {' | '}
                    Priority: <span className="capitalize">{task.priority}</span>
                    {' | '}
                    Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone[task.status]}`}>
                    {task.status}
                  </span>
                  <select
                    value={task.status}
                    onChange={(event) => handleStatusChange(task._id, event.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
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
    </>
  );
}

