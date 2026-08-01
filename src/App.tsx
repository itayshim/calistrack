import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toast } from './components/Toast';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { AppLayout } from './layouts/AppLayout';
import { useAppStore } from './store/useAppStore';
import { loadGlobalContent } from './services/globalContent';
import { AdminGuard } from './features/admin/AdminGuard';
import { translations } from './locales/translations';
import { restAlertService } from './services/restAlert';
import { backgroundNotificationService } from './services/backgroundNotifications';
import { canHandleForegroundCompletion } from './services/foregroundCompletion';
import { validateFrontLeverContent } from './features/skills/frontLever';
const notificationClientId = crypto.randomUUID();
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
const SkillsPage = lazy(() => import('./pages/SkillsPage').then((module) => ({ default: module.SkillsPage })));
const FrontLeverSkillPage = lazy(() => import('./pages/FrontLeverSkillPage').then((module) => ({ default: module.FrontLeverSkillPage })));
const FrontLeverLevelPage = lazy(() => import('./pages/FrontLeverLevelPage').then((module) => ({ default: module.FrontLeverLevelPage })));
const FrontLeverHistoryPage = lazy(() => import('./pages/FrontLeverHistoryPage').then((module) => ({ default: module.FrontLeverHistoryPage })));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminExercisesPage = lazy(() => import('./pages/admin/AdminExercisesPage').then((module) => ({ default: module.AdminExercisesPage })));
const AdminExerciseEditorPage = lazy(() => import('./pages/admin/AdminExerciseEditorPage').then((module) => ({ default: module.AdminExerciseEditorPage })));
const AdminSkillQaPage = lazy(() => import('./pages/admin/AdminSkillQaPage').then((module) => ({ default: module.AdminSkillQaPage })));
export default function App() {
  const hydrate = useAppStore((s) => s.hydrate),
    hydrated = useAppStore((s) => s.hydrated),
    theme = useAppStore((s) => s.settings.theme),
    timer = useAppStore((s) => s.restTimer),
    settings = useAppStore((s) => s.settings),
    completeRestTimer = useAppStore((s) => s.completeRestTimer);
  const setSharedExercises = useAppStore((s) => s.setSharedExercises);
  const naturallyCompletedRestIds = useRef(new Set<string>());
  const previousRestTimer = useRef({ id: null as string | null, endsAt: null as number | null });
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = settings.language ?? 'en';
    document.documentElement.dir = settings.language === 'he' ? 'rtl' : 'ltr';
    const favicon = document.querySelector<HTMLLinkElement>('#theme-favicon');
    if (favicon) favicon.href = `/brand/calistrack-mark-${theme}.svg`;
  }, [theme, settings.language]);
  useEffect(() => {
    if (!timer.endsAt || !timer.id) return;
    const completionId = timer.id;
    const endsAt = timer.endsAt;
    let inactiveSince =
      document.visibilityState !== 'visible' || !document.hasFocus() ? Date.now() : null;
    let inactiveAtDeadline = endsAt <= Date.now();
    const recordInactive = () => {
      if (inactiveSince === null) inactiveSince = Date.now();
    };
    const recordActive = () => {
      if (inactiveSince !== null && inactiveSince <= endsAt && Date.now() >= endsAt) {
        inactiveAtDeadline = true;
      }
      inactiveSince = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) recordActive();
      else recordInactive();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', recordActive);
    window.addEventListener('blur', recordInactive);
    const finish = () => {
      const wasInactiveAtDeadline =
        inactiveAtDeadline || (inactiveSince !== null && inactiveSince <= endsAt);
      const foreground = canHandleForegroundCompletion({
        expectedCompletionId: completionId,
        activeCompletionId: useAppStore.getState().restTimer.id,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
        inactiveAtDeadline: wasInactiveAtDeadline,
      });
      naturallyCompletedRestIds.current.add(completionId);
      if (!completeRestTimer(completionId)) {
        naturallyCompletedRestIds.current.delete(completionId);
        return;
      }
      const currentSettings = useAppStore.getState().settings;
      if (!foreground) return;
      useAppStore.getState().setToast(translations[currentSettings.language].restFinished);
      void restAlertService.play({
        soundId: currentSettings.restCompletionSound,
        repeatCount: currentSettings.restAlertRepeatCount,
        vibrationEnabled: currentSettings.restTimerVibration,
      }).catch(() => {
        // The visual and live-region completion state remains available when audio is blocked.
      });
      if (currentSettings.backgroundTimerNotifications) {
        void backgroundNotificationService.markForegroundCompletionHandled({
          completionId,
          handledAt: new Date().toISOString(),
          clientId: notificationClientId,
          visibilityState: 'visible',
          hasFocus: true,
        });
      }
    };
    const wait = timer.endsAt - Date.now();
    if (wait <= 0) {
      finish();
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', recordActive);
        window.removeEventListener('blur', recordInactive);
      };
    }
    const id = setTimeout(finish, wait);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', recordActive);
      window.removeEventListener('blur', recordInactive);
    };
  }, [completeRestTimer, timer.endsAt, timer.id]);
  useEffect(() => {
    if (!hydrated || !settings.backgroundTimerNotifications) return;
    const previous = previousRestTimer.current;
    previousRestTimer.current = { id: timer.id, endsAt: timer.endsAt };
    if (timer.id && timer.endsAt) {
      void backgroundNotificationService.sync(
        timer,
        useAppStore.getState().activeWorkout?.id,
        settings.language,
      );
      return;
    }
    if (previous.id && (timer.id === null || timer.id === previous.id)) {
      if (naturallyCompletedRestIds.current.delete(previous.id)) return;
      void backgroundNotificationService.cancel(
        previous.id,
        timer.id ? 'rest_paused' : 'rest_cancelled',
      );
    }
  }, [
    hydrated,
    settings.backgroundTimerNotifications,
    settings.language,
    timer,
  ]);
  useEffect(() => {
    if (!hydrated) return;
    const reconcile = async () => {
      const registration = await backgroundNotificationService.reconcile();
      const enabled = registration.status === 'enabled';
      const current = useAppStore.getState();
      if (current.settings.backgroundTimerNotifications !== enabled) {
        current.setSettings({ ...current.settings, backgroundTimerNotifications: enabled });
      }
    };
    const onResume = () => {
      if (document.visibilityState === 'visible') void reconcile();
    };
    void reconcile();
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    loadGlobalContent(useAppStore.getState().exercises).then(({ exercises, stale }) => {
      if (import.meta.env.DEV) {
        const validation = validateFrontLeverContent(exercises);
        if (!validation.valid) console.error('[skill-content-validation]', validation.blockingErrors.map(({ code, levelKey, exerciseKey }) => ({ code, levelKey, exerciseKey })));
      }
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
            <Route path="exercises/new" element={<AdminExerciseEditorPage />} />
            <Route path="exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
            <Route path="media" element={<Navigate to="../exercises" replace />} />
            <Route path="skills" element={<AdminSkillQaPage />} />
            <Route path="skills/front-lever" element={<AdminSkillQaPage />} />
            <Route path="skills/front-lever/test/:levelKey" element={<WorkoutPage />} />
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
          <Route path="skills" element={<SkillsPage />} />
          <Route path="skills/front-lever" element={<FrontLeverSkillPage />} />
          <Route path="skills/front-lever/levels/:levelKey" element={<FrontLeverLevelPage />} />
          <Route path="skills/front-lever/assessment" element={<FrontLeverSkillPage />} />
          <Route path="skills/front-lever/history" element={<FrontLeverHistoryPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
      </Suspense>
      <Toast />
      <PwaUpdatePrompt />
    </>
  );
}
