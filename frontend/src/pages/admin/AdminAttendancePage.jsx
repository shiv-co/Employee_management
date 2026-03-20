import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageCard from '../../components/PageCard';

const formatCsvValue = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
const formatISTTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit'
      })
    : '';

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ employeeId: '', from: '', to: '' });
  const [monthDate, setMonthDate] = useState(new Date());
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', status: 'Present', isLate: false });

  const toTimeInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const partMap = formatted.reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return `${partMap.hour}:${partMap.minute}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const [employeesRes, attendanceRes] = await Promise.all([
        api.get('/v1/employees'),
        api.get(`/v1/attendance${params.toString() ? `?${params}` : ''}`)
      ]);

      setEmployees((employeesRes.data?.data || []).filter((user) => user.role === 'employee'));
      setRecords(attendanceRes.data?.data || []);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.employeeId, filters.from, filters.to]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        (record.employeeId?.name || '').toLowerCase().includes(search.toLowerCase())
      ),
    [records, search]
  );

  const monthRecords = useMemo(() => {
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();

    return filteredRecords
      .filter((record) => {
        const recordDate = new Date(`${record.date}T00:00:00`);
        return recordDate.getMonth() === month && recordDate.getFullYear() === year;
      })
      .map((record) => ({ ...record, ...record, id: record._id }));
  }, [filteredRecords, monthDate]);

  const exportCsv = () => {
    const headers = ['Employee Name', 'Date', 'Check-In Time', 'Check-Out Time', 'Status', 'Late Status', 'Notes'];
    const lines = [headers.join(',')];

    filteredRecords.forEach((record) => {
      lines.push(
        [
          formatCsvValue(record.employeeId?.name || ''),
          formatCsvValue(record.date || ''),
          formatCsvValue(formatISTTime(record.checkInTime)),
          formatCsvValue(formatISTTime(record.checkOutTime)),
          formatCsvValue(record.status || ''),
          formatCsvValue(record.isLate ? 'Late' : 'On Time'),
          formatCsvValue(record.notes || '')
        ].join(',')
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'attendance_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openEditModal = (record) => {
    setEditRecord(record);
    setEditForm({
      checkIn: toTimeInputValue(record.checkInTime),
      checkOut: toTimeInputValue(record.checkOutTime),
      status: record.status || 'Present',
      isLate: Boolean(record.isLate)
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      await api.put(`/v1/attendance/${editRecord._id}`, editForm);
      toast.success('Attendance updated');
      setEditRecord(null);
      await fetchData();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to update attendance');
    }
  };

  if (loading) return <LoadingSpinner text="Loading attendance records..." />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Attendance Management</h1>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
          <FiDownload /> Export CSV
        </button>
      </div>

      <PageCard title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={filters.employeeId}
            onChange={(event) => setFilters((prev) => ({ ...prev, employeeId: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      </PageCard>

      <PageCard title="Calendar View">
        <AttendanceCalendar
          records={monthRecords}
          monthDate={monthDate}
          onPrevMonth={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          onNextMonth={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        />
      </PageCard>

      <PageCard title="Attendance Table">
        <div className="space-y-3 md:hidden">
          {filteredRecords.map((record) => (
            <article key={record._id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-800">{record.employeeId?.name || '-'}</p>
              <p>Date: {record.date}</p>
              <p>Check In: {formatISTTime(record.checkInTime) || '-'}</p>
              <p>Check Out: {formatISTTime(record.checkOutTime) || '-'}</p>
              <p>Status: {record.status}</p>
              <p>Late: {record.isLate ? 'Yes' : 'No'}</p>
              <p>Notes: {record.notes || '-'}</p>
              <button
                type="button"
                onClick={() => openEditModal(record)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <FiEdit2 /> Edit
              </button>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="px-2 py-2">Employee Name</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Check-In Time</th>
                <th className="px-2 py-2">Check-Out Time</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Late Status</th>
                <th className="px-2 py-2">Notes</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record._id} className="border-t border-slate-200">
                  <td className="px-2 py-2">{record.employeeId?.name || '-'}</td>
                  <td className="px-2 py-2">{record.date}</td>
                  <td className="px-2 py-2">{formatISTTime(record.checkInTime) || '-'}</td>
                  <td className="px-2 py-2">{formatISTTime(record.checkOutTime) || '-'}</td>
                  <td className="px-2 py-2">{record.status}</td>
                  <td className="px-2 py-2">{record.isLate ? 'Late' : 'On Time'}</td>
                  <td className="px-2 py-2">{record.notes || '-'}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(record)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      <FiEdit2 /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRecords.length ? <p className="px-2 py-3 text-sm text-slate-500">No records found.</p> : null}
        </div>
      </PageCard>

      {editRecord ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/50 bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Edit Attendance</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSave}>
              <label className="text-sm text-slate-700">
                Check-in Time
                <input
                  type="time"
                  value={editForm.checkIn}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, checkIn: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Check-out Time
                <input
                  type="time"
                  value={editForm.checkOut}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, checkOut: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Status
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Present</option>
                  <option>Late</option>
                  <option>Absent</option>
                  <option>Leave</option>
                  <option>Manual Entry</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.isLate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, isLate: event.target.checked }))}
                />
                Mark as Late
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
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


