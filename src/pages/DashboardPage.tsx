import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Medal,
  Play,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  EmptyState,
  IconTile,
  ProgressBar,
  ProgressRing,
  SectionHeader,
} from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import {
  consistencyStreak,
  personalRecords,
  weeklyCompleted,
  workoutSummary,
} from '../utils/stats';
import { useI18n } from '../hooks/useI18n';
import { resolveExerciseName } from '../utils/exerciseLocalization';
import { formatAddedWeight, formatDuration, formatReps } from '../utils/performance';

export function DashboardPage() {
  const { t, language } = useI18n();
  const programs = useAppStore((s) => s.programs),
    activeProgramId = useAppStore((s) => s.activeProgramId),
    sessions = useAppStore((s) => s.workoutSessions),
    exercises = useAppStore((s) => s.exercises),
    active = useAppStore((s) => s.activeWorkout),
    goal = useAppStore((s) => s.settings.weeklyWorkoutGoal),
    goals = useAppStore((s) => s.goals),
    adopt = useAppStore((s) => s.adoptBeginner),
    nav = useNavigate();
  const weekly = weeklyCompleted(sessions),
    streak = consistencyStreak(sessions, goal),
    workouts = programs.find((program) => program.id === activeProgramId)?.workouts ?? [],
    next = workouts.find((w) => w.scheduledDays.includes(new Date().getDay())) ?? workouts[0],
    last = sessions[0],
    records = personalRecords(sessions, exercises),
    topRecord = records.sort((a, b) => b.bestSet - a.bestSet)[0],
    weeklyPct = goal ? (weekly / goal) * 100 : 0;
  const start = () => {
    if (active) {
      nav(`/workout/${active.id}`);
      return;
    }
    if (next && useAppStore.getState().startWorkout(next))
      nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  return (
    <div className="space-y-8" data-tour-id="dashboard">
      <header className="animate-rise">
        <p className="eyebrow">
          {new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <h1 className="mt-2 text-[2.55rem] font-black leading-[.95] tracking-[-.055em] sm:text-5xl">
          {t('buildStrength')}
          <br />
          <span className="text-slate-500">{t('keepShowingUp')}</span>
        </h1>
      </header>
      {!programs.length ? (
        <EmptyState
          icon={<Dumbbell size={36} />}
          title={t('trainingStartsHere')}
          description={t('trainingStartDescription')}
          action={t('setupProgram')}
          onAction={() => {
            adopt();
            nav('/program');
          }}
        />
      ) : (
        <>
          <section className="group relative isolate overflow-hidden rounded-4xl bg-brand p-6 text-ink shadow-glow sm:p-8">
            <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full border-[34px] border-ink/[.06]" />
            <div className="absolute bottom-0 right-16 h-24 w-24 rounded-t-full bg-ink/[.05]" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <Badge tone="neutral">{active ? t('workoutInProgress') : t('upNext')}</Badge>
                <span className="flex items-center gap-1 text-xs font-black opacity-60">
                  <Clock3 size={14} />
                  {t('approximateMinutesShort')}
                </span>
              </div>
              <h2 className="mt-7 max-w-xl text-4xl font-black leading-none tracking-[-.05em] sm:text-5xl">
                {active?.workoutName ?? next?.name ?? t('freeWorkout')}
              </h2>
              <p className="mt-3 font-bold opacity-65">
                {active
                  ? t('resumeWorkoutDescription')
                  : `${next?.exercises.length ?? 0} ${t('workoutOverview')}`}
              </p>
              <button
                disabled={!next && !active}
                onClick={start}
                className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-ink px-6 text-lg font-black text-white shadow-xl transition active:scale-[.98] sm:w-auto sm:min-w-64"
              >
                <Play size={22} fill="currentColor" />
                {active ? t('resumeWorkout') : t('startWorkout')}
              </button>
            </div>
          </section>
          <section>
            <SectionHeader
              title={t('thisWeek')}
              action={t('viewHistory')}
              onAction={() => nav('/history')}
            />
            <div className="surface-panel grid grid-cols-[1fr_auto] items-center gap-5 rounded-3xl p-5 sm:p-6">
              <div>
                <p className="text-3xl font-black tracking-tight">
                  <bdi>{weekly}</bdi> {t('of')} <bdi>{goal}</bdi>
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-400">{t('workoutsComplete')}</p>
                <div className="mt-5">
                  <ProgressBar value={weeklyPct} label={t('weeklyWorkoutGoal')} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-400">
                  <Flame size={17} className="text-orange-400" />
                  <span><bdi>{streak}</bdi> {t('weekStreak')}</span>
                </div>
              </div>
              <ProgressRing value={weeklyPct} label={t('weeklyProgress')} />
            </div>
          </section>
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <SectionHeader
                title={t('currentGoal')}
                action={t('allGoals')}
                onAction={() => nav('/goals')}
              />
              {goals[0] ? (
                <button
                  onClick={() => nav('/goals')}
                  className="card flex w-full items-center gap-4 text-left transition hover:-translate-y-0.5"
                >
                  <IconTile>
                    <Target />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">{goals[0].title}</h3>
                    <p className="text-sm text-slate-400">{t('focusMessage')}</p>
                  </div>
                  <ChevronRight className="directional-icon text-slate-600" />
                </button>
              ) : (
                <button
                  onClick={() => nav('/goals')}
                  className="card flex w-full items-center gap-4 text-left"
                >
                  <IconTile>
                    <Target />
                  </IconTile>
                  <div className="flex-1">
                    <h3 className="font-black">{t('setNextTarget')}</h3>
                    <p className="text-sm text-slate-400">{t('goalPurpose')}</p>
                  </div>
                  <ArrowUpRight className="directional-icon" />
                </button>
              )}
            </section>
            <section>
              <SectionHeader
                title={t('personalBest')}
                action={t('progress')}
                onAction={() => nav('/progress')}
              />
              <div className="card flex items-center gap-4">
                <IconTile tone="orange">
                  <Trophy />
                </IconTile>
                <div className="flex-1">
                  {topRecord ? (
                    <>
                      <p className="text-sm font-bold text-slate-400">
                        {resolveExerciseName(
                          exercises,
                          topRecord.exerciseId,
                          language,
                          t('exerciseUnavailable'),
                        )}
                      </p>
                      <p className="text-3xl font-black">
                        <bdi>
                          {topRecord.measurementType === 'duration'
                            ? formatDuration(topRecord.longestHold, language)
                            : topRecord.measurementType === 'weighted_reps'
                              ? formatAddedWeight(topRecord.heaviestAddedWeight, language)
                              : formatReps(topRecord.bestSet, language)}
                        </bdi>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-black">{t('firstPrWaiting')}</p>
                      <p className="text-sm text-slate-400">
                        {t('completeWorkoutBaseline')}
                      </p>
                    </>
                  )}
                </div>
                <Medal className="text-slate-700" />
              </div>
            </section>
          </div>
          <section>
            <SectionHeader
              title={t('recentWorkout')}
              action={t('history')}
              onAction={() => nav('/history')}
            />
            {last ? (
              <button
                onClick={() => nav(`/history/${last.id}`)}
                className="card flex w-full items-center gap-4 text-left transition hover:-translate-y-0.5"
              >
                <IconTile tone="blue">
                  <CalendarDays />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black">{last.workoutName}</h3>
                  <p className="text-sm font-semibold text-slate-400">
                    {new Date(last.completedAt ?? last.startedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · <bdi>{workoutSummary(last).totalSets}</bdi> {t('sets')}
                  </p>
                </div>
                <ChevronRight className="directional-icon text-slate-600" />
              </button>
            ) : (
              <div className="card flex items-center gap-4">
                <IconTile tone="blue">
                  <CalendarDays />
                </IconTile>
                <div>
                  <p className="font-black">{t('noCompletedWorkouts')}</p>
                  <p className="text-sm text-slate-400">{t('trainingStoryEmpty')}</p>
                </div>
              </div>
            )}
          </section>
          <div className="surface-subtle flex items-start gap-3 rounded-3xl p-5 text-sm text-slate-500 dark:text-slate-400">
            <Sparkles className="mt-0.5 shrink-0 text-brand" size={18} />
            <p>
              <strong className="text-slate-950 dark:text-white">{t('consistencyTitle')}</strong>{' '}
              {t('consistencyMessage')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
