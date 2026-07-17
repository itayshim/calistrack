import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../data/exercises';
import type { WorkoutSession, WorkoutSet } from '../types';
import {
  copySetInput,
  getPreviousPerformance,
  rankReplacementExercises,
  validEnteredSet,
} from './workoutExperience';

const completed = (
  id: string,
  exerciseId: string,
  completedAt: string,
  sets: WorkoutSet[],
): WorkoutSession => ({
  id,
  workoutName: 'Workout',
  startedAt: completedAt,
  completedAt,
  status: 'completed',
  currentExerciseIndex: 0,
  exercises: [{
    id: `${id}-exercise`,
    exerciseId,
    sets,
    skipped: false,
  }],
});

describe('previous workout performance', () => {
  it('uses the newest completed session and retains set-index alignment', () => {
    const older = completed('old', 'pull-up', '2026-07-01', [
      { id: 'old-1', setNumber: 1, reps: 5, completed: true },
    ]);
    const latest = completed('latest', 'pull-up', '2026-07-12', [
      { id: 'new-1', setNumber: 1, reps: 10, completed: true },
      { id: 'new-2', setNumber: 2, reps: 9, completed: true },
    ]);
    const result = getPreviousPerformance([older, latest], 'pull-up', '2026-07-13');
    expect(result?.sets[0].reps).toBe(10);
    expect(result?.sets[1].reps).toBe(9);
    expect(result?.sets[2]).toBeUndefined();
  });

  it('does not match localized display names or another exercise ID', () => {
    const history = completed('one', 'builtin-pull-up', '2026-07-12', [
      { id: 'set', setNumber: 1, reps: 10, completed: true },
    ]);
    expect(getPreviousPerformance([history], 'מתח')).toBeNull();
    expect(getPreviousPerformance([history], 'builtin-chin-up')).toBeNull();
  });

  it('returns no history state when no completed set exists', () => {
    const history = completed('one', 'custom-1', '2026-07-12', [
      { id: 'set', setNumber: 1, reps: 10, completed: false },
    ]);
    expect(getPreviousPerformance([history], 'custom-1')).toBeNull();
  });

  it('copies only repetitions for reps exercises', () => {
    expect(copySetInput(
      { id: 'set', setNumber: 1, reps: 10, addedWeightKg: 5, completed: true },
      'reps',
    )).toEqual({ reps: 10 });
  });

  it('copies only duration for timed exercises', () => {
    expect(copySetInput(
      { id: 'set', setNumber: 1, durationSeconds: 24, reps: 10, completed: true },
      'duration',
    )).toEqual({ durationSeconds: 24 });
  });

  it('copies repetitions and decimal added weight for weighted exercises', () => {
    expect(copySetInput(
      { id: 'set', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true },
      'weighted_reps',
    )).toEqual({ reps: 6, addedWeightKg: 7.5 });
  });

  it('does not permit copying an incomplete invalid current-workout set', () => {
    expect(validEnteredSet(
      { id: 'set', setNumber: 1, reps: 0, completed: false },
      'reps',
    )).toBe(false);
  });
});

describe('replacement ranking', () => {
  it('prioritizes the same movement family and measurement type', () => {
    const current = builtInExercises.find((exercise) => exercise.nameEn === 'Weighted Pull-Up')!;
    const ranked = rankReplacementExercises(current, builtInExercises);
    expect(ranked[0].movementFamily).toBe(current.movementFamily);
    const sameFamily = ranked.filter((exercise) => exercise.movementFamily === current.movementFamily);
    const weightedIndex = sameFamily.findIndex((exercise) => exercise.measurementType === 'weighted_reps');
    const firstDifferentType = sameFamily.findIndex((exercise) => exercise.measurementType !== 'weighted_reps');
    expect(weightedIndex === -1 || firstDifferentType === -1 || weightedIndex < firstDifferentType).toBe(true);
  });

  it('supports custom exercises as replacement candidates', () => {
    const current = builtInExercises.find((exercise) => exercise.nameEn === 'Pull-Up')!;
    const custom = {
      ...current,
      id: 'custom-neutral-grip',
      nameEn: 'My Neutral Grip Pull',
      nameHe: 'My Neutral Grip Pull',
      isCustom: true,
    };
    expect(rankReplacementExercises(current, [current, custom])[0].id).toBe(custom.id);
  });
});
