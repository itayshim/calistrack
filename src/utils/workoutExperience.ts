import type {
  Exercise,
  ExerciseSession,
  MeasurementType,
  WorkoutSession,
  WorkoutSet,
  WorkoutSetInput,
} from '../types';
import { getSetAddedWeight, getSetDuration, getSetReps, isValidSetInput } from './performance';
import { areCanonicalExerciseIdentitiesEqual } from '../services/exerciseMerges';

export interface PreviousPerformance {
  completedAt: string;
  sets: WorkoutSet[];
}

export interface WorkoutHistoryScope {
  programId?: string;
  workoutTemplateIds?: string[];
}

export function isSessionInProgram(session: WorkoutSession, scope?: WorkoutHistoryScope): boolean {
  if (!scope) return true;
  if (session.programId && scope.programId) return session.programId === scope.programId;
  return Boolean(
    session.workoutTemplateId && scope.workoutTemplateIds?.includes(session.workoutTemplateId),
  );
}

export function getPreviousPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
  beforeStartedAt?: string,
  scope?: WorkoutHistoryScope,
): PreviousPerformance | null {
  const before = beforeStartedAt ? Date.parse(beforeStartedAt) : Number.POSITIVE_INFINITY;
  const match = sessions
    .filter(
      (session) =>
        session.status === 'completed' &&
        isSessionInProgram(session, scope) &&
        Date.parse(session.completedAt ?? session.startedAt) < before,
    )
    .sort(
      (a, b) => Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt),
    )
    .find((session) =>
      session.exercises.some(
        (exercise) =>
          areCanonicalExerciseIdentitiesEqual(exercise.exerciseId, exerciseId) && exercise.sets.some((set) => set.completed),
      ),
    );
  if (!match) return null;
  const exercise = match.exercises.find(
    (item) => areCanonicalExerciseIdentitiesEqual(item.exerciseId, exerciseId) && item.sets.some((set) => set.completed),
  );
  return exercise
    ? {
        completedAt: match.completedAt ?? match.startedAt,
        sets: exercise.sets.filter((set) => set.completed),
      }
    : null;
}

export function getBestPerformanceSet(
  sessions: WorkoutSession[],
  exerciseId: string,
  measurementType: MeasurementType,
  beforeStartedAt?: string,
  scope?: WorkoutHistoryScope,
): WorkoutSet | null {
  const before = beforeStartedAt ? Date.parse(beforeStartedAt) : Number.POSITIVE_INFINITY;
  const sets = sessions
    .filter(
      (session) =>
        session.status === 'completed' &&
        Date.parse(session.completedAt ?? session.startedAt) < before &&
        isSessionInProgram(session, scope),
    )
    .flatMap((session) =>
      session.exercises
        .filter((exercise) => areCanonicalExerciseIdentitiesEqual(exercise.exerciseId, exerciseId) && !exercise.skipped)
        .flatMap((exercise) => exercise.sets.filter((set) => set.completed)),
    );
  return sets.sort((a, b) => comparePerformance(b, a, measurementType))[0] ?? null;
}

function comparePerformance(a: WorkoutSet, b: WorkoutSet, type: MeasurementType): number {
  if (type === 'duration') return (getSetDuration(a, type) ?? 0) - (getSetDuration(b, type) ?? 0);
  if (type === 'weighted_reps') {
    const weightDifference = (getSetAddedWeight(a) ?? 0) - (getSetAddedWeight(b) ?? 0);
    return weightDifference || (getSetReps(a, type) ?? 0) - (getSetReps(b, type) ?? 0);
  }
  return (getSetReps(a, type) ?? 0) - (getSetReps(b, type) ?? 0);
}

export function copySetInput(set: WorkoutSet, measurementType: MeasurementType): WorkoutSetInput {
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
  const input = set ? copySetInput(set, measurementType) : undefined;
  return Boolean(
    input &&
    isValidSetInput(input, measurementType) &&
    (measurementType === 'duration' ? (input.durationSeconds ?? 0) > 0 : (input.reps ?? 0) > 0),
  );
}

const difficultyIndex = { beginner: 0, intermediate: 1, advanced: 2 };

export function rankReplacementExercises(
  current: Exercise,
  exercises: Exercise[],
  skillRole?: string,
): Exercise[] {
  return exercises
    .filter((exercise) => exercise.id !== current.id)
    .map((exercise) => ({
      exercise,
      score:
        (isCompatibleSkillRole(exercise, current, skillRole) ? 20_000 : 0) +
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

function isCompatibleSkillRole(exercise: Exercise, current: Exercise, role?: string) {
  if (!role) return false;
  if (role === 'primary-skill' || role === 'secondary-skill')
    return exercise.movementFamily === current.movementFamily;
  if (role === 'pulling-strength')
    return exercise.category === 'pull' || exercise.movementFamily === current.movementFamily;
  if (role === 'core-strength')
    return exercise.category === 'core' || exercise.muscles.includes('core');
  return exercise.category === 'mobility';
}

export const completedSetCount = (exercise: ExerciseSession) =>
  exercise.sets.filter((set) => set.completed).length;
