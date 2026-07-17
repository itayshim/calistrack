import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import type { AppData, Exercise } from '../types';
export const STORAGE_KEY = 'calistrack.app.v1';
const valid = (v: unknown): v is AppData => {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<AppData>;
  return (
    (d.schemaVersion === 1 || d.schemaVersion === 2 || d.schemaVersion === 3) &&
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
  };
}

export function migrateAppData(data: AppData): AppData {
  const customExercises = data.exercises.filter((exercise) => exercise.isCustom).map(normalizeExercise);
  return {
    ...data,
    schemaVersion: 3,
    settings: { ...data.settings, language: data.settings.language ?? 'en' },
    exercises: [...builtInExercises, ...customExercises],
    restTimer: data.restTimer ?? { endsAt: null, duration: 0, pausedRemaining: null },
    programs: data.programs.map((program) => ({
      ...program,
      workouts: program.workouts.map((workout) => ({
        ...workout,
        name: workoutNameTranslations[workout.name] ?? workout.name,
      })),
    })),
    workoutSessions: data.workoutSessions.map((session) => ({
      ...session,
      workoutName: workoutNameTranslations[session.workoutName] ?? session.workoutName,
    })),
    activeWorkout: data.activeWorkout
      ? {
          ...data.activeWorkout,
          workoutName:
            workoutNameTranslations[data.activeWorkout.workoutName] ??
            data.activeWorkout.workoutName,
        }
      : null,
  } as AppData;
}
export const storageService = new LocalStorageService();
