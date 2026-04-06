import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataRefreshProvider>
          <NotificationProvider>
            <App />
            <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
          </NotificationProvider>
        </DataRefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
