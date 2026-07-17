import type { WorkoutSession } from '../types';
import { getSetReps } from './performance';
export interface Recommendation {
  kind: 'progress' | 'regress';
  message: string;
  exerciseId: string;
}
export const getRecommendation = (
  sessions: WorkoutSession[],
  exerciseId: string,
  min: number,
  max: number,
  targetSets: number,
): Recommendation | null => {
  const recent = sessions
    .filter((s) => s.status === 'completed' && s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
    .slice(0, 3)
    .map((s) =>
      s.exercises
        .find((e) => e.exerciseId === exerciseId)!
        .sets.filter((x) => x.completed)
        .map((x) => getSetReps(x, 'reps') ?? 0),
    );
  if (
    recent.length >= 2 &&
    recent
      .slice(0, 2)
      .every((v) => v.length >= targetSets && v.slice(0, targetSets).every((x) => x >= max))
  )
    return {
      kind: 'progress',
      exerciseId,
      message:
        'You reached the top of the range in two consecutive workouts. Consider trying a harder variation.',
    };
  if (recent.length >= 3 && recent.every((v) => v.length < targetSets || v.some((x) => x < min)))
    return {
      kind: 'regress',
      exerciseId,
      message:
        'The range is still challenging. Consider lowering the target, resting longer, or using an easier variation.',
    };
  return null;
};
