import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const getSocketBaseUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';
  return configured.replace(/\/api\/?$/, '');
};

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const userId = user?.id || user?._id || null;

  const refreshNotifications = useCallback(async ({ unreadOnly = false, silent = false } = {}) => {
    if (!isAuthenticated) return [];

    try {
      const query = unreadOnly ? '?unreadOnly=true' : '';
      const response = await api.get(`/v1/notifications${query}`);
      const items = response.data?.data || [];
      if (!unreadOnly) {
        setNotifications(items);
      }
      return items;
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load notifications');
      }
      return [];
    }
  }, [isAuthenticated]);

  const refreshUnreadCount = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) return 0;

    try {
      const response = await api.get('/v1/notifications/unread-count');
      const count = response.data?.data?.unreadCount ?? response.data?.unreadCount ?? 0;
      setUnreadCount(count);
      return count;
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load unread notifications');
      }
      return 0;
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id) => {
    await api.put(`/v1/notifications/${id}/read`);
    setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put('/v1/notifications/read-all');
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    refreshNotifications({ silent: true });
    refreshUnreadCount({ silent: true });

    const socketBaseUrl = getSocketBaseUrl();
    if (socketBaseUrl) {
      const socket = io(socketBaseUrl, {
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('join', userId);
      });

      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 100));
        setUnreadCount((prev) => prev + 1);
        toast(notification.message, { icon: '!' });
      });

      socketRef.current = socket;
    }

    const interval = window.setInterval(() => {
      refreshNotifications({ silent: true });
      refreshUnreadCount({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, refreshNotifications, refreshUnreadCount, userId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      refreshNotifications,
      refreshUnreadCount,
      markAsRead,
      markAllRead
    }),
    [markAllRead, markAsRead, notifications, refreshNotifications, refreshUnreadCount, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}
