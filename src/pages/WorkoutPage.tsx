import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge, ProgressBar } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { workoutSummary } from '../utils/stats';

export function WorkoutPage() {
  const active = useAppStore((s) => s.activeWorkout),
    store = useAppStore(),
    nav = useNavigate(),
    [now, setNow] = useState(Date.now()),
    [value, setValue] = useState(''),
    [finish, setFinish] = useState(false),
    [cancel, setCancel] = useState(false),
    [notes, setNotes] = useState(''),
    [difficulty, setDifficulty] = useState(3),
    [feeling, setFeeling] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  if (!active)
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/[.06] text-brand">
          <Play size={34} />
        </div>
        <h1 className="mt-6 text-3xl font-black">No workout in progress</h1>
        <p className="mt-2 text-slate-400">
          Choose a session from your program when you are ready.
        </p>
        <button className="btn-primary mt-7 w-full" onClick={() => nav('/program')}>
          Choose workout
        </button>
      </div>
    );
  if (finish)
    return (
      <WorkoutFinish
        active={active}
        notes={notes}
        setNotes={setNotes}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        feeling={feeling}
        setFeeling={setFeeling}
        onBack={() => setFinish(false)}
        onSave={() => {
          store.finishWorkout(notes, difficulty, feeling);
          nav('/history');
        }}
      />
    );
  const i = active.currentExerciseIndex,
    sessionExercise = active.exercises[i],
    exercise = store.exercises.find((e) => e.id === sessionExercise.exerciseId),
    target = sessionExercise.target,
    done = sessionExercise.sets.filter((s) => s.completed).length,
    totalTarget = active.exercises.reduce((n, e) => n + (e.target?.targetSets ?? 0), 0),
    totalDone = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0),
    progress = totalTarget ? (totalDone / totalTarget) * 100 : 0,
    elapsed = Math.floor((now - Date.parse(active.startedAt)) / 1000),
    timer = store.restTimer,
    remaining =
      timer.pausedRemaining ??
      (timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0),
    previous = store.workoutSessions
      .find(
        (s) =>
          s.status === 'completed' &&
          s.exercises.some((e) => e.exerciseId === sessionExercise.exerciseId),
      )
      ?.exercises.find((e) => e.exerciseId === sessionExercise.exerciseId)
      ?.sets.filter((s) => s.completed)
      .map((s) => s.value);
  const complete = () => {
    if (!value) return;
    store.completeSet(i, +value);
    setValue('');
  };
  return (
    <div className="mx-auto max-w-3xl pb-28 md:pb-0">
      <header className="mb-8">
        <div className="mb-5 flex items-center justify-between">
          <button
            aria-label="Cancel workout"
            className="icon-button"
            onClick={() => setCancel(true)}
          >
            <X />
          </button>
          <div className="text-center">
            <p className="text-sm font-black">{active.workoutName}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-500">
              <Clock3 size={13} />
              {formatTime(elapsed)}
            </p>
          </div>
          <button
            className="rounded-full bg-white/[.06] px-4 py-2 text-xs font-black"
            onClick={() => setFinish(true)}
          >
            Finish
          </button>
        </div>
        <ProgressBar value={progress} label="Workout progress" />
        <p className="mt-2 text-center text-xs font-bold text-slate-500">
          {totalDone} of {totalTarget} planned sets
        </p>
      </header>
      {remaining > 0 && (
        <section
          role="timer"
          className="mb-6 overflow-hidden rounded-4xl bg-[#1b231c] p-6 text-center shadow-glow"
        >
          <p className="eyebrow">REST</p>
          <strong className="mt-2 block text-7xl font-black tabular-nums tracking-[-.07em] text-brand">
            {remaining}
          </strong>
          <p className="text-sm font-bold text-slate-400">seconds until your next set</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              aria-label={timer.endsAt ? 'Pause timer' : 'Resume timer'}
              className="icon-button"
              onClick={timer.endsAt ? store.pauseTimer : store.resumeTimer}
            >
              {timer.endsAt ? <Pause /> : <Play />}
            </button>
            <button aria-label="Reset timer" className="icon-button" onClick={store.resetTimer}>
              <RotateCcw />
            </button>
            <button className="btn-secondary min-h-12" onClick={store.skipTimer}>
              Skip rest
            </button>
          </div>
        </section>
      )}
      <main className="animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <Badge tone="brand">
            EXERCISE {i + 1} / {active.exercises.length}
          </Badge>
          <span className="text-sm font-black text-slate-500">
            {done}/{target?.targetSets ?? 0} SETS
          </span>
        </div>
        <h1 className="max-w-2xl text-[3rem] font-black leading-[.92] tracking-[-.06em] sm:text-6xl">
          {exercise?.nameEn ?? 'Exercise unavailable'}
        </h1>
        <p className="mt-4 text-lg font-bold text-slate-400">
          {target?.targetSets} sets · {target?.targetMin}–{target?.targetMax}{' '}
          {exercise?.measurementType === 'time' ? 'seconds' : 'reps'}
        </p>
        {previous?.length ? (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/[.045] px-4 py-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Last time
            </span>
            <span className="font-black text-slate-200">
              {previous.join(' · ')} {exercise?.measurementType === 'time' ? 'sec' : 'reps'}
            </span>
          </div>
        ) : null}
        <section className="mt-7 space-y-3">
          {sessionExercise.sets.map((set) => (
            <div
              key={set.id}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-white/[.05] px-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-ink">
                <Check size={18} strokeWidth={3} />
              </span>
              <span className="w-12 text-sm font-black text-slate-400">SET {set.setNumber}</span>
              <input
                aria-label={`Set value ${set.setNumber}`}
                type="number"
                min="0"
                value={set.value}
                onChange={(e) => store.editSet(i, set.id, +e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right text-2xl font-black outline-none"
              />
              <span className="text-sm font-bold text-slate-500">
                {exercise?.measurementType === 'time' ? 'sec' : 'reps'}
              </span>
              <button
                aria-label={`Delete set ${set.setNumber}`}
                className="p-2 text-slate-600 hover:text-red-400"
                onClick={() => store.deleteSet(i, set.id)}
              >
                <Trash2 size={19} />
              </button>
            </div>
          ))}
        </section>
        <div className="mt-8 text-center">
          <label htmlFor="set-value" className="label">
            {exercise?.measurementType === 'time' ? 'SECONDS' : 'REPS'} FOR SET {done + 1}
          </label>
          <input
            id="set-value"
            autoFocus
            inputMode="numeric"
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && complete()}
            placeholder="0"
            className="mx-auto block w-full bg-transparent text-center text-[6.5rem] font-black leading-none tabular-nums tracking-[-.08em] text-white outline-none placeholder:text-white/[.08] sm:text-9xl"
          />
        </div>
        <button
          disabled={!value}
          onClick={complete}
          className="btn-primary mt-4 min-h-16 w-full text-lg"
        >
          <Check size={23} strokeWidth={3} />
          Complete set
        </button>
        {target?.notes && (
          <p className="mt-5 rounded-2xl bg-blue-500/10 p-4 text-sm font-semibold text-blue-200">
            {target.notes}
          </p>
        )}
        <details className="mt-5 rounded-2xl bg-white/[.035] p-4">
          <summary className="cursor-pointer text-sm font-black text-slate-400">
            Add exercise notes
          </summary>
          <textarea
            className="field mt-3"
            value={sessionExercise.notes ?? ''}
            onChange={(e) => store.setExerciseNotes(i, e.target.value)}
            placeholder="How did this exercise feel?"
          />
        </details>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <button
            disabled={!i}
            className="btn-secondary px-2"
            onClick={() => store.setCurrentExercise(i - 1)}
          >
            <ChevronLeft />
            Previous
          </button>
          <button className="btn-secondary px-2" onClick={() => store.skipExercise(i)}>
            <SkipForward />
            Skip
          </button>
          {i < active.exercises.length - 1 ? (
            <button className="btn-primary px-2" onClick={() => store.setCurrentExercise(i + 1)}>
              Next
              <ChevronRight />
            </button>
          ) : (
            <button className="btn-primary px-2" onClick={() => setFinish(true)}>
              Finish
            </button>
          )}
        </div>
        <section className="mt-10">
          <p className="label">Workout queue</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {active.exercises.map((item, n) => (
              <button
                key={item.id}
                onClick={() => store.setCurrentExercise(n)}
                className={`min-w-[9rem] rounded-2xl p-3 text-left ${n === i ? 'bg-brand text-ink' : 'bg-white/[.05] text-slate-400'}`}
              >
                <span className="block text-xs font-black">
                  {n + 1}.{' '}
                  {store.exercises.find((e) => e.id === item.exerciseId)?.nameEn ?? 'Unavailable'}
                </span>
                <span className="mt-1 block text-[10px] font-bold opacity-60">
                  {item.skipped ? 'SKIPPED' : `${item.sets.length} SETS DONE`}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <ConfirmDialog
        open={cancel}
        title="Cancel this workout?"
        description="Your active workout will be deleted and will not appear in history."
        onClose={() => setCancel(false)}
        onConfirm={() => {
          store.cancelWorkout();
          nav('/');
        }}
      />
    </div>
  );
}

function WorkoutFinish({
  active,
  notes,
  setNotes,
  difficulty,
  setDifficulty,
  feeling,
  setFeeling,
  onBack,
  onSave,
}: {
  active: NonNullable<ReturnType<typeof useAppStore.getState>['activeWorkout']>;
  notes: string;
  setNotes: (v: string) => void;
  difficulty: number;
  setDifficulty: (v: number) => void;
  feeling: number;
  setFeeling: (v: number) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const summary = workoutSummary(active);
  return (
    <div className="mx-auto max-w-xl animate-rise py-6 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-brand text-ink shadow-glow">
        <Check size={44} strokeWidth={3} />
      </div>
      <p className="eyebrow mt-7">WORKOUT COMPLETE</p>
      <h1 className="mt-2 text-5xl font-black tracking-[-.06em]">Strong work.</h1>
      <p className="mt-3 text-slate-400">You showed up and put in the work.</p>
      <div className="my-8 grid grid-cols-3 gap-3">
        {[
          [Math.round(summary.durationSeconds / 60), 'MIN'],
          [summary.totalSets, 'SETS'],
          [summary.completedExercises, 'MOVES'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-3xl bg-white/[.05] p-4">
            <strong className="block text-3xl font-black">{v}</strong>
            <span className="text-[10px] font-black tracking-wider text-slate-500">{l}</span>
          </div>
        ))}
      </div>
      <div className="card text-left">
        <Rating label="How hard was it?" value={difficulty} set={setDifficulty} />
        <div className="mt-6">
          <Rating label="How do you feel?" value={feeling} set={setFeeling} />
        </div>
        <label className="mt-6 block">
          <span className="label">Workout note</span>
          <textarea
            className="field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="A quick note for future you…"
          />
        </label>
      </div>
      <button className="btn-primary mt-5 w-full text-lg" onClick={onSave}>
        Save workout
      </button>
      <button className="btn-secondary mt-3 w-full" onClick={onBack}>
        Back to workout
      </button>
    </div>
  );
}
function Rating({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={value === n}
            onClick={() => set(n)}
            className={`min-h-12 rounded-2xl font-black transition ${value === n ? 'bg-brand text-ink' : 'bg-white/[.06] text-slate-400'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
