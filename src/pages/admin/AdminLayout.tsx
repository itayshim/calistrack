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
import { AdminSafeAreaShell } from '../../components/AdminSafeAreaShell';

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
  return (
    <AdminSafeAreaShell>
      {sessionInvalid ? (
        <AdminSessionExpiredDialog />
      ) : (
        <>
          <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-start justify-between gap-4">
            <Link to="/admin/exercises" className="flex min-w-0 max-w-full items-center gap-3">
              <BrandLogo variant="wordmark" className="h-12 w-44 max-w-full shrink" />
              <strong className="hidden text-sm font-black sm:block">
                {t('administratorSystem')}
              </strong>
            </Link>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
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
        </>
      )}
    </AdminSafeAreaShell>
  );
}
