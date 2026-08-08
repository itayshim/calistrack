import { getExerciseVisual, type ResolvedExerciseVisual } from '../../services/exerciseVisuals';

export type ExerciseVisualStatusFilter = 'all' | 'has-visual' | 'missing-visual' | 'using-fallback';
export type ExerciseVisualSource = ResolvedExerciseVisual['source'];

export function resolveAdminExerciseVisualSource(exercise: { id: string; stableKey: string }): ExerciseVisualSource {
  return getExerciseVisual(exercise).source;
}

export function matchesExerciseVisualStatus(
  source: ExerciseVisualSource,
  filter: ExerciseVisualStatusFilter,
) {
  if (filter === 'all') return true;
  if (filter === 'has-visual') return source === 'uploaded' || source === 'built-in';
  return source === 'fallback';
}
