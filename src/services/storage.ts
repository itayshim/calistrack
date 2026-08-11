import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import type { AppData, Exercise, MeasurementType, WorkoutSet } from '../types';
import { findExerciseByReference } from '../utils/exerciseLocalization';
import { normalizeMeasurementType } from '../utils/performance';
import { normalizeRestSoundId } from './restSounds';
import { createFrontLeverWorkout, FRONT_LEVER_TEMPLATE_VERSION } from '../features/skills/frontLever';
import { applyExerciseMergeRedirects, EXERCISE_MERGE_CLIENT_SCHEMA_VERSION } from './exerciseMerges';
export const STORAGE_KEY = 'calistrack.app.v1';
const valid = (v: unknown): v is AppData => {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<AppData>;
  return (
    Array.from({ length: EXERCISE_MERGE_CLIENT_SCHEMA_VERSION }, (_, index) => index + 1).includes(d.schemaVersion ?? 0) &&
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
  const wasExistingInstallation = data.schemaVersion < 8;
  const usesPreviousUntouchedTimedDefaults =
    data.schemaVersion <= 10 &&
    data.settings.timerReactionAdjustmentSeconds === 5 &&
    data.settings.timedExerciseStartCountdownSeconds === 0;
  const legacyRestTimerSound = data.settings.restTimerSound;
  const settingsWithoutLegacyToggle = { ...data.settings };
  delete settingsWithoutLegacyToggle.restTimerSound;
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
  const programs = data.programs.map((program) => ({
    ...program,
    workouts: program.workouts.map((sourceWorkout) => {
      const workout = {
        ...sourceWorkout,
        name: workoutNameTranslations[sourceWorkout.name] ?? sourceWorkout.name,
        exercises: sourceWorkout.exercises.map((exercise) => ({ ...exercise, exerciseId: exerciseId(exercise.exerciseId), measurementType: measurementFor(exerciseId(exercise.exerciseId), exercise.measurementType) })),
      };
      if (workout.skillLink?.skillKey !== 'front-lever' || workout.skillLink.kind !== 'workout' || workout.skillLink.linkState !== 'linked' || workout.skillLink.templateVersion >= FRONT_LEVER_TEMPLATE_VERSION) return workout;
      const generated = createFrontLeverWorkout(workout.skillLink.levelKey, exercises, false, program.id);
      const retained = workout.exercises.filter((item) => item.skillSection !== 'warm-up' && item.requiredForSkillSuccess !== true);
      return { ...workout, exercises: [...retained, ...generated.exercises.map((item, index) => ({ ...item, order: retained.length + index }))], skillWarmup: undefined, skillLink: { ...workout.skillLink, templateVersion: FRONT_LEVER_TEMPLATE_VERSION } };
    }),
  }));
  return applyExerciseMergeRedirects({
    ...data,
    schemaVersion: EXERCISE_MERGE_CLIENT_SCHEMA_VERSION,
    skillProgress: data.skillProgress ?? {},
    managedProgramEnrollments: data.managedProgramEnrollments ?? [],
    settings: {
      ...settingsWithoutLegacyToggle,
      language: data.settings.language ?? 'en',
      allowEmptyNumericFields: data.settings.allowEmptyNumericFields ?? false,
      restCompletionSound: data.settings.restCompletionSound
        ? normalizeRestSoundId(data.settings.restCompletionSound)
        : legacyRestTimerSound === false
          ? 'silent'
          : 'classic',
      restAlertRepeatCount: [1, 2, 3].includes(data.settings.restAlertRepeatCount)
        ? data.settings.restAlertRepeatCount
        : 1,
      backgroundTimerNotifications: data.settings.backgroundTimerNotifications ?? false,
      timerReactionAdjustmentSeconds:
        usesPreviousUntouchedTimedDefaults
          ? 2
          : Number.isFinite(data.settings.timerReactionAdjustmentSeconds) &&
              data.settings.timerReactionAdjustmentSeconds >= 0
            ? data.settings.timerReactionAdjustmentSeconds
            : 2,
      timedExerciseStartCountdownSeconds: usesPreviousUntouchedTimedDefaults
        ? 3
        : [0, 3, 5].includes(data.settings.timedExerciseStartCountdownSeconds)
          ? data.settings.timedExerciseStartCountdownSeconds
          : 3,
      onboardingCompleted:
        wasExistingInstallation ? true : (data.settings.onboardingCompleted ?? false),
    },
    programs,
    activeProgramId:
      data.activeProgramId && programs.some((program) => program.id === data.activeProgramId)
        ? data.activeProgramId
        : programs[0]?.id ?? null,
    exercises,
    restTimer: data.restTimer
      ? {
          ...data.restTimer,
          id: data.restTimer.id ??
            (data.restTimer.endsAt ? `legacy-rest-${data.restTimer.endsAt}` : null),
        }
      : { id: null, endsAt: null, duration: 0, pausedRemaining: null },
    exerciseStopwatch: data.exerciseStopwatch ?? {
      id: null,
      sessionExerciseId: null,
      startedAt: null,
      running: false,
      measuredSeconds: null,
      adjustedSeconds: null,
      mode: 'countup',
      endsAt: null,
      targetSeconds: null,
    },
    workoutSessions: data.workoutSessions.map(migrateSession),
    goals: data.goals.map((goal) => ({
      ...goal,
      exerciseId: goal.exerciseId ? exerciseId(goal.exerciseId) : undefined,
    })),
    activeWorkout: data.activeWorkout
      ? migrateSession(data.activeWorkout)
      : null,
  } as AppData);
}
export const storageService = new LocalStorageService();
