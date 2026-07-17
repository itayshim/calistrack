import {
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  Home,
  Play,
  Settings2,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { isTabActive } from '../utils/navigation';
import { useI18n } from '../hooks/useI18n';
import { BrandLogo } from '../components/BrandLogo';

const tabs = [
  ['/', 'home', Home],
  ['/program', 'program', Dumbbell],
  ['/workout', 'workout', Play],
  ['/progress', 'progress', ChartNoAxesColumnIncreasing],
  ['/settings', 'settings', Settings2],
] as const;
export function AppLayout() {
  const active = useAppStore((s) => s.activeWorkout),
    nav = useNavigate(),
    location = useLocation(),
    { t, direction } = useI18n();
  const workoutPath = active ? `/workout/${active.id}` : '/program';
  return (
    <div className="min-h-screen md:flex" dir={direction}>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[17rem] border-e border-slate-200/80 bg-white/95 px-5 py-7 text-slate-950 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink/95 dark:text-white md:flex md:flex-col">
        <button onClick={() => nav('/')} className="mb-10 flex items-center gap-3 px-2 text-start">
          <BrandLogo variant="wordmark" className="h-14 w-[13.5rem]" />
          <span className="sr-only">{t('brandTagline')}</span>
        </button>
        <nav className="space-y-2">
          {tabs.map(([to, labelKey, Icon]) => {
            const destination = to === '/workout' ? workoutPath : to;
            return (
              <Link
                key={to}
                to={destination}
                aria-current={isTabActive(to, location.pathname) ? 'page' : undefined}
                className={`flex min-h-14 items-center gap-4 rounded-2xl px-4 font-extrabold transition ${
                  isTabActive(to, location.pathname)
                    ? 'bg-slate-100 text-slate-950 dark:bg-white/[.08] dark:text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[.04] dark:hover:text-white'
                }`}
              >
                <Icon size={21} />
                {t(labelKey)}
                {to === '/workout' && active && (
                  <span className="ms-auto h-2 w-2 rounded-full bg-brand shadow-[0_0_12px_#b7f36b]" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-3xl bg-brand p-5 text-ink">
          <p className="text-xs font-black uppercase tracking-widest opacity-60">
            {t('ready')}
          </p>
          <p className="mt-1 text-lg font-black">{t('nextSet')}</p>
          <button
            onClick={() => nav(workoutPath)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-black text-white"
          >
            <Play size={18} fill="currentColor" />
            {active ? t('resume') : t('startWorkout')}
          </button>
        </div>
      </aside>
      <main className="app-shell-main mx-auto w-full max-w-[78rem] px-4 pb-28 sm:px-6 md:ms-[17rem] md:px-10 md:pb-12 md:pt-8">
        <header className="mb-7 flex items-center justify-between md:hidden">
          <button onClick={() => nav('/')} className="flex items-center gap-2">
            <BrandLogo variant="wordmark" className="h-11 w-[10.5rem]" />
          </button>
          {active && (
            <button
              onClick={() => nav(workoutPath)}
              className="flex items-center gap-2 rounded-full bg-brand/15 px-3 py-2 text-xs font-black text-brand"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              {t('live')}
            </button>
          )}
        </header>
        <Outlet />
      </main>
      <nav
        aria-label={t('mainNavigation')}
        className="mobile-bottom-nav fixed inset-x-3 z-30 grid grid-cols-5 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl dark:border-white/[.08] dark:bg-panel/95 dark:shadow-soft md:hidden"
      >
        {tabs.map(([to, labelKey, Icon]) => {
          const destination = to === '/workout' ? workoutPath : to;
          return (
            <Link
              key={to}
              to={destination}
              aria-label={t(labelKey)}
              aria-current={isTabActive(to, location.pathname) ? 'page' : undefined}
              className={`relative flex min-h-[3.7rem] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-extrabold transition ${
                isTabActive(to, location.pathname) ? 'bg-brand/15 text-lime-700 dark:bg-white/[.07] dark:text-brand' : 'text-slate-500'
              }`}
            >
              <Icon size={to === '/workout' ? 24 : 21} strokeWidth={2.3} />
              {t(labelKey)}
              {to === '/workout' && active && (
                <span className="absolute end-3 top-2 h-2 w-2 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
