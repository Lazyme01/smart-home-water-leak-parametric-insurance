import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loading } from './UI';

export default function Protected({ admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
