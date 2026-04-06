import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiDownload, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const initialForm = {
  assignedTo: '',
  title: '',
  description: '',
  priority: 'Medium',
  deadline: ''
};

const initialEditForm = {
  id: '',
  assignedTo: '',
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Pending',
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

const taskTypeBadge = {
  assigned: 'bg-blue-100 text-blue-700',
  personal: 'bg-amber-100 text-amber-700'
};

export default function AdminTaskAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 250);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const statusMatch = statusFilter === 'all' || task.status === statusFilter;
        const searchMatch =
          !debouncedSearchText ||
          task.title?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
          task.assignedTo?.name?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
          task.createdBy?.name?.toLowerCase().includes(debouncedSearchText.toLowerCase());

        return statusMatch && searchMatch;
      }),
    [debouncedSearchText, statusFilter, tasks]
  );

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

  const openEditModal = useCallback((task) => {
    setEditForm({
      id: task._id,
      assignedTo: task.assignedTo?._id || task.assignedTo?.id || '',
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      status: task.status || 'Pending',
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : ''
    });
    setShowEditModal(true);
  }, []);

  const handleEditSave = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/v1/tasks/${editForm.id}`, {
        assignedTo: editForm.assignedTo,
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        status: editForm.status,
        deadline: editForm.deadline || null
      });
      toast.success('Task updated successfully');
      setShowEditModal(false);
      setEditForm(initialEditForm);
      await fetchData();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to update task');
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

  const handleExport = async () => {
    try {
      const response = await api.get('/v1/tasks/export', { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'tasks-report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to export tasks');
    }
  };

  if (loading) return <LoadingSpinner text="Loading tasks..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Task Management</h1>

      <div className="grid gap-4 xl:grid-cols-2">
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

        <PageCard title="Task Actions">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by task or employee"
              className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <FiDownload /> Export Tasks
            </button>
          </div>
        </PageCard>
      </div>

      <PageCard title="All Tasks">
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <article key={task._id} className="rounded-lg border border-slate-200 p-4 text-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedTaskId((prev) => (prev === task._id ? '' : task._id))}
                  className="flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800">Task: {task.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${taskTypeBadge[task.taskType] || taskTypeBadge.assigned}`}>
                      {task.taskType === 'personal' ? 'Personal' : 'Assigned'}
                    </span>
                  </div>
                  <p className="text-slate-600">Assigned To: {task.assignedTo?.name || '-'}</p>
                  {expandedTaskId === task._id ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-slate-600">Task Type: {task.taskType === 'personal' ? 'Personal Task' : 'Assigned Task'}</p>
                      <p className="text-slate-600">Description: {task.description || '-'}</p>
                      <p className="text-slate-600">Created By: {task.createdBy?.name || task.assignedBy?.name || '-'}</p>
                      <p className="text-slate-600">Status: {task.status || '-'}</p>
                      <p className="text-slate-600">Priority: {task.priority || '-'}</p>
                      <p className="text-slate-600">Remark: {task.remark?.trim() ? task.remark : 'No remark added'}</p>
                      <p className="text-slate-500">Created Date: {formatDateTime(task.createdAt)}</p>
                      <p className="text-slate-500">Deadline: {task.deadline ? formatDateTime(task.deadline) : '-'}</p>
                    </div>
                  ) : null}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(task)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(task._id)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!filteredTasks.length ? <p className="text-sm text-slate-500">No tasks found.</p> : null}
        </div>
      </PageCard>

      {showEditModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/50 bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Edit Task</h2>
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
                Assigned To
                <select
                  value={editForm.assignedTo}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id || employee._id} value={employee.id || employee._id}>
                      {employee.name} ({employee.department || 'N/A'})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Status
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                Deadline
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, deadline: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
                >
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
