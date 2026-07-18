import { ArrowLeft, LogOut, Plus } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/BrandLogo';
import { useI18n } from '../../hooks/useI18n';
import {
  getAdminSession,
  monitorAdminSession,
  onAdminAuthStateChange,
  signOutAdmin,
} from '../../services/supabase';
import { AdminSessionExpiredDialog } from '../../components/AdminSessionExpiredDialog';

export function AdminLayout() {
  const { t } = useI18n();
  const [sessionInvalid, setSessionInvalid] = useState(() => !getAdminSession());
  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setSessionInvalid(false);
      else setSessionInvalid(true);
    });
    const stopMonitoring = monitorAdminSession();
    return () => {
      unsubscribe();
      stopMonitoring();
    };
  }, []);
  if (sessionInvalid) return <AdminSessionExpiredDialog />;
  return (
    <div className="min-h-screen p-4 pb-24 sm:p-8">
      <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link to="/admin/exercises" className="flex items-center gap-3">
          <BrandLogo variant="wordmark" className="h-12 w-44" />
          <strong className="hidden text-sm font-black sm:block">{t('administratorSystem')}</strong>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to="/">
            <ArrowLeft className="directional-icon" size={18} />
            {t('backToApp')}
          </Link>
          <Link className="btn-primary" to="/admin/exercises/new">
            <Plus size={18} />
            {t('newExercise')}
          </Link>
          <button
            className="btn-secondary"
            aria-label={t('logout')}
            onClick={() => {
              signOutAdmin();
            }}
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
