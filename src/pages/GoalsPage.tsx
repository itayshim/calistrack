import { Dumbbell, Plus, Target, Timer, Trash2, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, IconTile, ProgressBar, ProgressRing } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { GoalType } from '../types';
import { createId } from '../utils/id';
import { exercisePoints, weeklyCompleted } from '../utils/stats';
import { useI18n } from '../hooks/useI18n';
import { getExerciseName } from '../utils/exerciseLocalization';
import { Select } from '../components/SelectMenu';
import { formatAddedWeight, formatDuration, formatReps, getSetAddedWeight, getSetReps } from '../utils/performance';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
const icons = {
  'weekly-workouts': Dumbbell,
  'exercise-reps': Target,
  'exercise-time': Timer,
  'exercise-weighted-reps': Dumbbell,
  'first-skill': Trophy,
};
export function GoalsPage() {
  const { t, language } = useI18n();
  const store = useAppStore(),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [type, setType] = useState<GoalType>('weekly-workouts'),
    [exerciseId, setExercise] = useState(store.exercises[0]?.id ?? ''),
    [target, setTarget] = useState('3'),
    [targetWeight, setTargetWeight] = useState('0'),
    [numericError, setNumericError] = useState(''),
    allowEmpty = store.settings.allowEmptyNumericFields;
  const goalDirty = open && Boolean(title || type !== 'weekly-workouts' || target !== '3' || targetWeight !== '0');
  const unsaved = useUnsavedChangesGuard(goalDirty);
  const closeEditor = () => unsaved.request(() => setOpen(false));
  const save = () => {
    const parsedTarget = Number(target);
    const parsedWeight = Number(targetWeight);
    if (!title.trim() || !Number.isFinite(parsedTarget) || parsedTarget < 1 || (type === 'exercise-weighted-reps' && (!Number.isFinite(parsedWeight) || parsedWeight < 0))) {
      setNumericError(t('enterValidGoalTarget'));
      return;
    }
    store.addGoal({
      id: createId(),
      type,
      title,
      exerciseId: type === 'weekly-workouts' ? undefined : exerciseId,
      targetValue: parsedTarget,
      targetReps: type === 'exercise-weighted-reps' ? parsedTarget : undefined,
      targetAddedWeightKg: type === 'exercise-weighted-reps' ? parsedWeight : undefined,
      createdAt: new Date().toISOString(),
    });
    setTitle('');
    setNumericError('');
    setOpen(false);
  };
  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">{t('goalsEyebrow')}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('goals')}</h1>
          <p className="mt-2 text-slate-400">{t('goalsSubtitle')}</p>
        </div>
        <button
          aria-label="Create goal"
          onClick={() => setOpen(true)}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-ink shadow-glow transition active:scale-95"
        >
          <Plus size={26} />
        </button>
      </header>
      {store.goals.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {store.goals.map((goal) => {
            const weightedCurrent = goal.type === 'exercise-weighted-reps'
              ? Math.max(
                  0,
                  ...store.workoutSessions.flatMap((session) =>
                    session.exercises
                      .filter((exercise) => exercise.exerciseId === goal.exerciseId)
                      .flatMap((exercise) =>
                        exercise.sets
                          .filter((set) => (getSetReps(set, 'weighted_reps') ?? 0) >= (goal.targetReps ?? goal.targetValue))
                          .map((set) => getSetAddedWeight(set) ?? 0),
                      ),
                  ),
                )
              : 0;
            const current =
                goal.type === 'weekly-workouts'
                  ? weeklyCompleted(store.workoutSessions)
                  : goal.type === 'exercise-weighted-reps'
                    ? weightedCurrent
                  : Math.max(
                      0,
                      ...exercisePoints(store.workoutSessions, goal.exerciseId ?? '').map(
                        (x) => x.best,
                      ),
                    ),
              goalTarget = goal.type === 'exercise-weighted-reps' ? goal.targetAddedWeightKg ?? 0 : goal.targetValue,
              pct = goalTarget > 0 ? Math.min(100, (current / goalTarget) * 100) : 0,
              Icon = icons[goal.type];
            return (
              <article key={goal.id} className="card group relative overflow-hidden p-6">
                <div className="flex items-start justify-between">
                  <IconTile tone={pct >= 100 ? 'brand' : 'blue'}>
                    <Icon />
                  </IconTile>
                  <button
                    aria-label="Delete goal"
                    onClick={() => store.deleteGoal(goal.id)}
                    className="p-2 text-slate-600 opacity-60 transition hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <h2 className="mt-6 text-2xl font-black tracking-[-.035em]">{goal.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  <bdi>
                    {goal.type === 'exercise-time'
                      ? `${formatDuration(current, language)} / ${formatDuration(goal.targetValue, language)}`
                      : goal.type === 'exercise-weighted-reps'
                        ? `${formatReps(goal.targetReps ?? goal.targetValue, language)} · ${formatAddedWeight(current, language)} / ${formatAddedWeight(goal.targetAddedWeightKg ?? 0, language)}`
                        : `${current} / ${goal.targetValue}`}
                  </bdi>
                </p>
                <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-5">
                  <div>
                    <ProgressBar value={pct} label={goal.title} />
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      {pct >= 100
                        ? 'Completed — celebrate this one.'
                        : 'Keep going. Every rep counts.'}
                    </p>
                  </div>
                  <ProgressRing value={pct} size={70} label={goal.title} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Target size={36} />}
          title="Choose something worth chasing"
          description="A clear goal turns random workouts into meaningful progress."
          action="Create my first goal"
          onAction={() => setOpen(true)}
        />
      )}{' '}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center"
          onMouseDown={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            className="modal-surface w-full animate-rise rounded-t-4xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-4xl"
          >
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="eyebrow">{t('newGoal')}</p>
                <h2 id="goal-title" className="mt-1 text-3xl font-black">
                  What are you chasing?
                </h2>
              </div>
              <button aria-label="Close" className="icon-button" onClick={closeEditor}>
                <X />
              </button>
            </div>
            <div className="space-y-5">
              <label>
                <span className="label">{t('goalTitle')}</span>
                <input
                  autoFocus
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="10 push-ups in one set"
                />
              </label>
              <fieldset>
                <legend className="label">{t('goalType')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['weekly-workouts', t('weeklyWorkoutsGoal')],
                      ['exercise-reps', t('repetitionsGoal')],
                      ['exercise-time', t('durationGoal')],
                      ['exercise-weighted-reps', t('weightedRepsGoal')],
                      ['first-skill', t('firstSkillGoal')],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      className={`min-h-13 rounded-2xl px-3 text-sm font-black ${type === value ? 'bg-brand text-ink' : 'bg-slate-100 text-slate-600 dark:bg-white/[.06] dark:text-slate-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {type !== 'weekly-workouts' && (
                <Select
                  label={t('exercise')}
                  value={exerciseId}
                  onChange={setExercise}
                  searchable
                  searchLabel={t('searchExercises')}
                  options={store.exercises.map((exercise) => ({ value: exercise.id, label: getExerciseName(exercise, language) }))}
                />
              )}
              <label>
                <span className="label">{type === 'exercise-time' ? t('targetDuration') : t('target')}</span>
                <input
                  className="field text-2xl font-black"
                  type="number"
                  min="1"
                  value={target}
                  aria-invalid={!!numericError}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setTarget(allowEmpty ? raw : String(Math.max(1, Number(raw) || 1)));
                    setNumericError('');
                  }}
                />
                {numericError && <span className="mt-1 block text-sm font-bold text-red-500">{numericError}</span>}
              </label>
              {type === 'exercise-weighted-reps' && (
                <label>
                  <span className="label">{t('targetAddedWeight')}</span>
                  <input
                    className="field text-2xl font-black"
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                  value={targetWeight}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setTargetWeight(allowEmpty ? raw : String(Math.max(0, Number(raw) || 0)));
                    setNumericError('');
                  }}
                  />
                </label>
              )}
              <button
                disabled={!title.trim()}
                className="btn-primary w-full text-lg"
                onClick={save}
              >
                Create goal
              </button>
            </div>
          </section>
        </div>
      )}
      {unsaved.dialog}
    </div>
  );
}
