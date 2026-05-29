import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Connect from './pages/Connect.jsx';
import Billing from './pages/Billing.jsx';
import api from './api.js';

function TokenCapture() {
  const [params] = useSearchParams();
  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('lswa_token', token);
      window.location.replace('/dashboard');
    }
  }, []);
  return null;
}

function PrivateRoute({ children }) {
  return localStorage.getItem('lswa_token') ? children : <Navigate to="/" replace />;
}

export const AuthContext = React.createContext(null);

export default function App() {
  const [auth, setAuth] = useState({ user: null, locations: [], subscription: null, loading: true });

  const loadMe = async () => {
    if (!localStorage.getItem('lswa_token')) {
      setAuth(a => ({ ...a, loading: false }));
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setAuth({ ...data, loading: false });
    } catch {
      setAuth(a => ({ ...a, loading: false }));
    }
  };

  useEffect(() => { loadMe(); }, []);

  return (
    <AuthContext.Provider value={{ ...auth, reload: loadMe }}>
      <BrowserRouter>
        <TokenCapture />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/connect/:locationId" element={<PrivateRoute><Connect /></PrivateRoute>} />
          <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
