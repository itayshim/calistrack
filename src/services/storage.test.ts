import { describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import { LocalStorageService, STORAGE_KEY } from './storage';
describe('storage', () => {
  const service = new LocalStorageService();
  it('exports and imports valid data', () => {
    const data = createInitialData();
    expect(service.importData(service.exportData(data)).exercises.length).toBeGreaterThan(30);
  });
  it('rejects invalid imports', () => expect(() => service.importData('{"hello":1}')).toThrow());
  it('handles malformed local storage safely', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(service.loadAppData().schemaVersion).toBe(5);
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
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.settings.language).toBe('en');
    expect(migrated.exercises.find((exercise) => exercise.id === 'custom-legacy')).toMatchObject({
      movementFamily: 'push',
      aliases: [],
      keywords: [],
    });
    expect(migrated.restTimer.endsAt).toBeNull();
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
