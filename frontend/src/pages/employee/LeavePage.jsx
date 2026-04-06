import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useDataRefresh, useRefreshSignal } from '../../context/DataRefreshContext';

const initialForm = {
  leaveType: 'Casual',
  startDate: '',
  endDate: '',
  reason: ''
};

export default function LeavePage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const { refreshLeaveRequests } = useDataRefresh();
  const leaveRefreshSignal = useRefreshSignal('leave');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/leaves/me');
      setRequests(response.data?.data || []);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves, leaveRefreshSignal]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/v1/leaves', formData);
      toast.success('Leave request submitted');
      setFormData(initialForm);
      refreshLeaveRequests();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to submit leave request');
    }
  };

  if (loading) return <LoadingSpinner text="Loading leave requests..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Leave Management</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Request Leave">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <select
              value={formData.leaveType}
              onChange={(event) => setFormData((prev) => ({ ...prev, leaveType: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option>Casual</option>
              <option>Sick</option>
              <option>Earned</option>
              <option>Unpaid</option>
              <option>Other</option>
            </select>
            <input
              type="date"
              value={formData.startDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              type="date"
              value={formData.endDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <textarea
              rows="3"
              value={formData.reason}
              onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Reason"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
              Submit Leave Request
            </button>
          </form>
        </PageCard>

        <PageCard title="Leave History">
          <div className="space-y-2">
            {requests.map((request) => (
              <article key={request._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">{request.leaveType}</p>
                <p className="text-slate-600">
                  {request.startDate} to {request.endDate}
                </p>
                <p className="capitalize text-slate-600">Status: {request.status}</p>
                <p className="text-slate-500">{request.reason}</p>
              </article>
            ))}
            {!requests.length ? <p className="text-sm text-slate-500">No leave requests submitted.</p> : null}
          </div>
        </PageCard>
      </div>
    </>
  );
}

