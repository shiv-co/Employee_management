import { createContext, useContext, useMemo, useState } from 'react';

const DataRefreshContext = createContext(null);

export function DataRefreshProvider({ children }) {
  const [refreshState, setRefreshState] = useState({
    attendance: 0,
    tasks: 0,
    leave: 0,
    notifications: 0,
    corrections: 0
  });

  const bump = (key) => {
    setRefreshState((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const value = useMemo(
    () => ({
      refreshState,
      refreshAttendance: () => bump('attendance'),
      refreshTasks: () => bump('tasks'),
      refreshLeaveRequests: () => bump('leave'),
      refreshNotifications: () => bump('notifications'),
      refreshCorrections: () => bump('corrections')
    }),
    [refreshState]
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
