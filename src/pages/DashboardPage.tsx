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

export function DashboardPage() {
  const { t, language } = useI18n();
  const programs = useAppStore((s) => s.programs),
    sessions = useAppStore((s) => s.workoutSessions),
    exercises = useAppStore((s) => s.exercises),
    active = useAppStore((s) => s.activeWorkout),
    goal = useAppStore((s) => s.settings.weeklyWorkoutGoal),
    goals = useAppStore((s) => s.goals),
    adopt = useAppStore((s) => s.adoptBeginner),
    nav = useNavigate();
  const weekly = weeklyCompleted(sessions),
    streak = consistencyStreak(sessions, goal),
    workouts = programs.flatMap((p) => p.workouts),
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
    <div className="space-y-8">
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
                <Badge tone="neutral">{active ? 'WORKOUT IN PROGRESS' : 'UP NEXT'}</Badge>
                <span className="flex items-center gap-1 text-xs font-black opacity-60">
                  <Clock3 size={14} />
                  ~35 MIN
                </span>
              </div>
              <h2 className="mt-7 max-w-xl text-4xl font-black leading-none tracking-[-.05em] sm:text-5xl">
                {active?.workoutName ?? next?.name ?? 'Free workout'}
              </h2>
              <p className="mt-3 font-bold opacity-65">
                {active
                  ? 'Pick up exactly where you left off.'
                  : `${next?.exercises.length ?? 0} exercises · Full body`}
              </p>
              <button
                disabled={!next && !active}
                onClick={start}
                className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-ink px-6 text-lg font-black text-white shadow-xl transition active:scale-[.98] sm:w-auto sm:min-w-64"
              >
                <Play size={22} fill="currentColor" />
                {active ? 'Resume workout' : 'Start workout'}
              </button>
            </div>
          </section>
          <section>
            <SectionHeader
              title="This week"
              action="View history"
              onAction={() => nav('/history')}
            />
            <div className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-3xl bg-panel p-5 shadow-soft sm:p-6">
              <div>
                <p className="text-3xl font-black tracking-tight">
                  {weekly} of {goal}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-400">{t('workoutsComplete')}</p>
                <div className="mt-5">
                  <ProgressBar value={weeklyPct} label="Weekly workout goal" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-400">
                  <Flame size={17} className="text-orange-400" />
                  <span>{streak} week streak</span>
                </div>
              </div>
              <ProgressRing value={weeklyPct} label="Weekly progress" />
            </div>
          </section>
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <SectionHeader
                title="Current goal"
                action="All goals"
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
                  <ChevronRight className="text-slate-600" />
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
                  <ArrowUpRight />
                </button>
              )}
            </section>
            <section>
              <SectionHeader
                title="Personal best"
                action="Progress"
                onAction={() => nav('/progress')}
              />
              <div className="card flex items-center gap-4">
                <IconTile tone="orange">
                  <Trophy />
                </IconTile>
                <div className="flex-1">
                  {topRecord ? (
                    <>
                      <p className="text-sm font-bold text-slate-400">{topRecord.name}</p>
                      <p className="text-3xl font-black">
                        {topRecord.bestSet}{' '}
                        <span className="text-base text-slate-500">
                          {topRecord.measurementType === 'time' ? 'sec' : 'reps'}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-black">{t('firstPrWaiting')}</p>
                      <p className="text-sm text-slate-400">
                        Complete a workout to set the baseline.
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
              title="Recent workout"
              action="History"
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
                    {new Date(last.completedAt ?? last.startedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {workoutSummary(last).totalSets} sets
                  </p>
                </div>
                <ChevronRight className="text-slate-600" />
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
          <div className="flex items-start gap-3 rounded-3xl bg-white/[.035] p-5 text-sm text-slate-400">
            <Sparkles className="mt-0.5 shrink-0 text-brand" size={18} />
            <p>
              <strong className="text-white">{t('consistencyTitle')}</strong>{' '}
              {t('consistencyMessage')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
