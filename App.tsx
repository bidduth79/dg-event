import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { SettingsProvider } from './state/SettingsContext';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Layout from './ui/Layout';

// Helper to handle OAuth redirect before Router mounts
// This prevents HashRouter from interpreting the access_token as a route path
const handleOAuthCallback = () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1)); // Remove initial #
    const token = params.get('access_token');
    if (token) {
      // Save directly to localStorage so AuthProvider picks it up on mount
      localStorage.setItem('google_access_token', token);
      // Clean the URL to avoid router confusion
      window.location.hash = '';
      return true;
    }
  }
  return false;
};

const App: React.FC = () => {
  // Execute token extraction once on initialization
  useState(() => handleOAuthCallback());

  return (
    <HashRouter>
      <SettingsProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/role-select" element={<RoleSelection />} />
            {/* Removed ProtectedRoute wrapper to allow public access */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </HashRouter>
  );
};

export default App;