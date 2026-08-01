import { describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import { LocalStorageService, STORAGE_KEY } from './storage';
import { createFrontLeverWorkout } from '../features/skills/frontLever';
describe('storage', () => {
  const service = new LocalStorageService();
  it('exports and imports valid data', () => {
    const data = createInitialData();
    expect(service.importData(service.exportData(data)).exercises.length).toBeGreaterThan(30);
  });
  it('round-trips half repetitions as numbers without changing integer records', () => {
    const data = createInitialData();
    data.workoutSessions = [{
      id: 'half-reps',
      workoutName: 'Pull',
      startedAt: '2026-07-27T10:00:00Z',
      completedAt: '2026-07-27T10:10:00Z',
      status: 'completed',
      currentExerciseIndex: 0,
      exercises: [{
        id: 'exercise-session',
        exerciseId: 'builtin-pull-up',
        measurementType: 'reps',
        skipped: false,
        sets: [
          { id: 'half', setNumber: 1, reps: 8.5, completed: true },
          { id: 'whole', setNumber: 2, reps: 8, completed: true },
        ],
      }],
    }];
    const restored = service.importData(service.exportData(data));
    expect(restored.workoutSessions[0].exercises[0].sets.map((set) => set.reps))
      .toEqual([8.5, 8]);
    expect(typeof restored.workoutSessions[0].exercises[0].sets[0].reps).toBe('number');
  });
  it('rejects invalid imports', () => expect(() => service.importData('{"hello":1}')).toThrow());
  it('handles malformed local storage safely', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(service.loadAppData().schemaVersion).toBe(12);
  });
  it('migrates schema 1 exercises and preserves their IDs and saved data', () => {
    const current = createInitialData();
    const legacy = {
      ...current,
      schemaVersion: 1,
      restTimer: undefined,
      exercises: [
        {
          id: 'custom-legacy',
          nameHe: 'Legacy move',
          nameEn: 'Legacy move',
          category: 'push',
          difficulty: 'beginner',
          muscles: [],
          measurementType: 'reps',
          description: '',
          instructions: [],
          commonMistakes: [],
          isCustom: true,
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const migrated = service.loadAppData();
    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.settings.onboardingCompleted).toBe(true);
    expect(migrated.settings.allowEmptyNumericFields).toBe(false);
    expect(migrated.settings.language).toBe('en');
    expect(migrated.exercises.find((exercise) => exercise.id === 'custom-legacy')).toMatchObject({
      movementFamily: 'push',
      aliases: [],
      keywords: [],
    });
    expect(migrated.restTimer.endsAt).toBeNull();
  });
  it('keeps onboarding incomplete only for genuinely fresh application data', () => {
    expect(createInitialData().settings.onboardingCompleted).toBe(false);
    const current = createInitialData();
    current.settings.onboardingCompleted = true;
    const imported = service.importData(service.exportData(current));
    expect(imported.settings.onboardingCompleted).toBe(true);
  });
  it('repairs old linked skill templates while preserving detached templates and history', () => {
    const data = createInitialData();
    const linked = createFrontLeverWorkout('tuck', data.exercises, false, 'program');
    linked.skillLink = { ...linked.skillLink!, templateVersion: 1 };
    linked.exercises[3].exerciseId = 'builtin-hanging-leg-raise';
    const detached = structuredClone(linked);
    detached.id = 'detached';
    detached.skillLink!.linkState = 'detached';
    data.programs = [{ id: 'program', name: 'Skill', createdAt: 'x', updatedAt: 'x', workouts: [linked, detached] }];
    data.workoutSessions = [{ id: 'history', workoutName: 'Old skill', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:10:00Z', status: 'completed', currentExerciseIndex: 0, exercises: [{ id: 'old-exercise', exerciseId: 'builtin-hanging-leg-raise', sets: [{ id: 'set', setNumber: 1, reps: 10, completed: true }], skipped: false }] }];
    const migrated = service.importData(service.exportData(data));
    expect(migrated.programs[0].workouts[0].exercises[3].exerciseId).toBe('builtin-leg-raise');
    expect(migrated.programs[0].workouts[0].skillLink?.templateVersion).toBe(2);
    expect(migrated.programs[0].workouts[1].exercises[3].exerciseId).toBe('builtin-hanging-leg-raise');
    expect(migrated.workoutSessions[0].exercises[0].exerciseId).toBe('builtin-hanging-leg-raise');
  });
  it('migrates the untouched previous timed-exercise defaults without resetting other settings', () => {
    const data = createInitialData();
    data.schemaVersion = 10;
    data.settings.timerReactionAdjustmentSeconds = 5;
    data.settings.timedExerciseStartCountdownSeconds = 0;
    data.settings.weeklyWorkoutGoal = 6;

    const migrated = service.importData(service.exportData(data));

    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.settings.timerReactionAdjustmentSeconds).toBe(2);
    expect(migrated.settings.timedExerciseStartCountdownSeconds).toBe(3);
    expect(migrated.settings.weeklyWorkoutGoal).toBe(6);
  });
  it('preserves explicit timed-exercise customization during schema migration', () => {
    const data = createInitialData();
    data.schemaVersion = 10;
    data.settings.timerReactionAdjustmentSeconds = 3;
    data.settings.timedExerciseStartCountdownSeconds = 5;

    const migrated = service.importData(service.exportData(data));

    expect(migrated.settings.timerReactionAdjustmentSeconds).toBe(3);
    expect(migrated.settings.timedExerciseStartCountdownSeconds).toBe(5);
  });
  it('migrates the legacy rest-sound toggle and preserves unrelated settings', () => {
    const enabled = createInitialData();
    enabled.schemaVersion = 8;
    delete (enabled.settings as Partial<typeof enabled.settings>).restCompletionSound;
    delete (enabled.settings as Partial<typeof enabled.settings>).restAlertRepeatCount;
    enabled.settings.restTimerSound = true;
    enabled.settings.weeklyWorkoutGoal = 5;
    const migratedEnabled = service.importData(service.exportData(enabled));
    expect(migratedEnabled.settings).toMatchObject({
      restCompletionSound: 'classic',
      restAlertRepeatCount: 1,
      weeklyWorkoutGoal: 5,
    });
    expect(migratedEnabled.settings).not.toHaveProperty('restTimerSound');

    const disabled = structuredClone(enabled);
    disabled.settings.restTimerSound = false;
    expect(service.importData(service.exportData(disabled)).settings.restCompletionSound).toBe('silent');
  });
  it('falls back to Classic for an unknown stored sound ID', () => {
    const data = createInitialData();
    (data.settings as { restCompletionSound: string }).restCompletionSound = 'obsolete';
    expect(service.importData(service.exportData(data)).settings.restCompletionSound).toBe('classic');
  });
  it('resets application', () => {
    service.saveAppData(createInitialData());
    service.resetData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('migrates legacy translated exercise references to stable built-in IDs', () => {
    const data = createInitialData();
    const pushUp = builtInExercises.find((exercise) => exercise.nameEn === 'Push-Up')!;
    const legacyReference = pushUp.nameHe;
    data.schemaVersion = 3;
    data.programs = [{
      id: 'program',
      name: 'User program',
      createdAt: '',
      updatedAt: '',
      workouts: [{
        id: 'template',
        programId: 'program',
        name: 'User workout',
        scheduledDays: [],
        createdAt: '',
        updatedAt: '',
        exercises: [{
          id: 'target',
          exerciseId: legacyReference,
          order: 0,
          targetSets: 1,
          targetMin: 1,
          targetMax: 1,
          restSeconds: 30,
        }],
      }],
    }];
    data.workoutSessions = [{
      id: 'history',
      workoutName: 'User workout',
      startedAt: '',
      completedAt: '',
      status: 'completed',
      currentExerciseIndex: 0,
      exercises: [{
        id: 'history-exercise',
        exerciseId: legacyReference,
        sets: [],
        skipped: false,
      }],
    }];
    data.goals = [{
      id: 'goal',
      type: 'exercise-reps',
      title: 'User goal',
      exerciseId: legacyReference,
      targetValue: 10,
      createdAt: '',
    }];

    const migrated = service.importData(JSON.stringify(data));
    expect(migrated.programs[0].workouts[0].exercises[0].exerciseId).toBe(pushUp.id);
    expect(migrated.workoutSessions[0].exercises[0].exerciseId).toBe(pushUp.id);
    expect(migrated.goals[0].exerciseId).toBe(pushUp.id);
  });
  it('migrates legacy time sets while preserving reps, programs, goals and active state', () => {
    const data = createInitialData();
    const plank = builtInExercises.find((exercise) => exercise.nameEn === 'Plank')!;
    data.schemaVersion = 4;
    data.activeWorkout = {
      id: 'active-duration',
      workoutName: 'Hold session',
      startedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      currentExerciseIndex: 0,
      exercises: [{
        id: 'session-exercise',
        exerciseId: plank.id,
        measurementType: 'time' as never,
        skipped: false,
        sets: [{ id: 'legacy-set', setNumber: 1, value: 42, completed: true }],
      }],
    };
    const migrated = service.importData(JSON.stringify(data));
    expect(migrated.activeWorkout?.exercises[0]).toMatchObject({
      exerciseId: plank.id,
      measurementType: 'duration',
    });
    expect(migrated.activeWorkout?.exercises[0].sets[0]).toMatchObject({
      durationSeconds: 42,
      completed: true,
    });
    expect(migrated.programs).toHaveLength(data.programs.length);
    expect(migrated.goals).toHaveLength(data.goals.length);
  });
});
