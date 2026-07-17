import { describe, expect, it } from 'vitest';
import type { Exercise, WorkoutSession } from '../types';
import { exercisePoints, personalRecords } from './stats';
const e = {
  id: 'e',
  nameHe: 'Exercise',
  nameEn: 'Exercise',
  category: 'push',
  difficulty: 'beginner',
  muscles: [],
  measurementType: 'reps',
  description: '',
  instructions: [],
  commonMistakes: [],
  isCustom: false,
} satisfies Exercise;
const s: WorkoutSession = {
  id: 'w',
  workoutName: 'A',
  startedAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T00:10:00Z',
  status: 'completed',
  currentExerciseIndex: 0,
  exercises: [
    {
      id: 'x',
      exerciseId: 'e',
      skipped: false,
      sets: [
        { id: '1', setNumber: 1, value: 10, completed: true },
        { id: '2', setNumber: 2, value: 8, completed: true },
      ],
    },
  ],
};
describe('progress stats', () => {
  it('calculates points and records from completed workouts', () => {
    expect(exercisePoints([s], 'e')[0]).toMatchObject({ best: 10, total: 18 });
    expect(personalRecords([s], [e])[0].bestTotal).toBe(18);
  });
  it('historical edits recalculate derived values', () => {
    const edit = structuredClone(s);
    edit.exercises[0].sets[0].value = 15;
    expect(exercisePoints([edit], 'e')[0].best).toBe(15);
  });
  it('calculates the longest hold from duration fields', () => {
    const durationExercise = { ...e, id: 'hold', measurementType: 'duration' as const };
    const durationSession = structuredClone(s);
    durationSession.exercises[0] = {
      ...durationSession.exercises[0],
      exerciseId: 'hold',
      measurementType: 'duration',
      sets: [
        { id: 'd1', setNumber: 1, durationSeconds: 18, completed: true },
        { id: 'd2', setNumber: 2, durationSeconds: 31, completed: true },
      ],
    };
    expect(personalRecords([durationSession], [durationExercise])[0]).toMatchObject({
      longestHold: 31,
      bestSet: 31,
    });
  });
  it('calculates the heaviest added weight independently from repetitions', () => {
    const weightedExercise = { ...e, id: 'weighted', measurementType: 'weighted_reps' as const };
    const weightedSession = structuredClone(s);
    weightedSession.exercises[0] = {
      ...weightedSession.exercises[0],
      exerciseId: 'weighted',
      measurementType: 'weighted_reps',
      sets: [
        { id: 'w1', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true },
        { id: 'w2', setNumber: 2, reps: 3, addedWeightKg: 12.5, completed: true },
      ],
    };
    expect(personalRecords([weightedSession], [weightedExercise])[0]).toMatchObject({
      heaviestAddedWeight: 12.5,
      bestSet: 12.5,
    });
  });
});
