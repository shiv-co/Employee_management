import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import PageCard from '../components/PageCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const query = showUnreadOnly ? '?unreadOnly=true' : '';
      const response = await api.get(`/v1/notifications/me${query}`);
      setNotifications(response.data?.data || []);
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [showUnreadOnly]);

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.isRead).length;
    return { total: notifications.length, unread };
  }, [notifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/v1/notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to mark as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/v1/notifications/${id}`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to delete notification');
    }
  };

  if (loading) return <LoadingSpinner text="Loading notifications..." />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Notification Center</h1>
        <button
          type="button"
          onClick={() => setShowUnreadOnly((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {showUnreadOnly ? 'Show All' : 'Show Unread'}
        </button>
      </div>

      <PageCard title={`Total: ${stats.total} | Unread: ${stats.unread}`}>
        <div className="space-y-2">
          {notifications.map((notification) => (
            <article key={notification._id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{notification.message}</p>
                  <p className="text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${notification.isRead ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                  {notification.isRead ? 'Read' : 'Unread'}
                </span>
              </div>

              <div className="mt-2 flex gap-2">
                {!notification.isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification._id)}
                    className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700"
                  >
                    Mark as Read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deleteNotification(notification._id)}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!notifications.length ? <p className="text-sm text-slate-500">No notifications found.</p> : null}
        </div>
      </PageCard>
    </>
  );
}




