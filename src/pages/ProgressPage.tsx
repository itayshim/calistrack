import { Award, ChartNoAxesColumnIncreasing, Dumbbell, Flame, TrendingUp, Trophy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Select, type SelectOption } from '../components/SelectMenu';
import { Badge, IconTile, SectionHeader } from '../components/ui';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { findExerciseByReference, getExerciseName } from '../utils/exerciseLocalization';
import { searchExercises } from '../utils/exerciseSearch';
import { formatAddedWeight, formatDuration, formatReps } from '../utils/performance';
import {
  buildProgressExerciseSummaries,
  uniqueCanonicalExercises,
} from '../utils/progressExercises';
import { getRecommendation } from '../utils/recommendations';
import { exercisePoints } from '../utils/stats';

type ExerciseScope = 'history' | 'all';

export function ProgressPage() {
  const { t, language } = useI18n();
  const exercises = useAppStore((state) => state.exercises);
  const sessions = useAppStore((state) => state.workoutSessions);
  const theme = useAppStore((state) => state.settings.theme);
  const [requestedId, setRequestedId] = useState('');
  const [scope, setScope] = useState<ExerciseScope>('history');
  const [mode, setMode] = useState<'best' | 'total'>('best');
  const [range, setRange] = useState(0);

  const canonicalExercises = useMemo(
    () => uniqueCanonicalExercises(exercises),
    [exercises],
  );
  const historyBase = useMemo(
    () => buildProgressExerciseSummaries(canonicalExercises, sessions),
    [canonicalExercises, sessions],
  );
  const history = useMemo(
    () =>
      [...historyBase].sort(
        (a, b) =>
          new Date(b.lastPerformedAt).getTime() -
            new Date(a.lastPerformedAt).getTime() ||
          getExerciseName(a.exercise, language).localeCompare(
            getExerciseName(b.exercise, language),
            language,
          ),
      ),
    [historyBase, language],
  );
  const historyIds = useMemo(
    () => new Set(history.map((summary) => summary.exerciseId)),
    [history],
  );
  const allSorted = useMemo(
    () =>
      [...canonicalExercises].sort((a, b) =>
        getExerciseName(a, language).localeCompare(getExerciseName(b, language)),
      ),
    [canonicalExercises, language],
  );
  const scopedExercises =
    scope === 'history' ? history.map((summary) => summary.exercise) : allSorted;
  const fallbackId =
    scope === 'history'
      ? history[0]?.exerciseId ?? ''
      : history[0]?.exerciseId ?? allSorted[0]?.id ?? '';
  const selectedAllowed = scopedExercises.some((exercise) => exercise.id === requestedId);
  const id = selectedAllowed ? requestedId : fallbackId;
  const exercise = canonicalExercises.find((item) => item.id === id);
  const hasSelectedHistory = historyIds.has(id);
  const historyById = useMemo(
    () => new Map(history.map((summary) => [summary.exerciseId, summary])),
    [history],
  );
  const options = useMemo<SelectOption[]>(
    () =>
      scopedExercises.map((item) => {
        const summary = historyById.get(item.id);
        const date = summary
          ? new Date(summary.lastPerformedAt).toLocaleDateString(
              language === 'he' ? 'he-IL' : 'en-US',
              { month: 'short', day: 'numeric' },
            )
          : '';
        return {
          value: item.id,
          label: getExerciseName(item, language),
          description: summary ? t('lastPerformed').replace('{date}', date) : undefined,
        };
      }),
    [historyById, language, scopedExercises, t],
  );
  const filterOptions = useCallback(
    (currentOptions: SelectOption[], query: string) => {
      if (!query.trim()) return currentOptions;
      const matches = searchExercises(scopedExercises, query);
      const byId = new Map(currentOptions.map((option) => [option.value, option]));
      return matches.flatMap((match) => {
        const option = byId.get(match.id);
        return option ? [option] : [];
      });
    },
    [scopedExercises],
  );

  const points = useMemo(
    () =>
      exercisePoints(sessions, id, canonicalExercises).filter(
        (point) => !range || Date.parse(point.date) >= Date.now() - range * 864e5,
      ),
    [canonicalExercises, sessions, id, range],
  );
  const all = useMemo(
    () => exercisePoints(sessions, id, canonicalExercises),
    [canonicalExercises, sessions, id],
  );
  const best = all.length ? Math.max(...all.map((point) => point.best)) : 0;
  const latest = all.at(-1);
  const target = sessions
    .flatMap((session) => session.exercises)
    .find((item) => findExerciseByReference(canonicalExercises, item.exerciseId)?.id === id)
    ?.target;
  const recommendation =
    target && exercise?.measurementType === 'reps'
      ? getRecommendation(sessions, id, target.targetMin, target.targetMax, target.targetSets)
      : null;
  const formatMetric = (value: number) =>
    exercise?.measurementType === 'duration'
      ? formatDuration(value, language)
      : exercise?.measurementType === 'weighted_reps'
        ? formatAddedWeight(value, language)
        : formatReps(value, language);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{t('progressEyebrow')}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('progress')}</h1>
        <p className="mt-2 text-slate-400">{t('progressSubtitle')}</p>
      </header>

      <section className="card space-y-4 p-4">
        <fieldset>
          <legend className="label">{t('progressExerciseScope')}</legend>
          <div className="surface-subtle grid grid-cols-2 rounded-2xl p-1" role="group">
            {(['history', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
                  scope === value
                    ? 'bg-brand text-ink shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                onClick={() => setScope(value)}
              >
                {value === 'history' ? t('exercisesWithHistory') : t('allExercises')}
              </button>
            ))}
          </div>
        </fieldset>
        {(scope === 'all' || history.length > 0) && (
          <Select
            label={t('exercise')}
            value={id}
            onChange={setRequestedId}
            searchable
            searchLabel={t('searchExercises')}
            options={options}
            filterOptions={filterOptions}
            testId="progress-exercise-select"
          />
        )}
      </section>

      {scope === 'history' && history.length === 0 ? (
        <ProgressEmptyState
          title={t('noExerciseProgress')}
          description={t('noExerciseProgressDescription')}
          action={t('viewProgram')}
        />
      ) : !exercise || !hasSelectedHistory ? (
        <ProgressEmptyState
          title={t('noProgressForExercise')}
          description={t('noProgressForExerciseDescription')}
          action={t('viewProgram')}
        />
      ) : (
        <>
          <div data-tour-id="progress-summary" className="grid grid-cols-3 gap-3">
            {[
              [<Flame />, all.length, t('sessionsLabel')],
              [<TrendingUp />, formatMetric(latest?.[mode] ?? 0), t('latestLabel')],
              [
                <Trophy />,
                formatMetric(best),
                exercise.measurementType === 'duration'
                  ? t('longestHold')
                  : exercise.measurementType === 'weighted_reps'
                    ? t('heaviestAddedWeight')
                    : t('personalBestLabel'),
              ],
            ].map(([icon, value, label]) => (
              <div key={String(label)} className="card min-w-0 p-3 sm:p-5">
                <span className="text-brand">{icon}</span>
                <strong className="mt-4 block truncate text-2xl font-black tracking-tight sm:text-3xl">
                  {value}
                </strong>
                <span className="block text-[10px] font-black tracking-wider text-slate-500">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title={t('performanceTrend')} />
              <div className="surface-subtle flex rounded-xl p-1">
                {(['best', 'total'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-black ${
                      mode === value
                        ? 'bg-white text-slate-950 shadow-sm dark:bg-white/[.1] dark:text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {value === 'best' ? t('bestSetLabel') : t('totalLabel')}
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
                      {t('chartNeedsTwoWorkouts')}
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points.map((point) => ({
                      ...point,
                      label: new Date(point.date).toLocaleDateString(
                        language === 'he' ? 'he-IL' : 'en-US',
                        { month: 'short', day: 'numeric' },
                      ),
                    }))}
                  >
                    <defs>
                      <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b7f36b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#b7f36b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={theme === 'dark' ? '#263035' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#68747a', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} width={28} tick={{ fill: '#68747a', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: theme === 'dark' ? '#171e22' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#0f172a',
                        border: theme === 'dark' ? '1px solid #263035' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                      }}
                    />
                    <Area type="monotone" dataKey={mode} stroke="#b7f36b" strokeWidth={3} fill="url(#progressFill)" />
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
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRange(Number(value))}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    range === value
                      ? 'bg-brand text-ink'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/[.05]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {recommendation && (
            <section className="card border-brand/30 bg-lime-50 dark:bg-[#182019]">
              <div className="flex gap-4">
                <IconTile><Award /></IconTile>
                <div>
                  <Badge tone="brand">{t('coachingInsight')}</Badge>
                  <h2 className="mt-3 text-xl font-black">{t('readyForNext')}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {recommendation.message}
                  </p>
                  {exercise.harderExerciseId && recommendation.kind === 'progress' && (
                    <p className="mt-3 text-sm font-black text-brand">
                      {(() => {
                        const harder = canonicalExercises.find(
                          (item) => item.id === exercise.harderExerciseId,
                        );
                        return harder ? getExerciseName(harder, language) : '';
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ProgressEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <section className="card grid min-h-72 place-items-center text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand/15 text-brand">
          <Dumbbell size={30} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-black">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-slate-500 dark:text-slate-400">{description}</p>
        <Link className="btn-primary mt-5" to="/program">{action}</Link>
      </div>
    </section>
  );
}
