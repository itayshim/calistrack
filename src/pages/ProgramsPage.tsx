import {
  CalendarDays,
  ChevronRight,
  Copy,
  Dumbbell,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, EmptyState, ProgressBar } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
export function ProgramsPage() {
  const { t } = useI18n();
  const programs = useAppStore((s) => s.programs),
    adopt = useAppStore((s) => s.adoptBeginner),
    start = useAppStore((s) => s.startWorkout),
    nav = useNavigate();
  const launch = (workout: (typeof programs)[number]['workouts'][number]) => {
    if (start(workout)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
    else nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">{t('programEyebrow')}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('program')}</h1>
          <p className="mt-2 text-slate-400">{t('programSubtitle')}</p>
        </div>
        <Link
          aria-label={t('createProgram')}
          to="/program/new"
          className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-ink shadow-glow"
        >
          <Plus size={26} />
        </Link>
      </header>
      {!programs.length ? (
        <>
          <section className="relative overflow-hidden rounded-4xl bg-brand p-7 text-ink shadow-glow">
            <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
            <Badge>{t('recommendedStart')}</Badge>
            <h2 className="mt-6 text-4xl font-black tracking-[-.05em]">{t('beginnerProgramName')}</h2>
            <p className="mt-3 max-w-lg font-semibold opacity-70">{t('beginnerProgramDescription')}</p>
            <div className="mt-6 flex items-center gap-5 text-sm font-black">
              <span>{t('daysPerWeek')}</span>
              <span>•</span>
              <span>{t('beginner')}</span>
            </div>
            <button
              className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 font-black text-white sm:w-auto"
              onClick={adopt}
            >
              <Copy size={18} />
              {t('useProgram')}
            </button>
          </section>
          <EmptyState
            icon={<Dumbbell size={34} />}
            title={t('preferOwnStructure')}
            description={t('customProgramDescription')}
            action={t('createCustomProgram')}
            onAction={() => nav('/program/new')}
          />
        </>
      ) : (
        programs.map((program) => (
          <section key={program.id}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Badge tone="brand">{t('activeProgram')}</Badge>
                <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{program.name}</h2>
              </div>
              <Link
                aria-label={`Edit ${program.name}`}
                to={`/program/${program.id}`}
                className="icon-button"
              >
                <MoreHorizontal />
              </Link>
            </div>
            <div className="space-y-3">
              {program.workouts.map((workout, index) => (
                <article key={workout.id} className="card p-0 transition hover:-translate-y-0.5">
                  <button
                    onClick={() => launch(workout)}
                    className="flex w-full items-center gap-4 p-5 text-start"
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/15 text-lime-700 dark:bg-white/[.06] dark:text-brand">
                      <span className="text-xl font-black">{String.fromCharCode(65 + index)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-black">{workout.name}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
                        <CalendarDays size={14} />
                        <span><bdi>{workout.exercises.length}</bdi> {t('exercisesCount')}</span><span aria-hidden="true">·</span><span>{t('approxMinutes')}</span>
                      </p>
                      <div className="mt-3">
                        <ProgressBar value={0} label={`${workout.name} progress`} />
                      </div>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-ink">
                      <Play size={19} fill="currentColor" />
                    </span>
                  </button>
                </article>
              ))}
            </div>
            <Link
              to={`/program/${program.id}`}
              className="mt-4 flex items-center justify-center gap-1 py-3 text-sm font-black text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              {t('editTrainingWeek')} <ChevronRight className="directional-icon" size={16} />
            </Link>
          </section>
        ))
      )}
    </div>
  );
}
