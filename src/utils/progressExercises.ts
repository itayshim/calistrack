import type { Exercise, MeasurementType, WorkoutSession } from '../types';
import { findExerciseByReference } from './exerciseLocalization';
import {
  getSetAddedWeight,
  getSetDuration,
  getSetReps,
  isValidSetInput,
  normalizeMeasurementType,
} from './performance';

export interface ProgressExerciseSummary {
  exercise: Exercise;
  exerciseId: string;
  lastPerformedAt: string;
  completedSetCount: number;
  sessionCount: number;
  latestMetric: number;
  personalBest: number;
  measurementType: MeasurementType;
}

const canonicalKey = (exercise: Exercise) =>
  exercise.stableKey ?? exercise.canonicalExerciseId ?? exercise.id;

export function uniqueCanonicalExercises(exercises: Exercise[]): Exercise[] {
  const unique = new Map<string, Exercise>();
  for (const exercise of exercises) {
    const key = canonicalKey(exercise);
    const current = unique.get(key);
    if (!current || exercise.source === 'global') unique.set(key, exercise);
  }
  return [...unique.values()];
}

function validMetric(
  set: WorkoutSession['exercises'][number]['sets'][number],
  type: MeasurementType,
) {
  const input =
    type === 'duration'
      ? { durationSeconds: getSetDuration(set, type) }
      : type === 'weighted_reps'
        ? { reps: getSetReps(set, type), addedWeightKg: getSetAddedWeight(set) }
        : { reps: getSetReps(set, type) };
  if (!isValidSetInput(input, type)) return null;
  return type === 'duration'
    ? input.durationSeconds ?? 0
    : type === 'weighted_reps'
      ? input.addedWeightKg ?? 0
      : input.reps ?? 0;
}

export function buildProgressExerciseSummaries(
  exercises: Exercise[],
  sessions: WorkoutSession[],
): ProgressExerciseSummary[] {
  const library = uniqueCanonicalExercises(exercises);
  const byExercise = new Map<string, {
    exercise: Exercise;
    lastPerformedAt: string;
    completedSetCount: number;
    sessionIds: Set<string>;
    latestMetric: number;
    personalBest: number;
    measurementType: MeasurementType;
  }>();

  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const performedAt = session.completedAt ?? session.startedAt;
    for (const exerciseSession of session.exercises) {
      const exercise = findExerciseByReference(library, exerciseSession.exerciseId);
      if (!exercise) continue;
      const type = normalizeMeasurementType(
        exerciseSession.measurementType ??
          exerciseSession.target?.measurementType ??
          exercise.measurementType,
      );
      const values = exerciseSession.sets
        .filter((set) => set.completed)
        .map((set) => validMetric(set, type))
        .filter((value): value is number => value !== null);
      if (!values.length) continue;
      const key = canonicalKey(exercise);
      const current = byExercise.get(key);
      const sessionBest = Math.max(...values);
      if (!current) {
        byExercise.set(key, {
          exercise,
          lastPerformedAt: performedAt,
          completedSetCount: values.length,
          sessionIds: new Set([session.id]),
          latestMetric: sessionBest,
          personalBest: sessionBest,
          measurementType: type,
        });
        continue;
      }
      current.completedSetCount += values.length;
      current.sessionIds.add(session.id);
      current.personalBest = Math.max(current.personalBest, sessionBest);
      if (Date.parse(performedAt) >= Date.parse(current.lastPerformedAt)) {
        current.lastPerformedAt = performedAt;
        current.latestMetric = sessionBest;
        current.measurementType = type;
      }
    }
  }

  return [...byExercise.values()]
    .map((summary) => ({
      ...summary,
      exerciseId: summary.exercise.id,
      sessionCount: summary.sessionIds.size,
    }))
    .sort(
      (a, b) =>
        Date.parse(b.lastPerformedAt) - Date.parse(a.lastPerformedAt) ||
        a.exercise.nameEn.localeCompare(b.exercise.nameEn),
    );
}
