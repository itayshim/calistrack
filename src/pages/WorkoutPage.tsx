import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  Plus,
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
import { useI18n } from '../hooks/useI18n';

export function WorkoutPage() {
  const { t, language } = useI18n();
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
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-brand/15 text-lime-700 dark:bg-white/[.06] dark:text-brand">
          <Play size={34} />
        </div>
        <h1 className="mt-6 text-3xl font-black">{t('noWorkout')}</h1>
        <p className="mt-2 text-slate-400">{t('chooseWorkoutDescription')}</p>
        <button className="btn-primary mt-7 w-full" onClick={() => nav('/program')}>
          {t('chooseWorkout')}
        </button>
      </div>
    );
  if (finish || active.completionReady)
    return (
      <WorkoutFinish
        active={active}
        notes={notes}
        setNotes={setNotes}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        feeling={feeling}
        setFeeling={setFeeling}
        onBack={() => {
          store.setCurrentExercise(active.currentExerciseIndex);
          setFinish(false);
        }}
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
    restLocked = remaining > 0,
    plannedSets = target?.targetSets ?? 0,
    allowedSets = plannedSets + (sessionExercise.extraSetCount ?? 0),
    canEnterSet = done < allowedSets,
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
    if (!value || restLocked || !canEnterSet) return;
    store.completeSet(i, +value);
    setValue('');
  };
  return (
    <div className="mx-auto max-w-3xl pb-28 md:pb-0">
      <header className="mb-8">
        <div className="mb-5 flex items-center justify-between">
          <button
            aria-label={t('cancelWorkout')}
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
            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black dark:bg-white/[.06]"
            onClick={() => setFinish(true)}
          >
            {t('finish')}
          </button>
        </div>
        <ProgressBar value={progress} label={t('workoutProgress')} />
        <p className="mt-2 text-center text-xs font-bold text-slate-500">
          <bdi>{totalDone}</bdi> / <bdi>{totalTarget}</bdi> {t('plannedSets')}
        </p>
      </header>
      {remaining > 0 && (
        <section
          role="timer"
          className="mb-6 overflow-hidden rounded-4xl border border-brand/30 bg-lime-50 p-6 text-center shadow-sm dark:bg-[#1b231c] dark:shadow-glow"
        >
          <p className="eyebrow">{t('rest')}</p>
          <strong className="mt-2 block text-7xl font-black tabular-nums tracking-[-.07em] text-brand">
            {remaining}
          </strong>
          <p className="text-sm font-bold text-slate-400">{t('secondsUntilNextSet')}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              aria-label={timer.endsAt ? t('pauseTimer') : t('resumeTimer')}
              className="icon-button"
              onClick={timer.endsAt ? store.pauseTimer : store.resumeTimer}
            >
              {timer.endsAt ? <Pause /> : <Play />}
            </button>
            <button aria-label={t('resetTimer')} className="icon-button" onClick={store.resetTimer}>
              <RotateCcw />
            </button>
            <button className="btn-secondary min-h-12" onClick={store.skipTimer}>
              {t('skipRest')}
            </button>
          </div>
        </section>
      )}
      {restLocked && (
        <p role="status" className="-mt-3 mb-6 text-center text-sm font-bold text-slate-400">
          {t('restLocked')}
        </p>
      )}
      <main className="animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <Badge tone="brand">
            {t('exercise')} <bdi>{i + 1}</bdi> / <bdi>{active.exercises.length}</bdi>
          </Badge>
          <span className="text-sm font-black text-slate-500">
            <bdi>{done}</bdi>/<bdi>{target?.targetSets ?? 0}</bdi> {t('sets')}
          </span>
        </div>
        <h1 className="max-w-2xl text-[3rem] font-black leading-[.92] tracking-[-.06em] sm:text-6xl">
          {exercise ? (language === 'he' ? exercise.nameHe : exercise.nameEn) : t('exerciseUnavailable')}
        </h1>
        <p className="mt-4 text-lg font-bold text-slate-400">
          <span><bdi>{target?.targetSets}</bdi> {t('sets')}</span><span aria-hidden="true"> · </span><span><bdi>{target?.targetMin}–{target?.targetMax}</bdi> {exercise?.measurementType === 'time' ? t('seconds') : t('reps')}</span>
        </p>
        {previous?.length ? (
          <div className="surface-subtle mt-6 flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              {t('lastTime')}
            </span>
            <span className="font-black text-slate-200">
              <bdi>{previous.join(' · ')}</bdi> {exercise?.measurementType === 'time' ? t('seconds') : t('reps')}
            </span>
          </div>
        ) : null}
        <section className="mt-7 space-y-3">
          {sessionExercise.sets.map((set) => (
            <div
              key={set.id}
              className="surface-subtle flex min-h-16 items-center gap-3 rounded-2xl px-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-ink">
                <Check size={18} strokeWidth={3} />
              </span>
              <span className="w-16 text-sm font-black text-slate-400">{t('set')} <bdi>{set.setNumber}</bdi></span>
              <input
                aria-label={`Set value ${set.setNumber}`}
                type="number"
                min="0"
                value={set.value}
                onChange={(e) => store.editSet(i, set.id, +e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right text-2xl font-black outline-none"
              />
              <span className="text-sm font-bold text-slate-500">
                {exercise?.measurementType === 'time' ? t('seconds') : t('reps')}
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
            {exercise?.measurementType === 'time' ? t('seconds') : t('reps')} — {t('set')} <bdi>{done + 1}</bdi>
          </label>
          <input
            id="set-value"
            autoFocus
            inputMode="numeric"
            type="number"
            min="0"
            value={value}
            disabled={restLocked || !canEnterSet}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && complete()}
            placeholder="0"
            className="mx-auto block w-full bg-transparent text-center text-[6.5rem] font-black leading-none tabular-nums tracking-[-.08em] text-slate-950 outline-none placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:placeholder:text-white/[.08] sm:text-9xl"
          />
        </div>
        {canEnterSet ? (
          <button
            disabled={!value || restLocked}
            onClick={complete}
            className="btn-primary mt-4 min-h-16 w-full text-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={23} strokeWidth={3} />
            {restLocked ? <>{t('resting')} · <bdi>{remaining}</bdi></> : t('completeSet')}
          </button>
        ) : (
          <div className="mt-4 rounded-3xl bg-emerald-500/10 p-4 text-center">
            <p className="font-black text-emerald-300">{t('plannedSetsComplete')}</p>
            <button className="btn-secondary mt-3 w-full" onClick={() => store.addExtraSet(i)}>
              <Plus size={20} />
              {t('addExtraSet')}
            </button>
          </div>
        )}
        {target?.notes && (
          <p className="mt-5 rounded-2xl bg-blue-500/10 p-4 text-sm font-semibold text-blue-200">
            {target.notes}
          </p>
        )}
        <details className="surface-subtle mt-5 rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-black text-slate-400">
            {t('addExerciseNotes')}
          </summary>
          <textarea
            className="field mt-3"
            value={sessionExercise.notes ?? ''}
            onChange={(e) => store.setExerciseNotes(i, e.target.value)}
            placeholder={t('exerciseNotesPlaceholder')}
          />
        </details>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <button
            disabled={!i}
            className="btn-secondary px-2"
            onClick={() => store.setCurrentExercise(i - 1)}
          >
            <ChevronLeft className="directional-icon" />
            {t('previous')}
          </button>
          <button className="btn-secondary px-2" onClick={() => store.skipExercise(i)}>
            <SkipForward />
            {t('skip')}
          </button>
          {i < active.exercises.length - 1 ? (
            <button className="btn-primary px-2" onClick={() => store.setCurrentExercise(i + 1)}>
              {t('next')}
              <ChevronRight className="directional-icon" />
            </button>
          ) : (
            <button className="btn-primary px-2" onClick={() => setFinish(true)}>
              {t('finish')}
            </button>
          )}
        </div>
        <section className="mt-10">
          <p className="label">{t('workoutQueue')}</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {active.exercises.map((item, n) => (
              <button
                key={item.id}
                onClick={() => store.setCurrentExercise(n)}
                className={`min-w-[9rem] rounded-2xl p-3 text-start ${n === i ? 'bg-brand text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/[.05] dark:text-slate-400'}`}
              >
                <span className="block text-xs font-black">
                  {n + 1}.{' '}
                  {store.exercises.find((e) => e.id === item.exerciseId)?.[language === 'he' ? 'nameHe' : 'nameEn'] ?? t('exerciseUnavailable')}
                </span>
                <span className="mt-1 block text-[10px] font-bold opacity-60">
                  {item.skipped ? t('skipped') : <><bdi>{item.sets.length}</bdi> {t('setsDone')}</>}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <ConfirmDialog
        open={cancel}
        title={t('cancelWorkoutTitle')}
        description={t('cancelWorkoutDescription')}
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
  const { t } = useI18n();
  const summary = workoutSummary(active);
  return (
    <div className="mx-auto max-w-xl animate-rise py-6 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-brand text-ink shadow-glow">
        <Check size={44} strokeWidth={3} />
      </div>
      <p className="eyebrow mt-7">{t('workoutComplete')}</p>
      <h1 className="mt-2 text-5xl font-black tracking-[-.06em]">{t('strongWork')}</h1>
      <p className="mt-3 text-slate-400">{t('completionMessage')}</p>
      <div className="my-8 grid grid-cols-3 gap-3">
        {[
          [Math.round(summary.durationSeconds / 60), t('minutesShort')],
          [summary.totalSets, t('sets')],
          [summary.completedExercises, t('moves')],
        ].map(([v, l]) => (
          <div key={l} className="surface-subtle rounded-3xl p-4">
            <strong className="block text-3xl font-black">{v}</strong>
            <span className="text-[10px] font-black tracking-wider text-slate-500">{l}</span>
          </div>
        ))}
      </div>
      <div className="card text-start">
        <Rating label={t('difficultyQuestion')} value={difficulty} set={setDifficulty} />
        <div className="mt-6">
          <Rating label={t('feelingQuestion')} value={feeling} set={setFeeling} />
        </div>
        <label className="mt-6 block">
          <span className="label">{t('workoutNote')}</span>
          <textarea
            className="field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workoutNotePlaceholder')}
          />
        </label>
      </div>
      <button className="btn-primary mt-5 w-full text-lg" onClick={onSave}>
        {t('saveWorkout')}
      </button>
      <button className="btn-secondary mt-3 w-full" onClick={onBack}>
        {t('backToWorkout')}
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
            className={`min-h-12 rounded-2xl font-black transition ${value === n ? 'bg-brand text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/[.06] dark:text-slate-400'}`}
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
