import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import PageCard from '../components/PageCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotifications } from '../context/NotificationContext';
import { useDataRefresh, useRefreshSignal } from '../context/DataRefreshContext';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { notifications, refreshNotifications, markAsRead: markNotificationRead } = useNotifications();
  const { refreshNotifications: refreshNotificationsModule } = useDataRefresh();
  const notificationsRefreshSignal = useRefreshSignal('notifications');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      await refreshNotifications({ silent: true });
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, notificationsRefreshSignal, showUnreadOnly]);

  const visibleNotifications = useMemo(
    () => (showUnreadOnly ? notifications.filter((item) => !item.isRead) : notifications),
    [notifications, showUnreadOnly]
  );

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.isRead).length;
    return { total: notifications.length, unread };
  }, [notifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      refreshNotificationsModule();
    } catch (apiError) {
      toast.error(apiError.response?.data?.message || 'Unable to mark as read');
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
          {visibleNotifications.map((notification) => (
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
                    onClick={() => handleMarkAsRead(notification._id)}
                    className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700"
                  >
                    Mark as Read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!visibleNotifications.length ? <p className="text-sm text-slate-500">No notifications found.</p> : null}
        </div>
      </PageCard>
    </>
  );
}
