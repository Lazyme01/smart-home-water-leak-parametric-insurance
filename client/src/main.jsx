import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import Protected from './components/Protected';
import Layout from './components/Layout';
import { Loading } from './components/UI';
import './styles.css';

const Landing = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Simulator = lazy(() => import('./pages/Simulator'));
const Coverage = lazy(() => import('./pages/Coverage'));
const Claims = lazy(() => import('./pages/Claims'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return <AuthProvider><BrowserRouter><Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} />
    <Route element={<Protected />}><Route element={<Layout />}>
      <Route path="/dashboard" element={<Dashboard />} /><Route path="/simulator" element={<Simulator />} />
      <Route path="/coverage" element={<Coverage />} /><Route path="/claims" element={<Claims />} />
      <Route path="/profile" element={<Profile />} /><Route path="/admin" element={<Protected admin />}><Route index element={<Admin />} /></Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense><Toaster position="top-right" toastOptions={{ duration: 3800 }} /></BrowserRouter></AuthProvider>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
