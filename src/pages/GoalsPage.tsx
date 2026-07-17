import { Dumbbell, Plus, Target, Timer, Trash2, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, IconTile, ProgressBar, ProgressRing } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { GoalType } from '../types';
import { createId } from '../utils/id';
import { exercisePoints, weeklyCompleted } from '../utils/stats';
import { useI18n } from '../hooks/useI18n';
const icons = {
  'weekly-workouts': Dumbbell,
  'exercise-reps': Target,
  'exercise-time': Timer,
  'first-skill': Trophy,
};
export function GoalsPage() {
  const { t } = useI18n();
  const store = useAppStore(),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [type, setType] = useState<GoalType>('weekly-workouts'),
    [exerciseId, setExercise] = useState(store.exercises[0]?.id ?? ''),
    [target, setTarget] = useState(3);
  const save = () => {
    if (!title.trim()) return;
    store.addGoal({
      id: createId(),
      type,
      title,
      exerciseId: type === 'weekly-workouts' ? undefined : exerciseId,
      targetValue: target,
      createdAt: new Date().toISOString(),
    });
    setTitle('');
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
            const current =
                goal.type === 'weekly-workouts'
                  ? weeklyCompleted(store.workoutSessions)
                  : Math.max(
                      0,
                      ...exercisePoints(store.workoutSessions, goal.exerciseId ?? '').map(
                        (x) => x.best,
                      ),
                    ),
              pct = Math.min(100, (current / goal.targetValue) * 100),
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
                  {current} of {goal.targetValue}
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
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            className="w-full animate-rise rounded-t-4xl bg-elevated p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-soft sm:max-w-lg sm:rounded-4xl"
          >
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="eyebrow">{t('newGoal')}</p>
                <h2 id="goal-title" className="mt-1 text-3xl font-black">
                  What are you chasing?
                </h2>
              </div>
              <button aria-label="Close" className="icon-button" onClick={() => setOpen(false)}>
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
                      ['weekly-workouts', 'Weekly workouts'],
                      ['exercise-reps', 'Rep target'],
                      ['exercise-time', 'Hold target'],
                      ['first-skill', 'First skill'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      className={`min-h-13 rounded-2xl px-3 text-sm font-black ${type === value ? 'bg-brand text-ink' : 'bg-white/[.06] text-slate-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {type !== 'weekly-workouts' && (
                <label>
                  <span className="label">{t('exercise')}</span>
                  <select
                    className="field"
                    value={exerciseId}
                    onChange={(e) => setExercise(e.target.value)}
                  >
                    {store.exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nameEn}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span className="label">{t('target')}</span>
                <input
                  className="field text-2xl font-black"
                  type="number"
                  min="1"
                  value={target}
                  onChange={(e) => setTarget(+e.target.value)}
                />
              </label>
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
    </div>
  );
}
