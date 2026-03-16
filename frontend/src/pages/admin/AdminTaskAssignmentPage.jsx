import { useEffect, useState } from 'react';
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

export default function AdminTaskAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeesRes, tasksRes] = await Promise.all([api.get('/v1/employees'), api.get('/v1/tasks')]);
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
            {tasks
              .filter((task) => task.taskType === 'assigned')
              .slice(0, 8)
              .map((task) => (
                <article key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-800">{task.title}</p>
                  <p className="text-slate-600">To: {task.assignedTo?.name || '-'}</p>
                  <p className="text-slate-500">Priority: {task.priority}</p>
                </article>
              ))}
            {!tasks.length ? <p className="text-sm text-slate-500">No tasks assigned yet.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}

