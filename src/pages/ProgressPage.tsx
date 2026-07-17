import { Award, ChartNoAxesColumnIncreasing, Flame, TrendingUp, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, IconTile, SectionHeader } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { exercisePoints } from '../utils/stats';
import { getRecommendation } from '../utils/recommendations';
import { useI18n } from '../hooks/useI18n';
import { getExerciseName } from '../utils/exerciseLocalization';
export function ProgressPage() {
  const { t, language } = useI18n();
  const exercises = useAppStore((s) => s.exercises),
    sessions = useAppStore((s) => s.workoutSessions),
    theme = useAppStore((s) => s.settings.theme),
    [id, setId] = useState(exercises[0]?.id ?? ''),
    [mode, setMode] = useState<'best' | 'total'>('best'),
    [range, setRange] = useState(0),
    exercise = exercises.find((e) => e.id === id),
    points = useMemo(
      () =>
        exercisePoints(sessions, id).filter(
          (x) => !range || Date.parse(x.date) >= Date.now() - range * 864e5,
        ),
      [sessions, id, range],
    ),
    all = exercisePoints(sessions, id),
    best = all.length ? Math.max(...all.map((x) => x.best)) : 0,
    latest = all.at(-1),
    target = sessions.flatMap((s) => s.exercises).find((x) => x.exerciseId === id)?.target,
    recommendation = target
      ? getRecommendation(sessions, id, target.targetMin, target.targetMax, target.targetSets)
      : null;
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{t('progressEyebrow')}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('progress')}</h1>
        <p className="mt-2 text-slate-400">{t('progressSubtitle')}</p>
      </header>
      <section className="card p-4">
        <label className="sr-only" htmlFor="progress-exercise">
          Exercise
        </label>
        <select
          id="progress-exercise"
          className="field text-xl font-black"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {getExerciseName(e, language)}
            </option>
          ))}
        </select>
      </section>
      <div className="grid grid-cols-3 gap-3">
        {[
          [<Flame />, all.length, 'SESSIONS'],
          [<TrendingUp />, latest?.[mode] ?? 0, 'LATEST'],
          [<Trophy />, best, 'PERSONAL BEST'],
        ].map(([icon, value, label]) => (
          <div key={String(label)} className="card p-4 sm:p-5">
            <span className="text-brand">{icon}</span>
            <strong className="mt-4 block text-3xl font-black tracking-tight">{value}</strong>
            <span className="text-[10px] font-black tracking-wider text-slate-500">{label}</span>
          </div>
        ))}
      </div>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Performance trend" />
          <div className="surface-subtle flex rounded-xl p-1">
            {(['best', 'total'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                className={`rounded-lg px-3 py-2 text-xs font-black ${mode === v ? 'bg-white text-slate-950 shadow-sm dark:bg-white/[.1] dark:text-white' : 'text-slate-500'}`}
              >
                {v === 'best' ? 'BEST SET' : 'TOTAL'}
              </button>
            ))}
          </div>
        </div>
        <div className="card h-[21rem] p-3 sm:p-5">
          {points.length < 2 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <ChartNoAxesColumnIncreasing className="mx-auto text-slate-700" size={44} />
                <h3 className="mt-4 text-xl font-black">{t('trendBeginning')}</h3>
                <p className="mt-2 max-w-xs text-sm text-slate-400">
                  Log this exercise in two workouts to unlock the chart.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points.map((p) => ({
                  ...p,
                  label: new Date(p.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  }),
                }))}
              >
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b7f36b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#b7f36b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme === 'dark' ? '#263035' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#68747a', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tick={{ fill: '#68747a', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: theme === 'dark' ? '#171e22' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#0f172a',
                    border: theme === 'dark' ? '1px solid #263035' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={mode}
                  stroke="#b7f36b"
                  strokeWidth={3}
                  fill="url(#progressFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {[
            [30, '1M'],
            [90, '3M'],
            [180, '6M'],
            [0, 'ALL'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setRange(Number(v))}
              className={`rounded-full px-4 py-2 text-xs font-black ${range === v ? 'bg-brand text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/[.05]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </section>
      {recommendation && (
        <section className="card border-brand/30 bg-lime-50 dark:bg-[#182019]">
          <div className="flex gap-4">
            <IconTile>
              <Award />
            </IconTile>
            <div>
              <Badge tone="brand">{t('coachingInsight')}</Badge>
              <h2 className="mt-3 text-xl font-black">{t('readyForNext')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {recommendation.message}
              </p>
              {exercise?.harderExerciseId && recommendation.kind === 'progress' && (
                <p className="mt-3 text-sm font-black text-brand">
                  {(() => {
                    const harder = exercises.find((e) => e.id === exercise.harderExerciseId);
                    return harder ? getExerciseName(harder, language) : '';
                  })()}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
