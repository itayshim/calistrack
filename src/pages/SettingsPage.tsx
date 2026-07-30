import { BellRing, CircleHelp, Download, Play, RotateCcw, ShieldCheck, Upload, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { storageService } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
import { getAdminSession } from '../services/supabase';
import { Select } from '../components/SelectMenu';
import { REST_SOUND_REGISTRY } from '../services/restSounds';
import { restAlertService } from '../services/restAlert';
import type { RestAlertRepeatCount, RestSoundId, UserSettings } from '../types';
import {
  backgroundNotificationService,
  getPushSupport,
  type PushRegistrationState,
} from '../services/backgroundNotifications';
export function SettingsPage() {
  const store = useAppStore(),
    [settings, setSettings] = useState(store.settings),
    [reset, setReset] = useState(false),
    [pending, setPending] = useState<ReturnType<typeof storageService.importData> | null>(null),
    [notificationState, setNotificationState] = useState<PushRegistrationState>(() => {
      const support = getPushSupport();
      return {
        status: support.supported ? 'permission-default' : 'unsupported',
        permission: support.permission,
        browserSubscription: false,
        backendRegistration: false,
      };
    }),
    [customAdjustment, setCustomAdjustment] = useState(
      ![0, 2, 3, 5].includes(store.settings.timerReactionAdjustmentSeconds),
    ),
    file = useRef<HTMLInputElement>(null),
    { t } = useI18n(),
    adminSession = getAdminSession();
  const requestOnboardingReplay = useAppStore((state) => state.requestOnboardingReplay);
  const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted);
  const applySettings = (patch: Partial<UserSettings>) => {
    const next = { ...useAppStore.getState().settings, ...patch };
    setSettings((current) => ({ ...current, ...patch }));
    store.setSettings(next);
  };
  const reconcileNotifications = useCallback(async () => {
    const reconciled = await backgroundNotificationService.reconcile();
    setNotificationState(reconciled);
    const enabled = reconciled.status === 'enabled';
    if (useAppStore.getState().settings.backgroundTimerNotifications !== enabled) {
      const next = { ...useAppStore.getState().settings, backgroundTimerNotifications: enabled };
      setSettings((current) => ({ ...current, backgroundTimerNotifications: enabled }));
      useAppStore.getState().setSettings(next);
    }
  }, []);
  const previewSound = async (soundId: RestSoundId) => {
    try {
      await restAlertService.preview(soundId);
    } catch {
      store.setToast(t('audioPlaybackBlocked'));
    }
  };
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);
  useEffect(() => {
    queueMicrotask(() => void reconcileNotifications());
    const onResume = () => {
      if (document.visibilityState === 'visible') void reconcileNotifications();
    };
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [reconcileNotifications]);
  const exportFile = () => {
    const blob = new Blob(
      [
        storageService.exportData({
          schemaVersion: store.schemaVersion,
          exercises: store.exercises,
          programs: store.programs,
          activeProgramId: store.activeProgramId,
          workoutSessions: store.workoutSessions,
          activeWorkout: store.activeWorkout,
          settings: store.settings,
          goals: store.goals,
          restTimer: store.restTimer,
          exerciseStopwatch: store.exerciseStopwatch,
        }),
      ],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `calistrack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try {
      setPending(storageService.importData(await f.text()));
    } catch {
      store.setToast(t('importFailed'));
    }
  };
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('settingsEyebrow')}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('settings')}</h1>
        <p className="mt-2 text-slate-400">{t('settingsSubtitle')}</p>
      </header>
      <section data-tour-id="settings-preferences" className="card max-w-2xl space-y-5">
        <fieldset>
          <legend className="label">{t('language')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['en', 'he'] as const).map((language) => (
              <button
                type="button"
                key={language}
                aria-pressed={settings.language === language}
                className={`min-h-12 rounded-2xl font-black ${
                  settings.language === language ? 'bg-brand text-ink' : 'bg-slate-100 text-slate-600 dark:bg-white/[.06] dark:text-slate-300'
                }`}
                onClick={() => {
                  applySettings({ language });
                }}
              >
                {language === 'en' ? t('english') : t('hebrew')}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <span className="label">{t('weeklyWorkoutTarget')}</span>
          <input
            className="field"
            type="number"
            min="1"
            max="14"
            value={settings.weeklyWorkoutGoal}
            onChange={(e) => setSettings({ ...settings, weeklyWorkoutGoal: +e.target.value })}
          />
        </label>
        <label>
          <span className="label">{t('defaultRestSeconds')}</span>
          <input
            className="field"
            type="number"
            min="10"
            value={settings.defaultRestSeconds}
            onChange={(e) => setSettings({ ...settings, defaultRestSeconds: +e.target.value })}
          />
        </label>
        <div data-tour-id="settings-theme-preference">
          <Select
            label={t('theme')}
            value={settings.theme}
            onChange={(theme) => setSettings({ ...settings, theme: theme as 'dark' | 'light' })}
            options={[{ value: 'dark', label: t('dark') }, { value: 'light', label: t('light') }]}
          />
        </div>
        <section aria-labelledby="rest-alerts-heading" className="surface-subtle space-y-4 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
              <Volume2 aria-hidden="true" />
            </span>
            <h2 id="rest-alerts-heading" className="text-xl font-black">{t('restTimerAlerts')}</h2>
          </div>
          <Select
            label={t('restCompletionSound')}
            value={settings.restCompletionSound}
            onChange={(value) => {
              const restCompletionSound = value as RestSoundId;
              applySettings({ restCompletionSound });
              void previewSound(restCompletionSound);
            }}
            options={REST_SOUND_REGISTRY.map((sound) => ({
              value: sound.id,
              label: t(sound.nameKey),
              description: t(sound.descriptionKey),
            }))}
            testId="rest-sound-select"
          />
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={() => void previewSound(settings.restCompletionSound)}
          >
            <Play size={18} aria-hidden="true" />
            {t('previewSound')}
          </button>
          <Select
            label={t('repeatAlert')}
            value={String(settings.restAlertRepeatCount)}
            onChange={(value) =>
              applySettings({ restAlertRepeatCount: Number(value) as RestAlertRepeatCount })
            }
            options={[
              { value: '1', label: t('repeatOnce') },
              { value: '2', label: t('repeatTwice') },
              { value: '3', label: t('repeatThreeTimes') },
            ]}
            testId="rest-repeat-select"
          />
          <Toggle
            label={t('restTimerVibration')}
            description={t('vibrationSupportNote')}
            checked={settings.restTimerVibration}
            set={(restTimerVibration) => applySettings({ restTimerVibration })}
          />
          <div className="surface-subtle rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-black">{t('backgroundTimerNotifications')}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {t('backgroundTimerNotificationsDescription')}
                </p>
                <p className="mt-2 text-sm font-bold" role="status">
                  {notificationState.status === 'enabled'
                    ? t('notificationPermissionGranted')
                    : notificationState.status === 'permission-denied'
                      ? t('notificationPermissionDenied')
                      : notificationState.status === 'unsupported'
                        ? t('notificationPermissionUnsupported')
                        : notificationState.status === 'device-unregistered'
                          ? t('notificationDeviceNotRegistered')
                          : notificationState.status === 'server-unregistered'
                            ? t('notificationRegistrationFailed')
                            : notificationState.status === 'error'
                              ? t('notificationRegistrationFailed')
                              : notificationState.status === 'enabling'
                                ? t('notificationEnabling')
                                : notificationState.status === 'disabling'
                                  ? t('notificationDisabling')
                                  : t('notificationsDisabled')}
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full sm:w-auto"
                  disabled={['unsupported', 'enabling', 'disabling'].includes(notificationState.status)}
                  onClick={async () => {
                    if (notificationState.status === 'enabled') {
                      setNotificationState((current) => ({ ...current, status: 'disabling' }));
                      const disabled = await backgroundNotificationService.disable();
                      setNotificationState(disabled);
                      applySettings({ backgroundTimerNotifications: false });
                      return;
                    }
                    setNotificationState((current) => ({ ...current, status: 'enabling' }));
                    const enabled = await backgroundNotificationService.enable();
                    setNotificationState(enabled);
                    applySettings({ backgroundTimerNotifications: enabled.status === 'enabled' });
                    if (enabled.status === 'error' || enabled.status === 'server-unregistered') {
                      store.setToast(t('notificationSetupFailed'));
                    }
                  }}
                >
                  {notificationState.status === 'enabled'
                    ? t('disableNotifications')
                    : notificationState.status === 'device-unregistered'
                      ? t('registerThisDevice')
                      : notificationState.status === 'error' ||
                          notificationState.status === 'server-unregistered'
                        ? t('tryAgain')
                        : notificationState.status === 'enabling'
                          ? t('notificationEnabling')
                          : notificationState.status === 'disabling'
                            ? t('notificationDisabling')
                            : t('enableNotifications')}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="surface-subtle space-y-4 rounded-3xl p-4 sm:p-5">
          <h2 className="text-xl font-black">{t('durationStopwatch')}</h2>
          <Select
            label={t('timerReactionAdjustment')}
            value={
              customAdjustment ? 'custom' : String(settings.timerReactionAdjustmentSeconds)
            }
            onChange={(value) => {
              if (value === 'custom') {
                setCustomAdjustment(true);
                return;
              }
              setCustomAdjustment(false);
              applySettings({ timerReactionAdjustmentSeconds: Number(value) });
            }}
            options={[
              { value: '0', label: t('noAdjustment') },
              { value: '2', label: `2 ${t('seconds')}` },
              { value: '3', label: `3 ${t('seconds')}` },
              { value: '5', label: `5 ${t('seconds')}` },
              { value: 'custom', label: t('customAdjustment') },
            ]}
          />
          {customAdjustment && (
            <label>
              <span className="label">{t('customAdjustment')}</span>
              <input
                className="field"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={settings.timerReactionAdjustmentSeconds}
                onChange={(event) =>
                  applySettings({
                    timerReactionAdjustmentSeconds: Math.max(0, Number(event.target.value)),
                  })
                }
              />
            </label>
          )}
          <p className="-mt-2 text-sm text-slate-500">
            {t('timerReactionAdjustmentDescription')}
          </p>
          <Select
            label={t('timedExerciseStartCountdown')}
            value={String(settings.timedExerciseStartCountdownSeconds)}
            onChange={(value) =>
              applySettings({
                timedExerciseStartCountdownSeconds: Number(value) as 0 | 3 | 5,
              })
            }
            options={[
              { value: '0', label: t('countdownOff') },
              { value: '3', label: `3 ${t('seconds')}` },
              { value: '5', label: `5 ${t('seconds')}` },
            ]}
          />
        </section>
        <Toggle
          label={t('allowEmptyNumericFields')}
          description={t('allowEmptyNumericFieldsDescription')}
          checked={settings.allowEmptyNumericFields}
          set={(v) => {
            applySettings({ allowEmptyNumericFields: v });
          }}
        />
        <button
          className="btn-primary w-full"
          onClick={() =>
            store.setSettings({
              ...settings,
              onboardingCompleted: useAppStore.getState().settings.onboardingCompleted,
            })
          }
        >
          {t('saveSettings')}
        </button>
      </section>
      <section data-tour-id="settings-help" className="card max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
            <CircleHelp aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">{t('help')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('tutorialHelpDescription')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={requestOnboardingReplay}>
                <Play size={18} fill="currentColor" />
                {t('replayTutorial')}
              </button>
              <button className="btn-secondary" onClick={() => setOnboardingCompleted(false)}>
                <RotateCcw size={18} />
                {t('resetOnboarding')}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section data-admin-entry className="card max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">{t('administration')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('administrationDescription')}</p>
            <Link className="btn-secondary mt-4 w-full sm:w-auto" to={adminSession ? '/admin' : '/admin/login'}>
              {adminSession ? t('openAdmin') : t('adminSignIn')}
            </Link>
          </div>
        </div>
      </section>
      <section className="card max-w-2xl">
        <p className="eyebrow">{t('backupControl')}</p>
        <h2 className="mt-2 text-2xl font-black">{t('myData')}</h2>
        <p className="my-2 text-slate-400">{t('exportDescription')}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportFile}>
            <Download />
            {t('exportJson')}
          </button>
          <button className="btn-secondary" onClick={() => file.current?.click()}>
            <Upload />
            {t('importJson')}
          </button>
          <input
            ref={file}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          <button className="btn-danger" onClick={() => setReset(true)}>
            <RotateCcw />
            {t('resetApplication')}
          </button>
        </div>
      </section>
      <ConfirmDialog
        open={!!pending}
        title={t('replaceAllData')}
        description={t('replaceAllDataDescription')}
        onClose={() => setPending(null)}
        onConfirm={() => pending && store.importData(pending)}
      />
      <ConfirmDialog
        open={reset}
        title={t('resetAllData')}
        description={t('resetAllDataDescription')}
        onClose={() => setReset(false)}
        onConfirm={store.reset}
      />
    </div>
  );
}
function Toggle({
  label,
  description,
  checked,
  set,
}: {
  label: string;
  description?: string;
  checked: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <label className="surface-subtle flex min-h-16 items-center justify-between rounded-2xl px-4">
      <span className="pe-4">
        <span className="block font-bold">{label}</span>
        {description && <span className="mt-1 block text-sm leading-relaxed text-slate-500">{description}</span>}
      </span>
      <input
        aria-label={label}
        className="h-5 w-5 accent-brand"
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
      />
    </label>
  );
}
