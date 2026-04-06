import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DataRefreshContext = createContext(null);

const moduleKeys = ['attendance', 'tasks', 'leave', 'notifications', 'corrections'];

export function DataRefreshProvider({ children }) {
  const listenersRef = useRef(
    moduleKeys.reduce((acc, key) => {
      acc[key] = new Set();
      return acc;
    }, {})
  );

  const emit = useCallback((key) => {
    listenersRef.current[key]?.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((key, listener) => {
    listenersRef.current[key]?.add(listener);
    return () => {
      listenersRef.current[key]?.delete(listener);
    };
  }, []);

  const refreshAttendance = useCallback(() => emit('attendance'), [emit]);
  const refreshTasks = useCallback(() => emit('tasks'), [emit]);
  const refreshLeaveRequests = useCallback(() => emit('leave'), [emit]);
  const refreshNotifications = useCallback(() => emit('notifications'), [emit]);
  const refreshCorrections = useCallback(() => emit('corrections'), [emit]);

  const value = useMemo(
    () => ({
      subscribe,
      refreshAttendance,
      refreshTasks,
      refreshLeaveRequests,
      refreshNotifications,
      refreshCorrections
    }),
    [refreshAttendance, refreshCorrections, refreshLeaveRequests, refreshNotifications, refreshTasks, subscribe]
  );

  return <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>;
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used inside DataRefreshProvider');
  }
  return context;
}

export function useRefreshSignal(moduleKey) {
  const { subscribe } = useDataRefresh();
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    if (!moduleKeys.includes(moduleKey)) {
      throw new Error(`Unknown refresh module: ${moduleKey}`);
    }

    return subscribe(moduleKey, () => {
      setSignal((prev) => prev + 1);
    });
  }, [moduleKey, subscribe]);

  return signal;
}
