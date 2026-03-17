import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const initialForm = {
  assignedTo: '',
  title: '',
  description: '',
  priority: 'Medium',
  deadline: ''
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function AdminTaskAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState(initialForm);

  const recentTasks = useMemo(
    () => tasks.filter((task) => task.taskType === 'assigned').slice(0, 8),
    [tasks]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeesRes, tasksRes] = await Promise.all([
        api.get('/v1/employees'),
        api.get('/v1/tasks')
      ]);
      setEmployees((employeesRes.data?.data || []).filter((item) => item.role === 'employee'));
      setTasks(tasksRes.data?.data || []);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/v1/tasks', {
        ...formData,
        taskType: 'assigned'
      });
      toast.success('Task assigned successfully');
      setFormData(initialForm);
      await fetchData();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to assign task');
    }
  };

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;

    try {
      await api.delete(`/v1/tasks/${taskId}`);
      toast.success('Task deleted successfully');
      await fetchData();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to delete task');
    }
  };

  if (loading) return <LoadingSpinner text="Loading tasks..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Task Assignment</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Assign New Task">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <select
              value={formData.assignedTo}
              onChange={(event) => setFormData((prev) => ({ ...prev, assignedTo: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.department || 'N/A'})
                </option>
              ))}
            </select>

            <input
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />

            <textarea
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Task description"
              rows="3"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={formData.priority}
                onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <input
                type="date"
                value={formData.deadline}
                onChange={(event) => setFormData((prev) => ({ ...prev, deadline: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
              Assign Task
            </button>
          </form>
        </PageCard>

        <PageCard title="Recently Assigned Tasks">
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <article key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Task: {task.title}</p>
                    <p className="text-slate-600">Assigned To: {task.assignedTo?.name || '-'}</p>
                    <p className="text-slate-500">Assigned At: {formatDateTime(task.createdAt)}</p>
                    <p className="text-slate-500">Status: {task.status || '-'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(task._id)}
                    className="self-start text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {!recentTasks.length ? <p className="text-sm text-slate-500">No tasks assigned yet.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}
