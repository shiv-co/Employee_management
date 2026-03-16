import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import StatCard from '../../components/StatCard';

const today = new Date().toISOString().slice(0, 10);

const correctionInitialState = {
  date: today,
  correctCheckIn: '',
  correctCheckOut: '',
  note: ''
};

const manualInitialState = {
  date: today,
  checkInTime: '',
  checkOutTime: '',
  note: ''
};
// function to convert "HH:MM" to "HH:MM:SS" format
export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState([]);
  const [monthDate, setMonthDate] = useState(new Date());
  const [corrections, setCorrections] = useState([]);
  const [correctionForm, setCorrectionForm] = useState(correctionInitialState);
  const [manualForm, setManualForm] = useState(manualInitialState);
  const [error, setError] = useState('');

  const fetchAttendance = async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceRes, correctionRes] = await Promise.all([
        api.get('/v1/attendance/me'),
        api.get('/v1/attendance/corrections/me')
      ]);
      setRecords(attendanceRes.data?.data || []);
      setCorrections(correctionRes.data?.data || []);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const todayRecord = useMemo(() => records.find((record) => record.date === today), [records]);

  const attendanceStats = useMemo(() => {
    const presentDays = records.filter((record) => ['Present', 'Late', 'present'].includes(record.status)).length;
    const lateDays = records.filter((record) => record.isLate).length;
    const totalMinutes = records.reduce((sum, record) => sum + (record.totalWorkMinutes || 0), 0);

    return {
      presentDays,
      lateDays,
      totalHours: (totalMinutes / 60).toFixed(1)
    };
  }, [records]);

  const monthRecords = useMemo(() => {
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();

    return records.filter((record) => {
      const recordDate = new Date(`${record.date}T00:00:00`);
      return recordDate.getMonth() === month && recordDate.getFullYear() === year;
    });
  }, [records, monthDate]);

  const handleAction = async (type) => {
    setSubmitting(true);
    setError('');

    try {
      const endpoint = type === 'check-in' ? '/v1/attendance/check-in' : '/v1/attendance/check-out';
      const response = await api.post(endpoint);
      toast.success(response.data?.message || 'Attendance marked');
      await fetchAttendance();
    } catch (apiError) {
      const message = apiError.response?.data?.message || 'Request failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCorrection = async (event) => {
    event.preventDefault();

    try {
      await api.post('/v1/attendance/corrections', {
        ...correctionForm,
        correctCheckIn: correctionForm.correctCheckIn || null,
        correctCheckOut: correctionForm.correctCheckOut || null
      });
      toast.success('Attendance correction request submitted');
      setCorrectionForm(correctionInitialState);
      await fetchAttendance();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to submit correction request');
    }
  };

  const submitManualEntry = async (event) => {
    event.preventDefault();

    try {
      await api.post('/v1/attendance/manual-entry', manualForm);
      toast.success('Manual attendance entry submitted');
      setManualForm(manualInitialState);
      await fetchAttendance();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to submit manual entry');
    }
  };

  if (loading) return <LoadingSpinner text="Loading attendance..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Present Days" value={attendanceStats.presentDays} tone="emerald" icon={FiCheckCircle} />
        <StatCard label="Late Check-ins" value={attendanceStats.lateDays} tone="amber" icon={FiClock} />
        <StatCard label="Total Hours" value={attendanceStats.totalHours} tone="blue" icon={FiCalendar} />
      </div>

      <PageCard title="Mark Today (Instant)">
        <div className="mb-4 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
          <p>Check-in: {todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString() : 'Not yet'}</p>
          <p>
            Check-out: {todayRecord?.checkOutTime ? new Date(todayRecord.checkOutTime).toLocaleTimeString() : 'Not yet'}
          </p>
          <p>Status: {todayRecord?.status || 'Absent'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAction('check-in')}
            disabled={submitting || Boolean(todayRecord?.checkInTime)}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Check-in
          </button>
          <button
            type="button"
            onClick={() => handleAction('check-out')}
            disabled={submitting || !todayRecord?.checkInTime || Boolean(todayRecord?.checkOutTime)}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            Check-out
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </PageCard>

      <AttendanceCalendar
        records={monthRecords}
        monthDate={monthDate}
        onPrevMonth={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        onNextMonth={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Manual Time Entry">
          <form className="space-y-3" onSubmit={submitManualEntry}>
            <input
              type="date"
              value={manualForm.date}
              onChange={(event) => setManualForm((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              type="datetime-local"
              value={manualForm.checkInTime}
              onChange={(event) => setManualForm((prev) => ({ ...prev, checkInTime: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              type="datetime-local"
              value={manualForm.checkOutTime}
              onChange={(event) => setManualForm((prev) => ({ ...prev, checkOutTime: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <textarea
              rows="3"
              value={manualForm.note}
              onChange={(event) => setManualForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Note"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
              Submit Manual Entry
            </button>
          </form>
        </PageCard>

        <PageCard title="Attendance Correction Request">
          <form className="space-y-3" onSubmit={submitCorrection}>
            <input
              type="date"
              value={correctionForm.date}
              onChange={(event) => setCorrectionForm((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              type="datetime-local"
              value={correctionForm.correctCheckIn}
              onChange={(event) => setCorrectionForm((prev) => ({ ...prev, correctCheckIn: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="datetime-local"
              value={correctionForm.correctCheckOut}
              onChange={(event) => setCorrectionForm((prev) => ({ ...prev, correctCheckOut: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <textarea
              rows="3"
              value={correctionForm.note}
              onChange={(event) => setCorrectionForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Reason for correction"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
              Submit Correction Request
            </button>
          </form>
        </PageCard>
      </div>

      <PageCard title="My Manual/Correction Requests">
        <div className="space-y-2">
          {corrections.slice(0, 10).map((item) => (
            <article key={item._id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-800">{item.date}</p>
              <p className="capitalize text-slate-600">Type: {item.requestType}</p>
              <p className="capitalize text-slate-600">Status: {item.status}</p>
              <p className="text-slate-500">{item.note || '-'}</p>
            </article>
          ))}
          {!corrections.length ? <p className="text-sm text-slate-500">No requests yet.</p> : null}
        </div>
      </PageCard>
    </>
  );
}


