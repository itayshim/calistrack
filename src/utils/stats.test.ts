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
});
