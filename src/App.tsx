import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toast } from './components/Toast';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { AppLayout } from './layouts/AppLayout';
import { useAppStore } from './store/useAppStore';
import { loadGlobalContent } from './services/globalContent';
import { AdminGuard } from './features/admin/AdminGuard';
import { translations } from './locales/translations';
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage').then((module) => ({ default: module.ExerciseDetailPage })));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage').then((module) => ({ default: module.ExercisesPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })));
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage').then((module) => ({ default: module.HistoryDetailPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const ProgramEditorPage = lazy(() => import('./pages/ProgramEditorPage').then((module) => ({ default: module.ProgramEditorPage })));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage').then((module) => ({ default: module.ProgramsPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const WorkoutPage = lazy(() => import('./pages/WorkoutPage').then((module) => ({ default: module.WorkoutPage })));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminExercisesPage = lazy(() => import('./pages/admin/AdminExercisesPage').then((module) => ({ default: module.AdminExercisesPage })));
const AdminExerciseEditorPage = lazy(() => import('./pages/admin/AdminExerciseEditorPage').then((module) => ({ default: module.AdminExerciseEditorPage })));
export default function App() {
  const hydrate = useAppStore((s) => s.hydrate),
    hydrated = useAppStore((s) => s.hydrated),
    theme = useAppStore((s) => s.settings.theme),
    timer = useAppStore((s) => s.restTimer),
    settings = useAppStore((s) => s.settings),
    skip = useAppStore((s) => s.skipTimer);
  const setSharedExercises = useAppStore((s) => s.setSharedExercises);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = settings.language ?? 'en';
    document.documentElement.dir = settings.language === 'he' ? 'rtl' : 'ltr';
  }, [theme, settings.language]);
  useEffect(() => {
    if (!timer.endsAt) return;
    const wait = timer.endsAt - Date.now();
    if (wait <= 0) {
      skip();
      return;
    }
    const id = setTimeout(() => {
      useAppStore.getState().setToast(translations[settings.language].restFinished);
      if (settings.restTimerVibration && navigator.vibrate) navigator.vibrate([150, 80, 150]);
      if (settings.restTimerSound) {
        const ctx = new AudioContext(),
          osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
      skip();
    }, wait);
    return () => clearTimeout(id);
  }, [timer.endsAt, settings.language, settings.restTimerSound, settings.restTimerVibration, skip]);
  useEffect(() => {
    if (!hydrated) return;
    loadGlobalContent(useAppStore.getState().exercises).then(({ exercises, stale }) => {
      setSharedExercises(exercises);
      if (stale) useAppStore.getState().setToast(translations[settings.language].offlineContent);
    });
  }, [hydrated, setSharedExercises, settings.language]);
  if (!hydrated)
    return <div className="grid min-h-screen place-items-center">{translations[settings.language].loadingWorkouts}</div>;
  return (
    <>
      <Suspense fallback={<div className="grid min-h-[50vh] place-items-center">{translations[settings.language].loading}</div>}>
      <Routes>
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminGuard />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="exercises" replace />} />
            <Route path="exercises" element={<AdminExercisesPage />} />
            <Route path="exercises/:exerciseId" element={<AdminExerciseEditorPage />} />
            <Route path="media" element={<Navigate to="../exercises" replace />} />
          </Route>
        </Route>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="program" element={<ProgramsPage />} />
          <Route path="program/new" element={<ProgramEditorPage />} />
          <Route path="program/:id" element={<ProgramEditorPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="workout/:id" element={<WorkoutPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<HistoryDetailPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
      </Suspense>
      <Toast />
      <PwaUpdatePrompt />
    </>
  );
}
