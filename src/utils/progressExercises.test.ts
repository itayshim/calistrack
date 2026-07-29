import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../data/exercises';
import type { Exercise, MeasurementType, WorkoutSession, WorkoutSet } from '../types';
import { buildProgressExerciseSummaries, uniqueCanonicalExercises } from './progressExercises';

const exercise = (name: string) =>
  builtInExercises.find((item) => item.nameEn === name)!;

function session(
  id: string,
  exerciseItem: Exercise,
  completedAt: string,
  sets: WorkoutSet[],
  measurementType: MeasurementType = exerciseItem.measurementType,
  exerciseId = exerciseItem.id,
): WorkoutSession {
  return {
    id,
    workoutName: 'Progress workout',
    startedAt: completedAt,
    completedAt,
    status: 'completed',
    currentExerciseIndex: 0,
    exercises: [{
      id: `${id}-exercise`,
      exerciseId,
      measurementType,
      sets,
      skipped: false,
    }],
  };
}

describe('progress exercise summaries', () => {
  it('includes only valid completed history and sorts most recent first', () => {
    const pushUp = exercise('Push-Up');
    const pullUp = exercise('Pull-Up');
    const squat = exercise('Bodyweight Squat');
    const summaries = buildProgressExerciseSummaries(
      [pushUp, pullUp, squat],
      [
        session('older', pushUp, '2026-07-20T10:00:00Z', [
          { id: 'push-set', setNumber: 1, reps: 10, completed: true },
        ]),
        session('recent', pullUp, '2026-07-27T10:00:00Z', [
          { id: 'pull-set', setNumber: 1, reps: 6, completed: true },
          { id: 'ignored', setNumber: 2, reps: 7, completed: false },
        ]),
      ],
    );
    expect(summaries.map((summary) => summary.exerciseId)).toEqual([pullUp.id, pushUp.id]);
    expect(summaries[0]).toMatchObject({ completedSetCount: 1, sessionCount: 1, latestMetric: 6 });
    expect(summaries.some((summary) => summary.exerciseId === squat.id)).toBe(false);
  });

  it('recognizes repetitions, weighted repetitions, and duration measurements', () => {
    const pushUp = exercise('Push-Up');
    const weightedPullUp = exercise('Weighted Pull-Up');
    const plank = exercise('Plank');
    const summaries = buildProgressExerciseSummaries(
      [pushUp, weightedPullUp, plank],
      [
        session('reps', pushUp, '2026-07-20T10:00:00Z', [
          { id: 'r', setNumber: 1, reps: 8.5, completed: true },
        ]),
        session('weighted', weightedPullUp, '2026-07-21T10:00:00Z', [
          { id: 'w', setNumber: 1, reps: 6.5, addedWeightKg: 7.5, completed: true },
        ], 'weighted_reps'),
        session('duration', plank, '2026-07-22T10:00:00Z', [
          { id: 'd', setNumber: 1, durationSeconds: 35, completed: true },
        ], 'duration'),
      ],
    );
    expect(summaries.find((item) => item.exerciseId === pushUp.id)?.personalBest).toBe(8.5);
    expect(summaries.find((item) => item.exerciseId === weightedPullUp.id)?.personalBest).toBe(7.5);
    expect(summaries.find((item) => item.exerciseId === plank.id)?.personalBest).toBe(35);
  });

  it('merges built-in and global identities by stable key and resolves canonical UUID history', () => {
    const builtIn = exercise('Push-Up');
    const global: Exercise = {
      ...builtIn,
      canonicalExerciseId: 'global-push-up-uuid',
      source: 'global',
      nameEn: 'Global Push-Up',
    };
    expect(uniqueCanonicalExercises([builtIn, global])).toEqual([global]);
    const summaries = buildProgressExerciseSummaries(
      [builtIn, global],
      [session(
        'canonical',
        global,
        '2026-07-27T10:00:00Z',
        [{ id: 'set', setNumber: 1, reps: 12, completed: true }],
        'reps',
        'global-push-up-uuid',
      )],
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ exerciseId: global.id, personalBest: 12 });
  });
});
