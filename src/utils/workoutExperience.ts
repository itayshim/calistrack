import type {
  Exercise,
  ExerciseSession,
  MeasurementType,
  WorkoutSession,
  WorkoutSet,
  WorkoutSetInput,
} from '../types';
import {
  getSetAddedWeight,
  getSetDuration,
  getSetReps,
  isValidSetInput,
} from './performance';

export interface PreviousPerformance {
  completedAt: string;
  sets: WorkoutSet[];
}

export function getPreviousPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
  beforeStartedAt?: string,
): PreviousPerformance | null {
  const before = beforeStartedAt ? Date.parse(beforeStartedAt) : Number.POSITIVE_INFINITY;
  const match = sessions
    .filter(
      (session) =>
        session.status === 'completed' &&
        Date.parse(session.completedAt ?? session.startedAt) < before,
    )
    .sort(
      (a, b) =>
        Date.parse(b.completedAt ?? b.startedAt) -
        Date.parse(a.completedAt ?? a.startedAt),
    )
    .find((session) =>
      session.exercises.some(
        (exercise) =>
          exercise.exerciseId === exerciseId &&
          exercise.sets.some((set) => set.completed),
      ),
    );
  if (!match) return null;
  const exercise = match.exercises.find(
    (item) =>
      item.exerciseId === exerciseId && item.sets.some((set) => set.completed),
  );
  return exercise
    ? {
        completedAt: match.completedAt ?? match.startedAt,
        sets: exercise.sets.filter((set) => set.completed),
      }
    : null;
}

export function copySetInput(
  set: WorkoutSet,
  measurementType: MeasurementType,
): WorkoutSetInput {
  if (measurementType === 'duration') {
    return { durationSeconds: getSetDuration(set, measurementType) };
  }
  if (measurementType === 'weighted_reps') {
    return {
      reps: getSetReps(set, measurementType),
      addedWeightKg: getSetAddedWeight(set),
    };
  }
  return { reps: getSetReps(set, measurementType) };
}

export function validEnteredSet(
  set: WorkoutSet | undefined,
  measurementType: MeasurementType,
): boolean {
  return Boolean(
    set &&
      isValidSetInput(
        copySetInput(set, measurementType),
        measurementType,
      ),
  );
}

const difficultyIndex = { beginner: 0, intermediate: 1, advanced: 2 };

export function rankReplacementExercises(
  current: Exercise,
  exercises: Exercise[],
): Exercise[] {
  return exercises
    .filter((exercise) => exercise.id !== current.id)
    .map((exercise) => ({
      exercise,
      score:
        (exercise.movementFamily === current.movementFamily ? 10_000 : 0) +
        (exercise.measurementType === current.measurementType ? 4_000 : 0) +
        (exercise.category === current.category ? 2_000 : 0) +
        (2 - Math.abs(difficultyIndex[exercise.difficulty] - difficultyIndex[current.difficulty])) *
          300 +
        (exercise.media?.some((media) => media.isPublished) ? 50 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.exercise.progressionOrder ?? 0) - (b.exercise.progressionOrder ?? 0) ||
        a.exercise.nameEn.localeCompare(b.exercise.nameEn),
    )
    .map(({ exercise }) => exercise);
}

export const completedSetCount = (exercise: ExerciseSession) =>
  exercise.sets.filter((set) => set.completed).length;
