import {
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  Home,
  Play,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isTabActive } from '../utils/navigation';
import { useI18n } from '../hooks/useI18n';
import { BrandLogo } from '../components/BrandLogo';
import { OnboardingExperience } from '../features/onboarding/OnboardingExperience';
import type { WorkoutSession } from '../types';

const desktopTabs = [
  ['/', 'home', Home],
  ['/program', 'program', Dumbbell],
  ['/skills', 'skills', Sparkles],
  ['/workout', 'workout', Play],
  ['/progress', 'progress', ChartNoAxesColumnIncreasing],
  ['/settings', 'settings', Settings2],
] as const;
const mobileTabs = desktopTabs.filter(([to]) => to !== '/workout');
export function AppLayout() {
  const activeWorkout = useAppStore((s) => s.activeWorkout),
    restTimer = useAppStore((s) => s.restTimer),
    exercises = useAppStore((s) => s.exercises),
    nav = useNavigate(),
    location = useLocation(),
    { t, direction } = useI18n();
  const active = getRecoverableActiveWorkout(activeWorkout);
  const workoutPath = active ? `/workout/${active.id}` : '/program';
  const isWorkoutRunner = /^\/workout\/[^/]+\/?$/.test(location.pathname);
  return (
    <div className="min-h-screen md:flex" dir={direction}>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[17rem] border-e border-slate-200/80 bg-white/95 px-5 py-7 text-slate-950 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink/95 dark:text-white md:flex md:flex-col">
        <button onClick={() => nav('/')} className="mb-10 flex items-center gap-3 px-2 text-start">
          <BrandLogo variant="wordmark" className="h-14 w-[13.5rem]" />
          <span className="sr-only">{t('brandTagline')}</span>
        </button>
        <nav className="space-y-2">
          {desktopTabs.map(([to, labelKey, Icon]) => {
            const destination = to === '/workout' ? workoutPath : to;
            return (
              <Link
                key={to}
                to={destination}
                data-tour-id={`nav-${labelKey}`}
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
          <p className="text-xs font-black uppercase tracking-widest opacity-60">{t('ready')}</p>
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
      <main
        className="app-shell-main mx-auto w-full max-w-[78rem] px-4 sm:px-6 md:ms-[17rem] md:px-10 md:pb-12 md:pt-8"
      >
        <header className="mb-7 flex items-center justify-between md:hidden">
          <button onClick={() => nav('/')} className="flex items-center gap-2">
            <BrandLogo variant="wordmark" className="h-11 w-[10.5rem]" />
          </button>
        </header>
        {active && !isWorkoutRunner && (
          <ActiveWorkoutBanner
            active={active}
            language={direction === 'rtl' ? 'he' : 'en'}
            exerciseName={(() => { const exercise = exercises.find((item) => item.id === active.exercises[active.currentExerciseIndex]?.exerciseId); return exercise ? (direction === 'rtl' ? exercise.nameHe : exercise.nameEn) : undefined; })()}
            restTimer={restTimer}
          />
        )}
        <Outlet />
      </main>
      {!isWorkoutRunner && <nav
        aria-label={t('mainNavigation')}
        className="mobile-bottom-nav fixed z-30 grid grid-cols-5 border-t border-slate-200/80 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.06)] dark:border-white/[.08] dark:bg-panel dark:shadow-[0_-4px_18px_rgba(0,0,0,0.24)] md:hidden"
      >
        {mobileTabs.map(([to, labelKey, Icon]) => {
          const destination = to;
          return (
            <Link
              key={to}
              to={destination}
              data-tour-id={`nav-${labelKey}`}
              aria-label={t(labelKey)}
              aria-current={isTabActive(to, location.pathname) ? 'page' : undefined}
              className={`relative flex min-h-[3.7rem] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-extrabold transition ${
                isTabActive(to, location.pathname)
                  ? 'bg-brand/15 text-lime-700 dark:bg-white/[.07] dark:text-brand'
                  : 'text-slate-500'
              }`}
            >
              <Icon size={21} strokeWidth={2.3} />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>}
      <OnboardingExperience />
    </div>
  );
}

function getRecoverableActiveWorkout(active: WorkoutSession | null) {
  if (
    !active ||
    active.status !== 'active' ||
    active.skillLink?.preview ||
    active.managedProgramLink?.preview
  ) return null;
  if (!active.id || active.exercises.length === 0) return null;
  if (active.currentExerciseIndex < 0 || active.currentExerciseIndex >= active.exercises.length) return null;
  return active;
}

function ActiveWorkoutBanner({ active, language, exerciseName, restTimer }: {
  active: WorkoutSession;
  language: 'en' | 'he';
  exerciseName?: string;
  restTimer: ReturnType<typeof useAppStore.getState>['restTimer'];
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!restTimer.endsAt) return;
    const refresh = () => setNow(Date.now());
    const first = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [restTimer.endsAt]);
  const current = active.exercises[active.currentExerciseIndex];
  const targetSets = current.target?.targetSets;
  const nextSet = Math.min(current.sets.length + 1, targetSets ?? current.sets.length + 1);
  const restSeconds = restTimer.pausedRemaining ?? (restTimer.endsAt ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000)) : null);
  const warmup = active.skillWarmup?.status === 'in-progress';
  const phase = warmup
    ? (language === 'he' ? 'חימום' : 'Warm-up')
    : restSeconds !== null
    ? (language === 'he' ? `מנוחה · ${restSeconds} שנ׳` : `Resting · ${restSeconds}s`)
    : targetSets
      ? (language === 'he' ? `סט ${nextSet} מתוך ${targetSets}` : `Set ${nextSet} of ${targetSets}`)
      : (language === 'he' ? `תרגיל ${active.currentExerciseIndex + 1} מתוך ${active.exercises.length}` : `Exercise ${active.currentExerciseIndex + 1} of ${active.exercises.length}`);
  const title = language === 'he' ? 'אימון פעיל' : 'Workout in progress';
  const resume = language === 'he' ? 'חזרה לאימון' : 'Resume';
  return <Link to={`/workout/${active.id}`} data-testid="active-workout-return" className="active-workout-banner mb-6 flex min-h-16 items-center gap-3 rounded-2xl border border-brand/35 bg-brand/10 p-3 text-start shadow-sm hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={`${title}: ${active.workoutName}. ${exerciseName ?? phase}. ${resume}`}>
    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-ink" aria-hidden="true"><Play size={18} fill="currentColor" /><span className="absolute -top-1 -end-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-panel" /></span>
    <span className="min-w-0 flex-1"><span className="block text-xs font-black uppercase tracking-[0.12em] text-lime-700 dark:text-brand">{title}</span><span className="block truncate font-black">{active.workoutName}{exerciseName ? ` · ${exerciseName}` : ''}</span><span className="block text-sm text-slate-600 dark:text-slate-300">{phase}</span></span>
    <span className="shrink-0 rounded-xl bg-brand px-3 py-2 text-sm font-black text-ink">{resume}</span>
  </Link>;
}
