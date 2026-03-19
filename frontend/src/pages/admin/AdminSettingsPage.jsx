import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const initialForm = {
  officeStartTime: '09:30',
  lateAfter: '10:30',
  officeEndTime: '18:00'
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await api.get('/v1/settings');
        setFormData({
          officeStartTime: response.data?.data?.officeStartTime || initialForm.officeStartTime,
          lateAfter: response.data?.data?.lateAfter || initialForm.lateAfter,
          officeEndTime: response.data?.data?.officeEndTime || initialForm.officeEndTime
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.lateAfter <= formData.officeStartTime) {
      toast.error('Late time must be after office start time');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/v1/settings', formData);
      setFormData({
        officeStartTime: response.data?.data?.officeStartTime || formData.officeStartTime,
        lateAfter: response.data?.data?.lateAfter || formData.lateAfter,
        officeEndTime: response.data?.data?.officeEndTime || formData.officeEndTime
      });
      toast.success('Office timings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Office Timing Settings</h1>

      <PageCard title="Configure Office Timings">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-700">
            Office Start Time
            <input
              type="time"
              value={formData.officeStartTime}
              onChange={(event) => setFormData((prev) => ({ ...prev, officeStartTime: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="text-sm text-slate-700">
            Late After Time
            <input
              type="time"
              value={formData.lateAfter}
              onChange={(event) => setFormData((prev) => ({ ...prev, lateAfter: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Office End Time
            <input
              type="time"
              value={formData.officeEndTime}
              onChange={(event) => setFormData((prev) => ({ ...prev, officeEndTime: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </PageCard>
    </>
  );
}
