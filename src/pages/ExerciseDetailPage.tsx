import { ArrowLeft, CheckCircle2, Dumbbell, Lightbulb, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge, IconTile } from '../components/ui';
import {
  ExerciseDemonstrationButton,
} from '../components/ExerciseDemonstration';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
import {
  getExerciseDescription,
  getExerciseInstructions,
  getExerciseMistakes,
  getExerciseName,
  hasExerciseDemonstration,
} from '../utils/exerciseLocalization';
export function ExerciseDetailPage() {
  const { id } = useParams(),
    exercise = useAppStore((s) => s.exercises.find((e) => e.id === id)),
    { language, t } = useI18n();
  if (!exercise) return <div className="card">{t('exerciseNoLongerAvailable')}</div>;
  return (
    <article className="mx-auto max-w-3xl">
      <Link
        to="/exercises"
        className="mb-7 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="directional-icon" size={18} />
        {t('exerciseLibrary')}
      </Link>
      <section className="relative overflow-hidden rounded-4xl bg-brand p-7 text-ink shadow-glow sm:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[32px] border-ink/[.06]" />
        <Badge>
          {exercise.category.toUpperCase()} · {exercise.difficulty.toUpperCase()}
        </Badge>
        <div className="mt-12 grid h-20 w-20 place-items-center rounded-3xl bg-ink text-brand">
          <Dumbbell size={36} />
        </div>
        <h1 className="relative mt-6 text-5xl font-black leading-none tracking-[-.06em] sm:text-6xl">
          {getExerciseName(exercise, language)}
        </h1>
        <p className="relative mt-4 max-w-xl text-lg font-semibold opacity-70">
          {getExerciseDescription(exercise, language)}
        </p>
      </section>
      <div className="mt-6 grid gap-5">
        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <IconTile>
              <Lightbulb />
            </IconTile>
            <h2 className="text-2xl font-black">{t('howToPerform')}</h2>
          </div>
          <ol className="space-y-4">
            {getExerciseInstructions(exercise, language).map((instruction, index) => (
              <li key={instruction} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-ink">
                  {index + 1}
                </span>
                <p className="pt-1 font-semibold text-slate-300">{instruction}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <IconTile tone="orange">
              <TriangleAlert />
            </IconTile>
            <h2 className="text-2xl font-black">{t('watchOutFor')}</h2>
          </div>
          <ul className="space-y-3">
            {getExerciseMistakes(exercise, language).map((mistake) => (
              <li
                key={mistake}
                className="flex items-center gap-3 rounded-2xl bg-orange-500/[.07] p-4 font-semibold text-slate-300"
              >
                <CheckCircle2 size={19} className="text-orange-300" />
                {mistake}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {hasExerciseDemonstration(exercise) && (
        <section className="card mt-5">
          <h2 className="text-2xl font-black">{t('demonstration')}</h2>
          <ExerciseDemonstrationButton exercise={exercise} className="mt-4 w-full sm:w-auto" />
        </section>
      )}
    </article>
  );
}
