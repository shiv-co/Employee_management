import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClipboard, FiSave, FiUser } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';

const initialProfileForm = {
  name: '',
  department: '',
  designation: '',
  mobileNumber: '',
  dob: ''
};

export default function EmployeeProfilePage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [formData, setFormData] = useState(initialProfileForm);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const [profileRes, attendanceRes, tasksRes, leavesRes] = await Promise.all([
          api.get('/v1/auth/me'),
          api.get('/v1/attendance/me'),
          api.get('/v1/tasks/me'),
          api.get('/v1/leaves/me')
        ]);
        const profile = profileRes.data?.data || user;
        setUser(profile);
        setFormData({
          name: profile?.name || '',
          department: profile?.department || '',
          designation: profile?.designation || '',
          mobileNumber: profile?.mobileNumber || '',
          dob: profile?.dob ? new Date(profile.dob).toISOString().slice(0, 10) : ''
        });
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

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await api.patch('/v1/auth/me', formData);
      const updatedUser = response.data?.data;
      setUser(updatedUser);
      toast.success('Profile updated');
    } catch (apiError) {
      const message = apiError.response?.data?.message || 'Failed to update profile';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
              {initials}
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
              <p>Email: {user?.email}</p>
              <p>Department: {user?.department || 'Not assigned'}</p>
              <p>Designation: {user?.designation || 'Not assigned'}</p>
              <p>Mobile: {user?.mobileNumber || 'Not provided'}</p>
              <p>DOB: {user?.dob ? new Date(user.dob).toLocaleDateString() : 'Not provided'}</p>
            </div>
          </div>

          <form className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl" onSubmit={handleProfileSubmit}>
            <label className="text-sm text-slate-700">
              Name
              <input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Mobile Number
              <input
                value={formData.mobileNumber}
                onChange={(event) => setFormData((prev) => ({ ...prev, mobileNumber: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. 9876543210"
              />
            </label>
            <label className="text-sm text-slate-700">
              Department
              <input
                value={formData.department}
                onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Date of Birth
              <input
                type="date"
                value={formData.dob}
                onChange={(event) => setFormData((prev) => ({ ...prev, dob: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Designation
              <input
                value={formData.designation}
                onChange={(event) => setFormData((prev) => ({ ...prev, designation: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                <FiSave /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
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

