import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiUserCheck, FiUserX, FiUsers } from 'react-icons/fi';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';

const AttendanceTrendChart = lazy(() => import('../../components/charts/AttendanceTrendChart'));
const TaskCompletionChart = lazy(() => import('../../components/charts/TaskCompletionChart'));
const DepartmentDistributionChart = lazy(() => import('../../components/charts/DepartmentDistributionChart'));

const mapTaskStatus = (status) => {
  const mapping = {
    todo: 'Pending',
    'in-progress': 'In Progress',
    done: 'Completed'
  };
  return mapping[status] || status;
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

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [taskMetrics, setTaskMetrics] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [trendView, setTrendView] = useState('weekly');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [overviewRes, taskRes, attendanceRes, employeesRes, reportsRes, recentTasksRes] = await Promise.all([
          api.get('/v1/dashboard/admin/overview'),
          api.get('/v1/dashboard/admin/task-metrics'),
          api.get('/v1/dashboard/admin/attendance-trends'),
          api.get('/v1/employees'),
          api.get('/v1/reports'),
          api.get('/v1/dashboard/admin/recent-tasks')
        ]);

        setOverview(overviewRes.data?.data || null);
        setTaskMetrics(taskRes.data?.data || []);
        setAttendanceTrends(attendanceRes.data?.data || []);
        setEmployees(employeesRes.data?.data || []);
        setReports(reportsRes.data?.data || []);
        setRecentTasks(recentTasksRes.data?.data || []);
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const summary = useMemo(() => {
    const totalEmployees = overview?.totalEmployees ?? 0;
    const presentToday = overview?.employeesPresentToday ?? overview?.todaysAttendance ?? 0;
    const lateToday = overview?.employeesLateToday ?? 0;
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const tasksCompletedToday = overview?.tasksCompletedToday ?? 0;
    const pendingTasks = overview?.pendingTasks ?? overview?.openTasks ?? 0;

    return { totalEmployees, presentToday, lateToday, absentToday, tasksCompletedToday, pendingTasks };
  }, [overview]);

  const taskChartData = useMemo(
    () => taskMetrics.map((entry) => ({ name: mapTaskStatus(entry._id), count: entry.count })),
    [taskMetrics]
  );

  const trendData = useMemo(() => {
    const size = trendView === 'weekly' ? 7 : 30;
    return attendanceTrends.slice(-size).map((day) => ({
      label: new Date(`${day._id}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      }),
      checkIns: day.checkIns || 0
    }));
  }, [attendanceTrends, trendView]);

  const departmentData = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      const key = employee.department?.trim() || 'Unassigned';
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries()).map(([department, count]) => ({ department, count }));
  }, [employees]);

  if (loading) return <LoadingSpinner text="Loading admin dashboard..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Employees" value={summary.totalEmployees} tone="slate" icon={FiUsers} />
        <StatCard label="Present Today" value={summary.presentToday} tone="emerald" icon={FiUserCheck} />
        <StatCard label="Absent Today" value={summary.absentToday} tone="rose" icon={FiUserX} />
        <StatCard label="Tasks Completed" value={summary.tasksCompletedToday} tone="blue" icon={FiCheckCircle} />
        <StatCard label="Pending Tasks" value={summary.pendingTasks} tone="amber" icon={FiClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Attendance Trend">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTrendView('weekly')}
              className={`rounded-lg px-3 py-2 text-sm ${
                trendView === 'weekly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setTrendView('monthly')}
              className={`rounded-lg px-3 py-2 text-sm ${
                trendView === 'monthly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Monthly
            </button>
          </div>
          <Suspense fallback={<LoadingSpinner text="Loading chart..." />}>
            <AttendanceTrendChart data={trendData} />
          </Suspense>
          <p className="mt-2 text-xs text-slate-500">Late today: {summary.lateToday}</p>
        </PageCard>

        <PageCard title="Task Completion">
          <Suspense fallback={<LoadingSpinner text="Loading chart..." />}>
            <TaskCompletionChart data={taskChartData} />
          </Suspense>
        </PageCard>
      </div>

      <PageCard title="Department Distribution">
        <Suspense fallback={<LoadingSpinner text="Loading chart..." />}>
          <DepartmentDistributionChart data={departmentData} />
        </Suspense>
      </PageCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <PageCard title="Recently Assigned Tasks">
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <article key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{task.title}</p>
                <p className="text-slate-600">Assigned To: {task.assignedTo?.name || '-'}</p>
                <p className="text-slate-600">Assigned By: {task.assignedBy?.name || '-'}</p>
                <p className="text-slate-500">Assigned At: {formatDateTime(task.createdAt)}</p>
              </article>
            ))}
            {!recentTasks.length ? <p className="text-sm text-slate-500">No tasks assigned yet.</p> : null}
          </div>
        </PageCard>

        <PageCard title="Recent Daily Reports">
          <div className="space-y-2">
            {reports.slice(0, 6).map((report) => (
              <article key={report._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{report.employeeId?.name || 'Employee'}</p>
                <p className="text-slate-500">Date: {report.date}</p>
                <p className="text-slate-600">Completed: {(report.completedTasks || []).join(', ') || '-'}</p>
              </article>
            ))}
            {!reports.length ? <p className="text-sm text-slate-500">No daily reports submitted yet.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}
