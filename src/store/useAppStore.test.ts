import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../data/seed';
import type { WorkoutTemplate } from '../types';
import { useAppStore } from './useAppStore';
const t: WorkoutTemplate = {
  id: 't',
  programId: 'p',
  name: 'Workout',
  scheduledDays: [1],
  createdAt: 'x',
  updatedAt: 'x',
  exercises: [
    {
      id: 'we',
      exerciseId: 'builtin-push-up',
      order: 0,
      targetSets: 3,
      targetMin: 8,
      targetMax: 12,
      restSeconds: 60,
    },
  ],
};
describe('workout flow', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createInitialData(),
      hydrated: true,
      toast: null,
      restTimer: { endsAt: null, duration: 0, pausedRemaining: null },
    });
  });
  it('starts, persists and restores an active workout', () => {
    expect(useAppStore.getState().startWorkout(t)).toBe(true);
    expect(useAppStore.getState().activeWorkout?.workoutName).toBe('Workout');
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().activeWorkout).not.toBeNull();
  });
  it('completes a set and starts timer', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].value).toBe(10);
    expect(useAppStore.getState().restTimer.endsAt).toBeGreaterThan(Date.now());
  });
  it('completes workout into history', () => {
    vi.useFakeTimers();
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().finishWorkout('', 3, 4);
    expect(useAppStore.getState().workoutSessions[0].status).toBe('completed');
    expect(useAppStore.getState().activeWorkout).toBeNull();
    vi.useRealTimers();
  });
});
