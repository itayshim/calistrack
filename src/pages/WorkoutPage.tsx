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
  Copy,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge, ProgressBar } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { workoutSummary } from '../utils/stats';
import { useI18n } from '../hooks/useI18n';
import { ExerciseDemonstrationButton } from '../components/ExerciseDemonstration';
import { getExerciseName } from '../utils/exerciseLocalization';
import {
  formatSetPerformance,
  getSetAddedWeight,
  getSetDuration,
  getSetReps,
  normalizeMeasurementType,
} from '../utils/performance';
import {
  copySetInput,
  getPreviousPerformance,
  validEnteredSet,
} from '../utils/workoutExperience';
import { ExerciseReplacementSheet } from '../components/ExerciseReplacementSheet';

export function WorkoutPage() {
  const { t, language } = useI18n();
  const active = useAppStore((s) => s.activeWorkout),
    store = useAppStore(),
    nav = useNavigate(),
    [now, setNow] = useState(Date.now()),
    [drafts, setDrafts] = useState<Record<string, { reps: string; duration: string; addedWeight: string }>>({}),
    [replaceOpen, setReplaceOpen] = useState(false),
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
    measurementType = normalizeMeasurementType(
      sessionExercise.measurementType ?? target?.measurementType ?? exercise?.measurementType,
    ),
    historical = getPreviousPerformance(
      store.workoutSessions,
      sessionExercise.exerciseId,
      active.startedAt,
    ),
    previousSet = historical?.sets[done],
    currentPreviousSet = sessionExercise.sets[done - 1],
    draft = drafts[sessionExercise.id] ?? { reps: '', duration: '', addedWeight: '' },
    reps = draft.reps,
    duration = draft.duration,
    addedWeight = draft.addedWeight;
  const updateDraft = (changes: Partial<typeof draft>) =>
    setDrafts((current) => ({
      ...current,
      [sessionExercise.id]: { ...draft, ...changes },
    }));
  const applyInput = (input: ReturnType<typeof copySetInput>) => {
    updateDraft({
      reps: input.reps === undefined ? '' : String(input.reps),
      duration: input.durationSeconds === undefined ? '' : String(input.durationSeconds),
      addedWeight: input.addedWeightKg === undefined ? '' : String(input.addedWeightKg),
    });
  };
  const setInput =
    measurementType === 'duration'
      ? { durationSeconds: Number(duration) }
      : measurementType === 'weighted_reps'
        ? { reps: Number(reps), addedWeightKg: Number(addedWeight) }
        : { reps: Number(reps) };
  const validInput =
    measurementType === 'duration'
      ? Number(duration) > 0
      : Number(reps) > 0 &&
        (measurementType !== 'weighted_reps' ||
          (addedWeight !== '' && Number(addedWeight) >= (target?.minimumAddedWeightKg ?? 0)));
  const complete = () => {
    if (!validInput || restLocked || !canEnterSet) return;
    store.completeSet(i, setInput);
    setDrafts((current) => ({
      ...current,
      [sessionExercise.id]: { reps: '', duration: '', addedWeight: '' },
    }));
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="max-w-2xl text-[3rem] font-black leading-[.92] tracking-[-.06em] sm:text-6xl">
            {exercise ? getExerciseName(exercise, language) : t('exerciseUnavailable')}
          </h1>
          <div className="flex flex-wrap gap-2">
            {exercise && <ExerciseDemonstrationButton exercise={exercise} className="shrink-0" />}
            {exercise && (
              <button className="btn-secondary min-h-11 px-3" onClick={() => setReplaceOpen(true)}>
                <RefreshCw size={18} />
                {t('replaceExercise')}
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 text-lg font-bold text-slate-400">
          <span><bdi>{target?.targetSets}</bdi> {t('sets')}</span><span aria-hidden="true"> · </span><span><bdi>{target?.targetMin}–{target?.targetMax}</bdi> {measurementType === 'duration' ? t('seconds') : t('reps')}</span>
          {measurementType === 'weighted_reps' && target?.targetAddedWeightKg !== undefined && (
            <><span aria-hidden="true"> · </span><span>{t('targetAddedWeight')}: <bdi>+{target.targetAddedWeightKg} kg</bdi></span></>
          )}
        </p>
        <div className="surface-subtle mt-6 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              {historical
                ? `${t('previous')} · ${new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(historical.completedAt))}`
                : t('previous')}
            </span>
            <span className="font-black">
              {previousSet ? (
                <bdi>{formatSetPerformance(previousSet, measurementType, language)}</bdi>
              ) : (
                <span className="text-sm text-slate-500">{t('noPreviousPerformance')}</span>
              )}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="btn-secondary min-h-11 px-2 text-xs"
              disabled={!previousSet || restLocked}
              onClick={() => previousSet && applyInput(copySetInput(previousSet, measurementType))}
            >
              <Copy size={16} />
              {t('usePreviousWorkout')}
            </button>
            <button
              className="btn-secondary min-h-11 px-2 text-xs"
              disabled={!validEnteredSet(currentPreviousSet, measurementType) || restLocked}
              onClick={() => currentPreviousSet && applyInput(copySetInput(currentPreviousSet, measurementType))}
            >
              <Copy size={16} />
              {t('copyPreviousSet')}
            </button>
          </div>
        </div>
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
              {measurementType === 'duration' ? (
                <MetricInput
                  label={t('holdTime')}
                  value={getSetDuration(set, measurementType) ?? 0}
                  unit={t('seconds')}
                  onChange={(next) => store.editSet(i, set.id, { durationSeconds: next })}
                />
              ) : (
                <>
                  <MetricInput
                    label={t('repetitionsMeasurement')}
                    value={getSetReps(set, measurementType) ?? 0}
                    unit={t('reps')}
                    onChange={(next) => store.editSet(i, set.id, {
                      reps: next,
                      ...(measurementType === 'weighted_reps'
                        ? { addedWeightKg: getSetAddedWeight(set) ?? 0 }
                        : {}),
                    })}
                  />
                  {measurementType === 'weighted_reps' && (
                    <MetricInput
                      label={t('addedWeight')}
                      value={getSetAddedWeight(set) ?? 0}
                      unit="kg"
                      step={0.5}
                      onChange={(next) => store.editSet(i, set.id, {
                        reps: getSetReps(set, measurementType) ?? 0,
                        addedWeightKg: next,
                      })}
                    />
                  )}
                </>
              )}
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
            {measurementType === 'duration' ? t('holdTime') : t('reps')} — {t('set')} <bdi>{done + 1}</bdi>
          </label>
          <input
            id="set-value"
            autoFocus
            inputMode="numeric"
            type="number"
            min="0"
            value={measurementType === 'duration' ? duration : reps}
            disabled={restLocked || !canEnterSet}
            onChange={(e) => measurementType === 'duration' ? updateDraft({ duration: e.target.value }) : updateDraft({ reps: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && complete()}
            placeholder="0"
            className="mx-auto block w-full bg-transparent text-center text-[6.5rem] font-black leading-none tabular-nums tracking-[-.08em] text-slate-950 outline-none placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:placeholder:text-white/[.08] sm:text-9xl"
          />
          <p className="text-center text-sm font-bold text-slate-500">
            {measurementType === 'duration' ? t('seconds') : t('reps')}
          </p>
          {measurementType === 'duration' && (
            <div className="mt-3 flex justify-center gap-2">
              {[5, 10, 30].map((amount) => (
                <button key={amount} type="button" className="chip" disabled={restLocked} onClick={() => updateDraft({ duration: String(Number(duration || 0) + amount) })}>+{amount}s</button>
              ))}
            </div>
          )}
          {measurementType === 'weighted_reps' && (
            <label className="mx-auto mt-5 block max-w-sm">
              <span className="label">{t('addedWeightKg')}</span>
              <input
                aria-label={t('addedWeightKg')}
                className="field text-center text-3xl font-black"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={addedWeight}
                disabled={restLocked || !canEnterSet}
                onChange={(event) => updateDraft({ addedWeight: event.target.value })}
                onKeyDown={(event) => event.key === 'Enter' && complete()}
                placeholder="0"
              />
            </label>
          )}
        </div>
        {canEnterSet ? (
          <button
            disabled={!validInput || restLocked}
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
                  {(() => {
                    const queuedExercise = store.exercises.find((e) => e.id === item.exerciseId);
                    return queuedExercise
                      ? getExerciseName(queuedExercise, language)
                      : t('exerciseUnavailable');
                  })()}
                </span>
                <span className="mt-1 block text-[10px] font-bold opacity-60">
                  {item.skipped ? t('skipped') : <><bdi>{item.sets.length}</bdi> {t('setsDone')}</>}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      {exercise && (
        <ExerciseReplacementSheet
          open={replaceOpen}
          exerciseIndex={i}
          current={exercise}
          onClose={() => setReplaceOpen(false)}
          onReplaced={() =>
            setDrafts((current) => {
              const next = { ...current };
              delete next[sessionExercise.id];
              return next;
            })
          }
        />
      )}
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
function MetricInput({
  label,
  value,
  unit,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2">
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        type="number"
        min="0"
        step={step}
        inputMode={step < 1 ? 'decimal' : 'numeric'}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        className="min-w-0 flex-1 bg-transparent text-end text-xl font-black outline-none"
      />
      <span className="whitespace-nowrap text-xs font-bold text-slate-500">{unit}</span>
    </label>
  );
}
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
