import { Search, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import type { Exercise } from '../types';
import { getExerciseName } from '../utils/exerciseLocalization';
import { searchExercises } from '../utils/exerciseSearch';
import {
  completedSetCount,
  rankReplacementExercises,
} from '../utils/workoutExperience';
import { Select } from './SelectMenu';

export function ExerciseReplacementSheet({
  open,
  exerciseIndex,
  current,
  onClose,
  onReplaced,
}: {
  open: boolean;
  exerciseIndex: number;
  current: Exercise;
  onClose: () => void;
  onReplaced: () => void;
}) {
  const { t, language } = useI18n();
  const store = useAppStore();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [pending, setPending] = useState<Exercise | null>(null);
  const [targetConfiguration, setTargetConfiguration] = useState({
    targetSets: 3,
    targetMin: 5,
    targetMax: 8,
    targetAddedWeightKg: 0,
  });
  const activeExercise = store.activeWorkout?.exercises[exerciseIndex];
  const completed = activeExercise ? completedSetCount(activeExercise) : 0;
  const families = [...new Set(store.exercises.map((exercise) => exercise.movementFamily).filter(Boolean))] as string[];
  const candidates = useMemo(() => {
    const ranked = rankReplacementExercises(current, store.exercises);
    const searched = query ? searchExercises(ranked, query) : ranked;
    return searched.filter((exercise) => !family || exercise.movementFamily === family);
  }, [current, family, query, store.exercises]);

  if (!open) return null;
  const replace = (keepCompleted: boolean, updateProgram = false) => {
    if (!pending) return;
    store.replaceActiveExercise(exerciseIndex, pending.id, {
      keepCompleted,
      updateProgram,
      targetConfiguration:
        updateProgram && pending.measurementType !== current.measurementType
          ? targetConfiguration
          : undefined,
    });
    setPending(null);
    setQuery('');
    setFamily('');
    onReplaced();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:justify-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('replaceExercise')}
        className="modal-surface max-h-[min(90dvh,52rem)] w-full overflow-y-auto rounded-4xl p-5 sm:max-w-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{t('suggestedAlternatives')}</p>
            <h2 className="text-2xl font-black">{t('replaceExercise')}</h2>
          </div>
          <button className="icon-button" aria-label={t('close')} onClick={onClose}>×</button>
        </div>
        <label className="relative mt-5 block">
          <span className="sr-only">{t('searchAlternatives')}</span>
          <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
          <input className="field ps-12" placeholder={t('searchAlternatives')} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <Select
          className="mt-3"
          label={t('movementFamily')}
          value={family}
          onChange={setFamily}
          searchable
          searchLabel={t('searchAlternatives')}
          options={[{ value: '', label: t('allMovementFamilies') }, ...families.map((item) => ({ value: item, label: item }))]}
        />
        <div className="mt-4 grid gap-3">
          {candidates.slice(0, 30).map((exercise) => {
            const sameType = exercise.measurementType === current.measurementType;
            const sameFamily = exercise.movementFamily === current.movementFamily;
            return (
              <button
                key={exercise.id}
                className="surface-subtle flex min-h-20 w-full items-center justify-between gap-3 rounded-2xl p-4 text-start"
                onClick={() => {
                  setPending(exercise);
                  setTargetConfiguration({
                    targetSets: activeExercise?.target?.targetSets ?? 3,
                    targetMin: exercise.measurementType === 'duration' ? 20 : 5,
                    targetMax: exercise.measurementType === 'duration' ? 30 : 8,
                    targetAddedWeightKg: 0,
                  });
                }}
              >
                <span className="min-w-0">
                  <strong className="block truncate">{getExerciseName(exercise, language)}</strong>
                  <span className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                    <span>{exercise.category}</span><span>·</span><span>{exercise.difficulty}</span><span>·</span><span>{exercise.measurementType === 'reps' ? t('repetitionsMeasurement') : exercise.measurementType === 'duration' ? t('durationMeasurement') : t('weightedRepsMeasurement')}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {sameFamily && <span className="chip">{t('sameMovementFamily')}</span>}
                    {sameType && <span className="chip">{t('sameMeasurementType')}</span>}
                  </span>
                </span>
                {exercise.media?.some((media) => media.isPublished) && <Video className="shrink-0 text-brand" size={20} />}
              </button>
            );
          })}
          {!candidates.length && <p className="py-8 text-center text-slate-500">{t('noCompatibleAlternatives')}</p>}
        </div>
        {pending && (
          <div className="sticky bottom-0 mt-4 rounded-3xl border border-brand/30 bg-[var(--surface)] p-4 shadow-xl">
            <h3 className="font-black">{completed ? t('replaceThisExercise') : getExerciseName(pending, language)}</h3>
            {completed > 0 && <p className="mt-2 text-sm text-slate-500">{t('completedSetsReplaceWarning').replace('{count}', String(completed))}</p>}
            {pending.measurementType !== current.measurementType && <p role="alert" className="mt-2 rounded-xl bg-orange-500/10 p-3 text-sm font-bold text-orange-600 dark:text-orange-300">{t('differentMeasurementWarning')}</p>}
            {pending.measurementType !== current.measurementType && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label><span className="label">{t('sets')}</span><input className="field" type="number" min="1" value={targetConfiguration.targetSets} onChange={(event) => setTargetConfiguration((value) => ({ ...value, targetSets: Number(event.target.value) }))} /></label>
                <label><span className="label">{t('minimum')}</span><input className="field" type="number" min="1" value={targetConfiguration.targetMin} onChange={(event) => setTargetConfiguration((value) => ({ ...value, targetMin: Number(event.target.value) }))} /></label>
                <label><span className="label">{t('maximum')}</span><input className="field" type="number" min="1" value={targetConfiguration.targetMax} onChange={(event) => setTargetConfiguration((value) => ({ ...value, targetMax: Number(event.target.value) }))} /></label>
                {pending.measurementType === 'weighted_reps' && <label><span className="label">{t('addedWeight')}</span><input className="field" type="number" min="0" step="0.5" value={targetConfiguration.targetAddedWeightKg} onChange={(event) => setTargetConfiguration((value) => ({ ...value, targetAddedWeightKg: Number(event.target.value) }))} /></label>}
              </div>
            )}
            <div className="mt-3 grid gap-2">
              {completed > 0 && <button className="btn-primary" onClick={() => replace(true)}>{t('keepCompletedSets')}</button>}
              <button className="btn-secondary" onClick={() => replace(false)}>{completed ? t('discardCompletedSets') : t('replaceOnlyWorkout')}</button>
              <button className="btn-secondary" onClick={() => replace(false, true)}>{t('replaceInProgramToo')}</button>
              <button className="btn-secondary" onClick={() => setPending(null)}>{t('cancel')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
