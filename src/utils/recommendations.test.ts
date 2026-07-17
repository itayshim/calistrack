import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../types';
import { getRecommendation } from './recommendations';
const session = (values: number[]): WorkoutSession => ({
  id: crypto.randomUUID(),
  workoutName: 'A',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  status: 'completed',
  currentExerciseIndex: 0,
  exercises: [
    {
      id: crypto.randomUUID(),
      exerciseId: 'pushup',
      sets: values.map((v, i) => ({ id: `s${i}`, setNumber: i + 1, value: v, completed: true })),
      skipped: false,
    },
  ],
});
describe('progression recommendations', () => {
  it('recommends a harder variation after two max sessions', () =>
    expect(
      getRecommendation([session([12, 12, 12]), session([12, 12, 12])], 'pushup', 8, 12, 3)?.kind,
    ).toBe('progress'));
  it('recommends adjustment after three low sessions', () =>
    expect(
      getRecommendation(
        [session([5, 5, 5]), session([6, 6, 6]), session([7, 7, 7])],
        'pushup',
        8,
        12,
        3,
      )?.kind,
    ).toBe('regress'));
});
