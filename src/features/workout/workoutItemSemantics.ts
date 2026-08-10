import type { Exercise, SkillWarmupItem, WorkoutExercise } from '../../types';

export function resolveLightweightExercise(
  exercises: Exercise[],
  item?: Pick<SkillWarmupItem, 'exerciseId' | 'stableKey'>,
) {
  if (!item) return undefined;
  return exercises.find((exercise) => exercise.stableKey === item.stableKey)
    ?? exercises.find((exercise) => exercise.id === item.exerciseId);
}

export function usesInstructionalExerciseVisual({
  phase,
  workoutExercise,
  exercise,
}: {
  phase?: 'warm_up' | 'cool_down';
  workoutExercise?: Pick<WorkoutExercise, 'managedSectionKind' | 'skillSection' | 'skillRole'>;
  exercise?: Pick<Exercise, 'category'>;
}) {
  return phase === 'warm_up'
    || phase === 'cool_down'
    || workoutExercise?.managedSectionKind === 'warm_up'
    || workoutExercise?.managedSectionKind === 'cool_down'
    || workoutExercise?.skillSection === 'warm-up'
    || workoutExercise?.skillRole === 'recovery'
    || exercise?.category === 'mobility';
}
