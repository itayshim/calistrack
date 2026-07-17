import { Navigate, Outlet } from 'react-router-dom';
import { getAdminSession, supabaseConfigured } from '../../services/supabase';

export function AdminGuard() {
  if (!supabaseConfigured) return <Navigate to="/admin/login" replace />;
  return getAdminSession() ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
