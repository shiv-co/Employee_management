import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiCheckCircle, FiClipboard, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';

const today = new Date().toISOString().slice(0, 10);

const statusLabel = {
  Pending: 'Pending',
  'In Progress': 'In Progress',
  Completed: 'Completed',
  todo: 'Pending',
  'in-progress': 'In Progress',
  done: 'Completed'
};

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [tasks, setTasks] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceRes, tasksRes] = await Promise.all([
        api.get(`/attendance/me?from=${today}&to=${today}`),
        api.get('/tasks/me')
      ]);

      setAttendanceToday(attendanceRes.data?.data?.[0] || null);
      setTasks(tasksRes.data?.data || []);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summary = useMemo(() => {
    const assignedTasks = tasks.filter((task) => task.taskType === 'assigned');
    const personalTasks = tasks.filter((task) => task.taskType === 'personal');
    const completed = tasks.filter((task) => ['Completed', 'done'].includes(task.status)).length;
    const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    return { assignedTasks, personalTasks, completed, completion };
  }, [tasks]);

  const handleAttendanceAction = async (type) => {
    setActionLoading(true);
    try {
      const endpoint = type === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      const response = await api.post(endpoint);
      toast.success(response.data?.message || 'Attendance updated');
      await fetchData();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to update attendance');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Employee Dashboard</h1>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value={attendanceToday?.status || 'Absent'} tone="blue" icon={FiCalendar} />
        <StatCard label="Assigned Tasks" value={summary.assignedTasks.length} tone="slate" icon={FiClipboard} />
        <StatCard label="Personal TODO" value={summary.personalTasks.length} tone="amber" icon={FiClock} />
        <StatCard label="Completed" value={summary.completed} tone="emerald" icon={FiCheckCircle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Today's Attendance Status">
          <div className="space-y-2 text-sm text-slate-700">
            <p>Status: {attendanceToday?.status || 'Absent'}</p>
            <p>
              Check-in: {attendanceToday?.checkInTime ? new Date(attendanceToday.checkInTime).toLocaleTimeString() : 'Not marked'}
            </p>
            <p>
              Check-out:{' '}
              {attendanceToday?.checkOutTime ? new Date(attendanceToday.checkOutTime).toLocaleTimeString() : 'Not marked'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAttendanceAction('check-in')}
              disabled={actionLoading || Boolean(attendanceToday?.checkInTime)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Check In
            </button>
            <button
              type="button"
              onClick={() => handleAttendanceAction('check-out')}
              disabled={actionLoading || !attendanceToday?.checkInTime || Boolean(attendanceToday?.checkOutTime)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              Check Out
            </button>
          </div>
        </PageCard>

        <PageCard title="Task Progress">
          <ProgressBar value={summary.completion} color="bg-emerald-500" />
          <p className="mt-3 text-sm text-slate-600">Completion: {summary.completion}%</p>
          <Link
            to="/employee/report"
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Submit Daily Report
          </Link>
        </PageCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Today's Assigned Tasks">
          <div className="space-y-2">
            {summary.assignedTasks.slice(0, 5).map((task) => (
              <article key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{task.title}</p>
                <p className="text-slate-500">{statusLabel[task.status] || task.status}</p>
              </article>
            ))}
            {!summary.assignedTasks.length ? <p className="text-sm text-slate-500">No assigned tasks today.</p> : null}
          </div>
        </PageCard>

        <PageCard title="Personal TODO List">
          <div className="space-y-2">
            {summary.personalTasks.slice(0, 5).map((task) => (
              <article key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{task.title}</p>
                <p className="text-slate-500">{statusLabel[task.status] || task.status}</p>
              </article>
            ))}
            {!summary.personalTasks.length ? <p className="text-sm text-slate-500">No personal TODO items.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}
