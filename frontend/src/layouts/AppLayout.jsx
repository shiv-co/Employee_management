import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  FiBell,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiMenu,
  FiSettings,
  FiUser,
  FiUsers,
  FiX
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../api/client';

const navClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${
    isActive
      ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-sm'
      : 'text-slate-700 hover:bg-slate-100'
  }`;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const CountBadge = memo(function CountBadge({ count }) {
  if (!count) return null;

  return (
    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count}
    </span>
  );
});

CountBadge.displayName = 'CountBadge';

const SidebarContent = memo(function SidebarContent({ isAdmin, onNavigate, requestCount }) {
  return (
    <nav className="flex flex-col gap-1">
      {!isAdmin ? (
        <>
          <NavLink to="/employee" className={navClass} end onClick={onNavigate}>
            <FiGrid /> Dashboard
          </NavLink>
          <NavLink to="/employee/attendance" className={navClass} onClick={onNavigate}>
            <FiCalendar /> Attendance
          </NavLink>
          <NavLink to="/employee/tasks" className={navClass} onClick={onNavigate}>
            <FiClipboard /> Tasks
          </NavLink>
          <NavLink to="/employee/report" className={navClass} onClick={onNavigate}>
            <FiFileText /> Daily Report
          </NavLink>
          <NavLink to="/employee/leaves" className={navClass} onClick={onNavigate}>
            <FiCalendar /> Leave Requests
          </NavLink>
          <NavLink to="/employee/profile" className={navClass} onClick={onNavigate}>
            <FiUser /> Profile
          </NavLink>
          <NavLink to="/employee/notifications" className={navClass} onClick={onNavigate}>
            <FiBell /> Notifications
          </NavLink>
        </>
      ) : (
        <>
          <NavLink to="/admin" className={navClass} end onClick={onNavigate}>
            <FiGrid /> Admin Dashboard
          </NavLink>
          <NavLink to="/admin/employees" className={navClass} onClick={onNavigate}>
            <FiUsers /> Employees
          </NavLink>
          <NavLink to="/admin/tasks" className={navClass} onClick={onNavigate}>
            <FiClipboard /> Task Assignment
          </NavLink>
          <NavLink to="/admin/attendance" className={navClass} onClick={onNavigate}>
            <FiCalendar /> Attendance Mgmt
          </NavLink>
          <NavLink to="/admin/requests" className={navClass} onClick={onNavigate}>
            <span className="relative inline-flex">
              <FiFileText />
              <CountBadge count={requestCount} />
            </span>
            Requests
          </NavLink>
          <NavLink to="/admin/settings" className={navClass} onClick={onNavigate}>
            <FiSettings /> Settings
          </NavLink>
          <NavLink to="/admin/notifications" className={navClass} onClick={onNavigate}>
            <FiBell /> Notifications
          </NavLink>
        </>
      )}
    </nav>
  );
});

SidebarContent.displayName = 'SidebarContent';

const NotificationListContent = memo(function NotificationListContent({
  isAdmin,
  latestNotifications,
  markAllRead,
  markAsRead,
  closePanel
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Mark all read
          </button>
          <Link
            to={isAdmin ? '/admin/notifications' : '/employee/notifications'}
            onClick={closePanel}
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            View all
          </Link>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Close notifications"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 md:max-h-80">
        {latestNotifications.map((notification) => (
          <button
            key={notification._id}
            type="button"
            onClick={async () => {
              if (!notification.isRead) {
                await markAsRead(notification._id);
              }
              closePanel();
            }}
            className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words whitespace-normal font-medium text-slate-800">{notification.message}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
            </div>
          </button>
        ))}
        {!latestNotifications.length ? <p className="text-sm text-slate-500">No notifications yet.</p> : null}
      </div>
    </>
  );
});

NotificationListContent.displayName = 'NotificationListContent';

export default function AppLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const { notifications, unreadCount, refreshNotifications, markAsRead, markAllRead } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const isAdmin = user?.role === 'admin';
  const latestNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return undefined;

    const maybeShowReminder = () => {
      const now = new Date();
      const todayKey = getTodayKey();

      const attendanceKey = `reminder_attendance_${todayKey}`;
      const reportKey = `reminder_report_${todayKey}`;

      const minutes = now.getHours() * 60 + now.getMinutes();
      if (minutes >= 570 && !localStorage.getItem(attendanceKey)) {
        toast('Please mark attendance');
        localStorage.setItem(attendanceKey, 'shown');
      }

      if (minutes >= 1080 && !localStorage.getItem(reportKey)) {
        toast('Submit your daily report');
        localStorage.setItem(reportKey, 'shown');
      }
    };

    maybeShowReminder();
    const reminderInterval = setInterval(maybeShowReminder, 60000);
    return () => clearInterval(reminderInterval);
  }, [isAdmin, isAuthenticated]);

  const fetchRequestCount = useCallback(async () => {
    if (!isAdmin) return 0;

    try {
      const response = await api.get('/v1/dashboard/admin/pending-requests-count');
      const count = response.data?.data?.pendingRequests ?? response.data?.pendingRequests ?? 0;
      setRequestCount(count);
      return count;
    } catch (_error) {
      return 0;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return undefined;

    fetchRequestCount();
    const interval = setInterval(fetchRequestCount, 30000);
    return () => clearInterval(interval);
  }, [fetchRequestCount, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (bellOpen) {
      refreshNotifications({ silent: true });
    }
  }, [bellOpen, refreshNotifications]);

  const handleBellToggle = useCallback(async () => {
    const nextOpen = !bellOpen;
    setBellOpen(nextOpen);

    if (nextOpen) {
      await refreshNotifications({ silent: true });
      if (unreadCount > 0) {
        await markAllRead();
      }
    }
  }, [bellOpen, markAllRead, refreshNotifications, unreadCount]);

  const closeBellPanel = useCallback(() => {
    setBellOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSidebar}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 md:hidden"
              aria-label="Open menu"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <Link to={isAdmin ? '/admin' : '/employee'} className="text-lg font-semibold text-slate-900">
              Employee Management
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin/requests"
                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Requests"
              >
                <FiFileText className="h-5 w-5" />
                <CountBadge count={requestCount} />
              </Link>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={handleBellToggle}
                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <FiBell className="h-5 w-5" />
                <CountBadge count={unreadCount} />
              </button>

              {bellOpen ? (
                <div className="absolute right-0 top-12 z-30 hidden w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:block">
                  <NotificationListContent
                    isAdmin={isAdmin}
                    latestNotifications={latestNotifications}
                    markAllRead={markAllRead}
                    markAsRead={markAsRead}
                    closePanel={closeBellPanel}
                  />
                </div>
              ) : null}
            </div>

            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 sm:inline-flex">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-[260px_1fr]">
        <aside className="hidden h-fit rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm backdrop-blur md:block">
            <SidebarContent isAdmin={isAdmin} requestCount={requestCount} />
        </aside>

        <main className="space-y-4">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeSidebar} />
          <aside className="absolute left-0 top-0 h-full w-72 rounded-r-2xl border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={closeSidebar}
                className="rounded-md border border-slate-300 p-2 text-slate-700"
                aria-label="Close menu"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <SidebarContent isAdmin={isAdmin} requestCount={requestCount} onNavigate={closeSidebar} />
          </aside>
        </div>
      ) : null}

      {bellOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden">
          <div className="absolute inset-0" onClick={closeBellPanel} />
          <div className="absolute inset-x-0 top-0 max-h-[80vh] overflow-y-auto rounded-b-2xl bg-white p-4 shadow-xl">
            <NotificationListContent
              isAdmin={isAdmin}
              latestNotifications={latestNotifications}
              markAllRead={markAllRead}
              markAsRead={markAsRead}
              closePanel={closeBellPanel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
