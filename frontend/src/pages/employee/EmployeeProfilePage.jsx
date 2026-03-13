import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';
import { FiCalendar, FiClipboard, FiUser } from 'react-icons/fi';

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const [attendanceRes, tasksRes, leavesRes] = await Promise.all([
          api.get('/attendance/me'),
          api.get('/tasks/me'),
          api.get('/leaves/me')
        ]);
        setAttendance(attendanceRes.data?.data || []);
        setTasks(tasksRes.data?.data || []);
        setLeaves(leavesRes.data?.data || []);
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const attendanceSummary = useMemo(() => {
    const presentDays = attendance.filter((record) => ['Present', 'Late', 'present'].includes(record.status)).length;
    const totalMinutes = attendance.reduce((sum, record) => sum + (record.totalWorkMinutes || 0), 0);
    const lateDays = attendance.filter((record) => record.isLate).length;

    return {
      presentDays,
      lateDays,
      totalHours: (totalMinutes / 60).toFixed(1)
    };
  }, [attendance]);

  const taskSummary = useMemo(() => {
    const assigned = tasks.filter((task) => task.taskType === 'assigned').length;
    const personal = tasks.filter((task) => task.taskType === 'personal').length;
    return { assigned, personal };
  }, [tasks]);

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <PageCard>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
            {initials}
          </div>

          <div className="space-y-1 text-sm text-slate-700">
            <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
            <p>Email: {user?.email}</p>
            <p>Department: {user?.department || 'Not assigned'}</p>
            <p>Designation: {user?.designation || 'Not assigned'}</p>
          </div>
        </div>
      </PageCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Present Days" value={attendanceSummary.presentDays} tone="emerald" icon={FiCalendar} />
        <StatCard label="Late Days" value={attendanceSummary.lateDays} tone="amber" icon={FiUser} />
        <StatCard label="Attendance Hours" value={attendanceSummary.totalHours} tone="blue" icon={FiCalendar} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Assigned Tasks" value={taskSummary.assigned} tone="slate" icon={FiClipboard} />
        <StatCard label="Personal Tasks" value={taskSummary.personal} tone="amber" icon={FiClipboard} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Assigned Tasks">
          <div className="space-y-2">
            {tasks.slice(0, 6).map((task) => (
              <div key={task._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{task.title}</p>
                <p className="text-slate-500">{task.status}</p>
              </div>
            ))}
            {!tasks.length ? <p className="text-sm text-slate-500">No tasks assigned yet.</p> : null}
          </div>
        </PageCard>

        <PageCard title="Leave History">
          <div className="space-y-2">
            {leaves.map((leave) => (
              <article key={leave._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{leave.leaveType}</p>
                <p className="text-slate-600">
                  {leave.startDate} to {leave.endDate}
                </p>
                <p className="capitalize text-slate-600">Status: {leave.status}</p>
              </article>
            ))}
            {!leaves.length ? <p className="text-sm text-slate-500">No leave history yet.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}
