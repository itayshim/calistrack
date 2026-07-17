import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import type { AppData, Exercise, MeasurementType, WorkoutSet } from '../types';
import { findExerciseByReference } from '../utils/exerciseLocalization';
import { normalizeMeasurementType } from '../utils/performance';
export const STORAGE_KEY = 'calistrack.app.v1';
const valid = (v: unknown): v is AppData => {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<AppData>;
  return (
    [1, 2, 3, 4, 5].includes(d.schemaVersion ?? 0) &&
    Array.isArray(d.exercises) &&
    Array.isArray(d.programs) &&
    Array.isArray(d.workoutSessions) &&
    Array.isArray(d.goals) &&
    !!d.settings
  );
};
export class LocalStorageService {
  loadAppData(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialData();
      const parsed: unknown = JSON.parse(raw);
      return valid(parsed) ? migrateAppData(parsed) : createInitialData();
    } catch {
      return createInitialData();
    }
  }
  saveAppData(data: AppData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error('Unable to save data in this browser');
    }
  }
  exportData(data: AppData) {
    return JSON.stringify(data, null, 2);
  }
  importData(raw: string): AppData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON file');
    }
    if (!valid(parsed)) throw new Error('Unsupported data format');
    return migrateAppData(parsed);
  }
  resetData() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const workoutNameTranslations: Record<string, string> = {
  'אימון A – גוף מלא': 'Workout A – Full Body',
  'אימון B – גוף מלא': 'Workout B – Full Body',
  'אימון C – גוף מלא': 'Workout C – Full Body',
};

export function normalizeExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    nameHe: exercise.nameHe || exercise.nameEn,
    movementFamily: exercise.movementFamily || exercise.category || 'Other',
    aliases: Array.isArray(exercise.aliases) ? exercise.aliases : [],
    keywords: Array.isArray(exercise.keywords) ? exercise.keywords : [],
    progressionOrder: Number.isFinite(exercise.progressionOrder) ? exercise.progressionOrder : 0,
    muscles: Array.isArray(exercise.muscles) ? exercise.muscles : [],
    measurementType: normalizeMeasurementType(exercise.measurementType),
  };
}

export function migrateAppData(data: AppData): AppData {
  const customExercises = data.exercises.filter((exercise) => exercise.isCustom).map(normalizeExercise);
  const exercises = [...builtInExercises, ...customExercises];
  const exerciseId = (reference: string) =>
    findExerciseByReference(exercises, reference)?.id ?? reference;
  const measurementFor = (reference: string, stored?: unknown): MeasurementType =>
    stored
      ? normalizeMeasurementType(stored)
      : findExerciseByReference(exercises, reference)?.measurementType ?? 'reps';
  const migrateSet = (set: WorkoutSet, type: MeasurementType): WorkoutSet => {
    const migrated = { ...set };
    if (
      migrated.reps === undefined &&
      migrated.durationSeconds === undefined &&
      migrated.value !== undefined
    ) {
      if (type === 'duration') migrated.durationSeconds = migrated.value;
      else migrated.reps = migrated.value;
    }
    return migrated;
  };
  const migrateSession = (session: AppData['workoutSessions'][number]) => ({
    ...session,
    workoutName: workoutNameTranslations[session.workoutName] ?? session.workoutName,
    exercises: session.exercises.map((exercise) => {
      const migratedId = exerciseId(exercise.exerciseId);
      const measurementType = measurementFor(
        migratedId,
        exercise.measurementType ?? exercise.target?.measurementType,
      );
      return {
        ...exercise,
        exerciseId: migratedId,
        measurementType,
        sets: exercise.sets.map((set) => migrateSet(set, measurementType)),
        target: exercise.target
          ? {
              ...exercise.target,
              exerciseId: exerciseId(exercise.target.exerciseId),
              measurementType,
            }
          : exercise.target,
      };
    }),
  });
  return {
    ...data,
    schemaVersion: 5,
    settings: { ...data.settings, language: data.settings.language ?? 'en' },
    exercises,
    restTimer: data.restTimer ?? { endsAt: null, duration: 0, pausedRemaining: null },
    programs: data.programs.map((program) => ({
      ...program,
      workouts: program.workouts.map((workout) => ({
        ...workout,
        name: workoutNameTranslations[workout.name] ?? workout.name,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          exerciseId: exerciseId(exercise.exerciseId),
          measurementType: measurementFor(
            exerciseId(exercise.exerciseId),
            exercise.measurementType,
          ),
        })),
      })),
    })),
    workoutSessions: data.workoutSessions.map(migrateSession),
    goals: data.goals.map((goal) => ({
      ...goal,
      exerciseId: goal.exerciseId ? exerciseId(goal.exerciseId) : undefined,
    })),
    activeWorkout: data.activeWorkout
      ? migrateSession(data.activeWorkout)
      : null,
  } as AppData;
}
export const storageService = new LocalStorageService();
