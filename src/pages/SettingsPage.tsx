import { Download, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { storageService } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
export function SettingsPage() {
  const store = useAppStore(),
    [settings, setSettings] = useState(store.settings),
    [reset, setReset] = useState(false),
    [pending, setPending] = useState<ReturnType<typeof storageService.importData> | null>(null),
    file = useRef<HTMLInputElement>(null);
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
    } catch (e) {
      store.setToast(e instanceof Error ? `Import failed: ${e.message}` : 'Import failed');
    }
  };
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">Settings</h1>
        <p className="mt-2 text-slate-400">Tune CalisTrack to the way you train.</p>
      </header>
      <section className="card max-w-2xl space-y-5">
        <label>
          <span className="label">Weekly workout target</span>
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
          <span className="label">Default rest (seconds)</span>
          <input
            className="field"
            type="number"
            min="10"
            value={settings.defaultRestSeconds}
            onChange={(e) => setSettings({ ...settings, defaultRestSeconds: +e.target.value })}
          />
        </label>
        <label>
          <span className="label">Theme</span>
          <select
            className="field"
            value={settings.theme}
            onChange={(e) =>
              setSettings({ ...settings, theme: e.target.value as 'dark' | 'light' })
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <Toggle
          label="Rest timer sound"
          checked={settings.restTimerSound}
          set={(v) => setSettings({ ...settings, restTimerSound: v })}
        />
        <Toggle
          label="Vibration when rest ends (if supported)"
          checked={settings.restTimerVibration}
          set={(v) => setSettings({ ...settings, restTimerVibration: v })}
        />
        <button className="btn-primary w-full" onClick={() => store.setSettings(settings)}>
          Save settings
        </button>
      </section>
      <section className="card max-w-2xl">
        <p className="eyebrow">BACKUP & CONTROL</p>
        <h2 className="mt-2 text-2xl font-black">My data</h2>
        <p className="my-2 text-slate-400">
          Export includes programs, exercises, workouts, goals, and settings.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportFile}>
            <Download />
            Export JSON
          </button>
          <button className="btn-secondary" onClick={() => file.current?.click()}>
            <Upload />
            Import JSON
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
            Reset application
          </button>
        </div>
      </section>
      <ConfirmDialog
        open={!!pending}
        title="Replace all data?"
        description="Importing will replace your current data. Export a backup first."
        onClose={() => setPending(null)}
        onConfirm={() => pending && store.importData(pending)}
      />
      <ConfirmDialog
        open={reset}
        title="Reset all data"
        description="All workouts, programs, goals, and custom exercises will be permanently deleted."
        onClose={() => setReset(false)}
        onConfirm={store.reset}
      />
    </div>
  );
}
function Toggle({
  label,
  checked,
  set,
}: {
  label: string;
  checked: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 items-center justify-between rounded-2xl bg-white/[.045] px-4">
      <span className="font-bold">{label}</span>
      <input
        className="h-5 w-5 accent-brand"
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
      />
    </label>
  );
}
