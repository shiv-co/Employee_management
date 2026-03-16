import { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';

const toLinesArray = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export default function DailyReportPage() {
  const [completedTasksText, setCompletedTasksText] = useState('');
  const [tasksInProgressText, setTasksInProgressText] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await api.post('/v1/reports/daily', {
        completedTasks: toLinesArray(completedTasksText),
        tasksInProgress: toLinesArray(tasksInProgressText),
        blockers,
        tomorrowsPlan
      });

      const successMessage = response.data?.message || 'Report submitted';
      setMessage(successMessage);
      toast.success(successMessage);
    } catch (apiError) {
      const messageText = apiError.response?.data?.message || 'Failed to submit report';
      setError(messageText);
      toast.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Submit Daily Report</h1>

      <PageCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="completedTasks">
              Completed Tasks (one per line)
            </label>
            <textarea
              id="completedTasks"
              rows="4"
              value={completedTasksText}
              onChange={(event) => setCompletedTasksText(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tasksInProgress">
              Tasks In Progress (one per line)
            </label>
            <textarea
              id="tasksInProgress"
              rows="3"
              value={tasksInProgressText}
              onChange={(event) => setTasksInProgressText(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="blockers">
              Blockers
            </label>
            <textarea
              id="blockers"
              rows="3"
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tomorrowsPlan">
              Tomorrow's Plan
            </label>
            <textarea
              id="tomorrowsPlan"
              rows="3"
              value={tomorrowsPlan}
              onChange={(event) => setTomorrowsPlan(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </PageCard>
    </>
  );
}

