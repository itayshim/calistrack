import { ArrowLeft, LogOut, Plus } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/BrandLogo';
import { useI18n } from '../../hooks/useI18n';
import { signOutAdmin } from '../../services/supabase';

export function AdminLayout() {
  const { t } = useI18n();
  const navigate = useNavigate();
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
              navigate('/admin/login');
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
