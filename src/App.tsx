import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toast } from './components/Toast';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { GoalsPage } from './pages/GoalsPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgramEditorPage } from './pages/ProgramEditorPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { useAppStore } from './store/useAppStore';
export default function App() {
  const hydrate = useAppStore((s) => s.hydrate),
    hydrated = useAppStore((s) => s.hydrated),
    theme = useAppStore((s) => s.settings.theme),
    timer = useAppStore((s) => s.restTimer),
    settings = useAppStore((s) => s.settings),
    skip = useAppStore((s) => s.skipTimer);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  useEffect(() => {
    if (!timer.endsAt) return;
    const wait = timer.endsAt - Date.now();
    if (wait <= 0) {
      skip();
      return;
    }
    const id = setTimeout(() => {
      useAppStore.getState().setToast('Rest time is over — ready for the next set');
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
  }, [timer.endsAt, settings.restTimerSound, settings.restTimerVibration, skip]);
  if (!hydrated)
    return <div className="grid min-h-screen place-items-center">Loading your workouts…</div>;
  return (
    <>
      <Routes>
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
      <Toast />
      <PwaUpdatePrompt />
    </>
  );
}
