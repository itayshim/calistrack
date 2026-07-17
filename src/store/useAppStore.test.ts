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
  it('stops after the final planned set, skips rest and never creates a fourth set', () => {
    useAppStore.getState().startWorkout(t);
    for (const value of [10, 11]) {
      useAppStore.getState().completeSet(0, value);
      useAppStore.getState().skipTimer();
    }
    useAppStore.getState().completeSet(0, 12);
    useAppStore.getState().completeSet(0, 13);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(3);
    expect(useAppStore.getState().activeWorkout?.completionReady).toBe(true);
    expect(useAppStore.getState().restTimer.endsAt).toBeNull();
  });
  it('moves to the next exercise immediately after the final planned set', () => {
    const twoExercises = {
      ...t,
      exercises: [...t.exercises, { ...t.exercises[0], id: 'we-2', order: 1 }],
    };
    useAppStore.getState().startWorkout(twoExercises);
    for (let set = 0; set < 3; set += 1) {
      useAppStore.getState().completeSet(0, 10);
      if (set < 2) useAppStore.getState().skipTimer();
    }
    expect(useAppStore.getState().activeWorkout?.currentExerciseIndex).toBe(1);
    expect(useAppStore.getState().restTimer.endsAt).toBeNull();
  });
  it('adds a fourth set only after Add Extra Set is used', () => {
    useAppStore.getState().startWorkout(t);
    for (let set = 0; set < 3; set += 1) {
      useAppStore.getState().completeSet(0, 10);
      if (set < 2) useAppStore.getState().skipTimer();
    }
    useAppStore.getState().addExtraSet(0);
    useAppStore.getState().completeSet(0, 9);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(4);
  });
  it('locks completion during active, paused and reset rest, then unlocks after skip', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.getState().completeSet(0, 11);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
    useAppStore.getState().pauseTimer();
    useAppStore.getState().completeSet(0, 11);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
    useAppStore.getState().resetTimer();
    useAppStore.getState().completeSet(0, 11);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
    useAppStore.getState().skipTimer();
    useAppStore.getState().completeSet(0, 11);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(2);
  });
  it('restores the persisted rest lock after hydration', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    const end = useAppStore.getState().restTimer.endsAt;
    useAppStore.setState({ restTimer: { endsAt: null, duration: 0, pausedRemaining: null } });
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().restTimer.endsAt).toBe(end);
  });
  it('unlocks the next set when the timestamp has elapsed', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.setState({
      restTimer: { endsAt: Date.now() - 1, duration: 60, pausedRemaining: null },
    });
    useAppStore.getState().completeSet(0, 11);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(2);
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
