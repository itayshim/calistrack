import { Download, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { storageService } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
import { getAdminSession } from '../services/supabase';
import { Select } from '../components/SelectMenu';
export function SettingsPage() {
  const store = useAppStore(),
    [settings, setSettings] = useState(store.settings),
    [reset, setReset] = useState(false),
    [pending, setPending] = useState<ReturnType<typeof storageService.importData> | null>(null),
    file = useRef<HTMLInputElement>(null),
    { t } = useI18n(),
    adminSession = getAdminSession();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);
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
      <section className="card max-w-2xl space-y-5">
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
                  const next = { ...settings, language };
                  setSettings(next);
                  store.setSettings(next);
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
        <Select
          label={t('theme')}
          value={settings.theme}
          onChange={(theme) => setSettings({ ...settings, theme: theme as 'dark' | 'light' })}
          options={[{ value: 'dark', label: t('dark') }, { value: 'light', label: t('light') }]}
        />
        <Toggle
          label={t('restTimerSound')}
          checked={settings.restTimerSound}
          set={(v) => setSettings({ ...settings, restTimerSound: v })}
        />
        <Toggle
          label={t('restTimerVibration')}
          checked={settings.restTimerVibration}
          set={(v) => setSettings({ ...settings, restTimerVibration: v })}
        />
        <Toggle
          label={t('allowEmptyNumericFields')}
          description={t('allowEmptyNumericFieldsDescription')}
          checked={settings.allowEmptyNumericFields}
          set={(v) => {
            const next = { ...settings, allowEmptyNumericFields: v };
            setSettings(next);
            store.setSettings(next);
          }}
        />
        <button className="btn-primary w-full" onClick={() => store.setSettings(settings)}>
          {t('saveSettings')}
        </button>
      </section>
      <section className="card max-w-2xl">
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
