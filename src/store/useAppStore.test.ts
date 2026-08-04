import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../data/seed';
import type { WorkoutTemplate } from '../types';
import { useAppStore } from './useAppStore';
import { createFrontLeverAssessment, createFrontLeverWorkout } from '../features/skills/frontLever';
import { createHandstandPushUpAssessment } from '../features/skills/handstandPushUp';
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
      restTimer: { id: null, endsAt: null, duration: 0, pausedRemaining: null },
    });
  });
  it('starts, persists and restores an active workout', () => {
    expect(useAppStore.getState().startWorkout(t)).toBe(true);
    expect(useAppStore.getState().activeWorkout?.workoutName).toBe('Workout');
    expect(useAppStore.getState().activeWorkout?.programId).toBe('p');
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().activeWorkout).not.toBeNull();
  });
  it('stopping a target countdown floors elapsed time without completing the set or starting rest', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    useAppStore
      .getState()
      .startWorkout({ ...t, exercises: [{ ...t.exercises[0], measurementType: 'duration' }] });
    useAppStore
      .getState()
      .startExerciseCountdown(useAppStore.getState().activeWorkout!.exercises[0].id, 30);
    now.mockReturnValue(30_420);
    expect(useAppStore.getState().stopExerciseCountdown()).toEqual({ measuredSeconds: 17 });
    expect(useAppStore.getState().exerciseStopwatch).toMatchObject({
      running: false,
      measuredSeconds: 17,
      adjustedSeconds: 17,
      targetReached: false,
    });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
    expect(useAppStore.getState().activeWorkout?.status).toBe('active');
    expect(useAppStore.getState().restTimer.id).toBeNull();
    now.mockRestore();
  });
  it('skipping the final exercise enters completion but Back restores an editable exercise', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().skipExercise(0);
    expect(useAppStore.getState().activeWorkout).toMatchObject({ completionReady: true });
    useAppStore.getState().setCurrentExercise(0);
    expect(useAppStore.getState().activeWorkout?.exercises[0].skipped).toBe(false);
    expect(useAppStore.getState().activeWorkout?.completionReady).toBe(false);
    expect(useAppStore.getState().completeSet(0, 8)).toBe(true);
  });
  it('records a successful skill assessment and unlocks without auto-activating the next level', () => {
    const state = useAppStore.getState();
    const assessment = createFrontLeverAssessment('tuck', state.exercises);
    expect(state.startWorkout(assessment)).toBe(true);
    expect(useAppStore.getState().completeSet(0, { durationSeconds: 20 })).toBe(true);
    useAppStore.getState().finishWorkout('', 3, 3, 'good');
    const progress = useAppStore.getState().skillProgress['front-lever'];
    expect(progress.unlockedLevelKeys).toContain('advanced-tuck');
    expect(progress.masteredLevelKeys).toContain('tuck');
    expect(progress.activeLevelKey).toBe('tuck');
  });
  it('keeps Handstand Push-Up progress independent and unlocks its next level idempotently', () => {
    const assessment = createHandstandPushUpAssessment(
      'pike-push-up',
      useAppStore.getState().exercises,
    );
    useAppStore.getState().startWorkout(assessment);
    useAppStore.getState().completeSet(0, { reps: 10 });
    useAppStore.getState().finishWorkout('', 3, 3, 'good');
    const progress = useAppStore.getState().skillProgress['handstand-push-up'];
    expect(progress).toMatchObject({
      activeLevelKey: 'pike-push-up',
      unlockedLevelKeys: ['pike-push-up', 'advanced-pike-push-up'],
    });
    expect(progress.assessments[0]).toMatchObject({
      reps: 10,
      measurementType: 'reps',
      passed: true,
    });
    expect(useAppStore.getState().skillProgress['front-lever']).toBeUndefined();
  });
  it('discards administrator preview sessions without history or skill progress', () => {
    const before = useAppStore.getState();
    const preview = createFrontLeverWorkout('full', before.exercises, true, 'admin-preview', true);
    expect(before.startWorkout(preview)).toBe(true);
    useAppStore.getState().skipSkillWarmup();
    useAppStore.getState().finishWorkout('', 3, 3, 'good');
    expect(useAppStore.getState().activeWorkout).toBeNull();
    expect(useAppStore.getState().workoutSessions).toHaveLength(0);
    expect(useAppStore.getState().skillProgress).toEqual({});
  });
  it('completes a set and starts timer', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].reps).toBe(10);
    expect(useAppStore.getState().restTimer.endsAt).toBeGreaterThan(Date.now());
  });
  it('uses a three-second countdown and two-second adjustment by default', () => {
    expect(useAppStore.getState().settings).toMatchObject({
      timedExerciseStartCountdownSeconds: 3,
      timerReactionAdjustmentSeconds: 2,
    });
  });
  it('starts measuring only after the countdown and subtracts exactly two seconds', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    expect(useAppStore.getState().exerciseStopwatch.startedAt).toBe(13_000);

    now.mockReturnValue(23_000);
    expect(useAppStore.getState().stopExerciseStopwatch()).toEqual({
      measuredSeconds: 10,
      adjustedSeconds: 8,
    });

    now.mockReturnValue(30_000);
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    now.mockReturnValue(63_000);
    expect(useAppStore.getState().stopExerciseStopwatch()).toEqual({
      measuredSeconds: 30,
      adjustedSeconds: 28,
    });
    now.mockRestore();
  });
  it('persists one duration stopwatch and applies the configured reaction adjustment', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(10_000);
    useAppStore.setState((state) => ({
      settings: { ...state.settings, timerReactionAdjustmentSeconds: 5 },
    }));
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    expect(useAppStore.getState().exerciseStopwatch.running).toBe(true);
    now.mockReturnValue(30_400);
    expect(useAppStore.getState().stopExerciseStopwatch()).toEqual({
      measuredSeconds: 17,
      adjustedSeconds: 12,
    });
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().exerciseStopwatch.adjustedSeconds).toBe(12);
    now.mockRestore();
  });

  it('clamps short stopwatch results to zero and a new stopwatch replaces the old owner', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    useAppStore.getState().startExerciseStopwatch('first');
    useAppStore.getState().startExerciseStopwatch('second');
    expect(useAppStore.getState().exerciseStopwatch.sessionExerciseId).toBe('second');
    now.mockReturnValue(12_000);
    expect(useAppStore.getState().stopExerciseStopwatch()?.adjustedSeconds).toBe(0);
    now.mockRestore();
  });
  it('runs a fresh countdown after reset and after a stopped measurement', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    const firstId = useAppStore.getState().exerciseStopwatch.id;
    expect(useAppStore.getState().exerciseStopwatch.startedAt).toBe(13_000);

    now.mockReturnValue(18_000);
    useAppStore.getState().stopExerciseStopwatch();
    now.mockReturnValue(20_000);
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    expect(useAppStore.getState().exerciseStopwatch.id).not.toBe(firstId);
    expect(useAppStore.getState().exerciseStopwatch.startedAt).toBe(23_000);
    expect(useAppStore.getState().exerciseStopwatch.measuredSeconds).toBeNull();

    useAppStore.getState().resetExerciseStopwatch();
    now.mockReturnValue(30_000);
    useAppStore.getState().startExerciseStopwatch('duration-exercise');
    expect(useAppStore.getState().exerciseStopwatch.startedAt).toBe(33_000);
    expect(useAppStore.getState().exerciseStopwatch.adjustedSeconds).toBeNull();
    now.mockRestore();
  });
  it('stores half reps exactly and rejects arbitrary decimal increments', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 8.5);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].reps).toBe(8.5);
    useAppStore.getState().skipTimer();
    useAppStore.getState().completeSet(0, 8.25);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
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
    useAppStore.setState({
      restTimer: { id: null, endsAt: null, duration: 0, pausedRemaining: null },
    });
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().restTimer.endsAt).toBe(end);
  });
  it('unlocks the next set when the timestamp has elapsed', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.setState({
      restTimer: {
        id: 'rest-expired',
        endsAt: Date.now() - 1,
        duration: 60,
        pausedRemaining: null,
      },
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
  it('logs duration sets and preserves the normal rest flow', () => {
    const durationTemplate: WorkoutTemplate = {
      ...t,
      exercises: [
        {
          ...t.exercises[0],
          exerciseId: 'builtin-plank',
          measurementType: 'duration',
          targetMin: 20,
          targetMax: 30,
        },
      ],
    };
    useAppStore.getState().startWorkout(durationTemplate);
    useAppStore.getState().completeSet(0, { durationSeconds: 27 });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0]).toMatchObject({
      durationSeconds: 27,
    });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0]).not.toHaveProperty('reps');
    expect(useAppStore.getState().restTimer.endsAt).toBeGreaterThan(Date.now());
  });
  it('uses canonical no-rest progression when configured rest is zero', () => {
    const durationTemplate: WorkoutTemplate = {
      ...t,
      exercises: [
        {
          ...t.exercises[0],
          exerciseId: 'builtin-plank',
          measurementType: 'duration',
          targetMin: 30,
          targetMax: 30,
          restSeconds: 0,
        },
      ],
    };
    useAppStore.getState().startWorkout(durationTemplate);
    expect(useAppStore.getState().completeSet(0, { durationSeconds: 30 })).toBe(true);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].durationSeconds).toBe(30);
    expect(useAppStore.getState().restTimer).toMatchObject({ id: null, endsAt: null });
    expect(useAppStore.getState().activeWorkout?.currentExerciseIndex).toBe(0);
  });
  it('logs half weighted repetitions and decimal added weight independently', () => {
    const weightedTemplate: WorkoutTemplate = {
      ...t,
      exercises: [
        {
          ...t.exercises[0],
          exerciseId: 'builtin-weighted-pull-up',
          measurementType: 'weighted_reps',
          targetAddedWeightKg: 7.5,
        },
      ],
    };
    useAppStore.getState().startWorkout(weightedTemplate);
    useAppStore.getState().completeSet(0, { reps: 6.5, addedWeightKg: 7.5 });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0]).toMatchObject({
      reps: 6.5,
      addedWeightKg: 7.5,
    });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0]).not.toHaveProperty(
      'durationSeconds',
    );
  });
  it('rejects incomplete, zero and negative metric-specific sets', () => {
    const weightedTemplate: WorkoutTemplate = {
      ...t,
      exercises: [{ ...t.exercises[0], measurementType: 'weighted_reps' }],
    };
    useAppStore.getState().startWorkout(weightedTemplate);
    useAppStore.getState().completeSet(0, { reps: 5 });
    useAppStore.getState().completeSet(0, { reps: 5, addedWeightKg: -2.5 });
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('replaces an exercise in place before any set is completed', () => {
    useAppStore.getState().startWorkout(t);
    const startedAt = useAppStore.getState().activeWorkout?.startedAt;
    useAppStore.getState().replaceActiveExercise(0, 'builtin-chin-up');
    const active = useAppStore.getState().activeWorkout;
    expect(active?.exercises).toHaveLength(1);
    expect(active?.exercises[0].exerciseId).toBe('builtin-chin-up');
    expect(active?.startedAt).toBe(startedAt);
  });

  it('keeps completed original sets as a separate replaced history exercise', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.getState().replaceActiveExercise(0, 'builtin-chin-up', { keepCompleted: true });
    const active = useAppStore.getState().activeWorkout;
    expect(active?.exercises).toHaveLength(2);
    expect(active?.exercises[0]).toMatchObject({
      exerciseId: 'builtin-push-up',
      replacedDuringWorkout: true,
      replacedByExerciseId: 'builtin-chin-up',
    });
    expect(active?.exercises[0].sets).toHaveLength(1);
    expect(active?.exercises[1].exerciseId).toBe('builtin-chin-up');
    expect(active?.currentExerciseIndex).toBe(1);
  });

  it('discards completed values when replacing in place', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.getState().replaceActiveExercise(0, 'builtin-chin-up');
    expect(useAppStore.getState().activeWorkout?.exercises[0]).toMatchObject({
      exerciseId: 'builtin-chin-up',
      sets: [],
    });
  });

  it('clears incompatible metrics and safely resets the rest timer', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    expect(useAppStore.getState().restTimer.endsAt).not.toBeNull();
    useAppStore.getState().replaceActiveExercise(0, 'builtin-plank');
    const replacement = useAppStore.getState().activeWorkout?.exercises[0];
    expect(replacement?.measurementType).toBe('duration');
    expect(replacement?.sets).toEqual([]);
    expect(replacement?.target).toMatchObject({ targetMin: 20, targetMax: 30 });
    expect(useAppStore.getState().restTimer.endsAt).toBeNull();
  });

  it('updates the saved program only when explicitly requested', () => {
    const program = {
      id: 'program',
      name: 'Program',
      workouts: [t],
      createdAt: 'x',
      updatedAt: 'x',
    };
    useAppStore.setState({ programs: [program] });
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().replaceActiveExercise(0, 'builtin-chin-up');
    expect(useAppStore.getState().programs[0].workouts[0].exercises[0].exerciseId).toBe(
      'builtin-push-up',
    );
    useAppStore.getState().replaceActiveExercise(0, 'builtin-pull-up', { updateProgram: true });
    expect(useAppStore.getState().programs[0].workouts[0].exercises[0].exerciseId).toBe(
      'builtin-pull-up',
    );
  });

  it('keeps original and replacement metrics separated after workout completion', () => {
    useAppStore.getState().startWorkout(t);
    useAppStore.getState().completeSet(0, 10);
    useAppStore.getState().replaceActiveExercise(0, 'builtin-chin-up', { keepCompleted: true });
    useAppStore.getState().completeSet(1, 6);
    useAppStore.getState().finishWorkout();
    const history = useAppStore.getState().workoutSessions[0];
    expect(history.exercises[0].exerciseId).toBe('builtin-push-up');
    expect(history.exercises[0].sets[0].reps).toBe(10);
    expect(history.exercises[1].exerciseId).toBe('builtin-chin-up');
    expect(history.exercises[1].sets[0].reps).toBe(6);
  });
});
