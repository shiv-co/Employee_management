import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useDataRefresh } from '../../context/DataRefreshContext';

const formatISTTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const { refreshState, refreshLeaveRequests, refreshCorrections } = useDataRefresh();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, correctionRes] = await Promise.all([
        api.get('/v1/leaves'),
        api.get('/v1/attendance/corrections')
      ]);
      setLeaveRequests(leaveRes.data?.data || []);
      setCorrectionRequests(correctionRes.data?.data || []);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, refreshState.leave, refreshState.corrections]);

  const reviewLeave = async (id, status) => {
    try {
      await api.patch(`/v1/leaves/${id}/review`, { status });
      toast.success(`Leave request ${status}`);
      refreshLeaveRequests();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to review leave request');
    }
  };

  const reviewCorrection = async (id, status) => {
    try {
      await api.patch(`/v1/attendance/corrections/${id}/review`, { status });
      toast.success(`Correction request ${status}`);
      refreshCorrections();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to review correction request');
    }
  };

  if (loading) return <LoadingSpinner text="Loading requests..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Admin Requests</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Attendance Correction Requests">
          <div className="space-y-2">
            {correctionRequests.map((request) => (
              <article key={request._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{request.employeeId?.name || 'Employee'}</p>
                <p className="text-slate-600">Date: {request.date}</p>
                <p className="text-slate-600">Check-in Time: {formatISTTime(request.correctCheckIn)}</p>
                <p className="text-slate-600">Check-out Time: {formatISTTime(request.correctCheckOut)}</p>
                <p className="text-slate-600">Note: {request.note || '-'}</p>
                <p className="capitalize text-slate-600">Status: {request.status}</p>

                {request.status === 'pending' ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewCorrection(request._id, 'approved')}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-xs text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewCorrection(request._id, 'rejected')}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs text-white"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {!correctionRequests.length ? <p className="text-sm text-slate-500">No correction requests found.</p> : null}
          </div>
        </PageCard>

        <PageCard title="Leave Requests">
          <div className="space-y-2">
            {leaveRequests.map((request) => (
              <article key={request._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{request.employeeId?.name || 'Employee'}</p>
                <p className="text-slate-600">
                  {request.leaveType}: {request.startDate} to {request.endDate}
                </p>
                <p className="text-slate-600">Reason: {request.reason}</p>
                <p className="capitalize text-slate-600">Status: {request.status}</p>

                {request.status === 'pending' ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewLeave(request._id, 'approved')}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-xs text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewLeave(request._id, 'rejected')}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs text-white"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {!leaveRequests.length ? <p className="text-sm text-slate-500">No leave requests found.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}

