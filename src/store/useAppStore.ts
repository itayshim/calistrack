import { create } from 'zustand';
import { beginnerProgram, createInitialData } from '../data/seed';
import { storageService } from '../services/storage';
import type {
  AppData,
  Exercise,
  Program,
  RestTimerState,
  UserGoal,
  UserSettings,
  WorkoutSession,
  MeasurementType,
  WorkoutSetInput,
  WorkoutTemplate,
  ExerciseStopwatchState,
  UserSkillProgress,
} from '../types';
import { createId } from '../utils/id';
import { translations, type TranslationKey } from '../locales/translations';
import {
  calculateRecordedDuration,
  isValidSetInput,
  normalizeMeasurementType,
  normalizeSetInput,
} from '../utils/performance';
import { evaluateSkillSession, nextFrontLeverLevel } from '../features/skills/frontLever';
interface Store extends AppData {
  hydrated: boolean;
  toast: string | null;
  hydrate: () => void;
  persist: () => void;
  setToast: (v: string | null) => void;
  setSharedExercises: (exercises: Exercise[]) => void;
  addExercise: (e: Exercise) => void;
  updateExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;
  saveProgram: (p: Program) => void;
  renameProgram: (id: string, name: string) => void;
  duplicateProgram: (id: string) => string | null;
  setActiveProgram: (id: string) => void;
  deleteProgram: (id: string) => void;
  adoptBeginner: () => void;
  startWorkout: (t: WorkoutTemplate) => boolean;
  completeSet: (exerciseIndex: number, value: WorkoutSetInput | number) => boolean;
  addExtraSet: (exerciseIndex: number) => void;
  editSet: (exerciseIndex: number, setId: string, value: WorkoutSetInput | number) => void;
  deleteSet: (exerciseIndex: number, setId: string) => void;
  skipExercise: (exerciseIndex: number) => void;
  setCurrentExercise: (i: number) => void;
  setExerciseNotes: (i: number, notes: string) => void;
  replaceActiveExercise: (
    i: number,
    exerciseId: string,
    options?: {
      keepCompleted?: boolean;
      updateProgram?: boolean;
      targetConfiguration?: Partial<WorkoutTemplate['exercises'][number]>;
    },
  ) => void;
  finishWorkout: (notes?: string, difficulty?: number, feeling?: number, technique?: 'good' | 'needs-work') => void;
  activateSkillLevel: (skillKey: string, levelKey: string) => void;
  cancelWorkout: () => void;
  updateSession: (s: WorkoutSession) => void;
  deleteSession: (id: string) => void;
  setSettings: (s: UserSettings) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  requestOnboardingReplay: () => void;
  onboardingReplayRequest: number;
  addGoal: (g: UserGoal) => void;
  deleteGoal: (id: string) => void;
  importData: (d: AppData) => void;
  reset: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  completeRestTimer: (id: string) => boolean;
  startExerciseStopwatch: (sessionExerciseId: string) => void;
  startExerciseCountdown: (sessionExerciseId: string, durationSeconds: number) => void;
  stopExerciseStopwatch: () => { measuredSeconds: number; adjustedSeconds: number } | null;
  completeExerciseCountdown: (id: string) => boolean;
  resetExerciseStopwatch: () => void;
  startSkillWarmup: () => void;
  skipSkillWarmup: () => void;
  completeSkillWarmupItem: () => void;
  skipSkillWarmupItem: () => void;
}
const initial = createInitialData();
export const useAppStore = create<Store>((set, get) => ({
  ...initial,
  hydrated: false,
  toast: null,
  onboardingReplayRequest: 0,
  hydrate: () => set({ ...storageService.loadAppData(), hydrated: true }),
  persist: () =>
    storageService.saveAppData({
      schemaVersion: get().schemaVersion,
      exercises: get().exercises,
      programs: get().programs,
      activeProgramId: get().activeProgramId,
      workoutSessions: get().workoutSessions,
      activeWorkout: get().activeWorkout,
      settings: get().settings,
      goals: get().goals,
      restTimer: get().restTimer,
      exerciseStopwatch: get().exerciseStopwatch,
      skillProgress: get().skillProgress,
    }),
  setToast: (v) => set({ toast: v }),
  setSharedExercises: (exercises) => set({ exercises }),
  addExercise: (e) => {
    set((s) => ({ exercises: [...s.exercises, e] }));
    get().persist();
  },
  updateExercise: (e) => {
    set((s) => ({ exercises: s.exercises.map((x) => (x.id === e.id ? e : x)) }));
    get().persist();
  },
  deleteExercise: (id) => {
    const referenced =
      get().programs.some((program) =>
        program.workouts.some((workout) =>
          workout.exercises.some((exercise) => exercise.exerciseId === id),
        ),
      ) ||
      get().workoutSessions.some((session) =>
        session.exercises.some((exercise) => exercise.exerciseId === id),
      ) ||
      get().activeWorkout?.exercises.some((exercise) => exercise.exerciseId === id);
    if (referenced) {
      set({ toast: localized(get().settings.language, 'exerciseInUse') });
      return;
    }
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) }));
    get().persist();
  },
  saveProgram: (p) => {
    const previousProgram = get().programs.find((program) => program.id === p.id);
    const program = {
      ...p,
      workouts: p.workouts.map((workout) => {
        if (!workout.skillLink || workout.skillLink.linkState === 'detached') return workout;
        const previous = previousProgram?.workouts.find((item) => item.id === workout.id);
        if (!previous?.skillLink || sameSkillConfiguration(previous, workout)) return workout;
        return { ...workout, skillLink: { ...workout.skillLink, linkState: 'detached' as const } };
      }),
    };
    set((s) => ({
      programs: s.programs.some((item) => item.id === program.id)
        ? s.programs.map((item) => (item.id === program.id ? program : item))
        : [...s.programs, program],
      activeProgramId: s.activeProgramId ?? (s.programs.length === 0 ? program.id : null),
      toast: localized(get().settings.language, 'programSaved'),
    }));
    get().persist();
  },
  renameProgram: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      programs: s.programs.map((program) =>
        program.id === id
          ? { ...program, name: trimmed, updatedAt: new Date().toISOString() }
          : program,
      ),
      toast: localized(get().settings.language, 'programRenamed'),
    }));
    get().persist();
  },
  duplicateProgram: (id) => {
    const source = get().programs.find((program) => program.id === id);
    if (!source) return null;
    const language = get().settings.language;
    const suffix = language === 'he' ? 'עותק' : 'Copy';
    const existingNames = new Set(get().programs.map((program) => program.name));
    let name = `${source.name} — ${suffix}`;
    let index = 2;
    while (existingNames.has(name)) name = `${source.name} — ${suffix} ${index++}`;
    const now = new Date().toISOString();
    const programId = createId();
    const duplicate: Program = {
      ...structuredClone(source),
      id: programId,
      name,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      workouts: source.workouts.map((workout) => ({
        ...structuredClone(workout),
        id: createId(),
        programId,
        createdAt: now,
        updatedAt: now,
        exercises: workout.exercises.map((exercise) => ({ ...structuredClone(exercise), id: createId() })),
      })),
    };
    set((s) => ({
      programs: [...s.programs, duplicate],
      toast: localized(language, 'programDuplicated'),
    }));
    get().persist();
    return programId;
  },
  setActiveProgram: (id) => {
    if (!get().programs.some((program) => program.id === id)) return;
    set({ activeProgramId: id, toast: localized(get().settings.language, 'activeProgramUpdated') });
    get().persist();
  },
  deleteProgram: (id) => {
    set((s) => ({
      programs: s.programs.filter((p) => p.id !== id),
      activeProgramId: s.activeProgramId === id ? null : s.activeProgramId,
      toast: localized(get().settings.language, 'programDeleted'),
    }));
    get().persist();
  },
  adoptBeginner: () => {
    const id = createId(),
      now = new Date().toISOString();
    const p = {
      ...structuredClone(beginnerProgram),
      id,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      workouts: beginnerProgram.workouts.map((w) => ({
        ...structuredClone(w),
        id: createId(),
        programId: id,
        createdAt: now,
        updatedAt: now,
        exercises: w.exercises.map((x) => ({ ...x, id: createId() })),
      })),
    };
    get().saveProgram(p);
  },
  startWorkout: (t) => {
    if (get().activeWorkout) return false;
    const s: WorkoutSession = {
      id: createId(),
      workoutTemplateId: t.id,
      workoutName: t.name,
      startedAt: new Date().toISOString(),
      status: 'active',
      currentExerciseIndex: 0,
      exercises: t.exercises
        .sort((a, b) => a.order - b.order)
        .map((x) => ({
          measurementType:
            x.measurementType ??
            get().exercises.find((exercise) => exercise.id === x.exerciseId)?.measurementType ??
            'reps',
          id: createId(),
          exerciseId: x.exerciseId,
          workoutExerciseId: x.id,
          target: { ...x },
          sets: [],
          skipped: false,
          extraSetCount: 0,
        })),
      completionReady: false,
      skillLink: t.skillLink,
      skillWarmup: t.skillWarmup?.length ? { status: 'pending', currentIndex: 0, items: t.skillWarmup.map((item) => ({ ...item, status: 'pending' })) } : undefined,
    };
    set({ activeWorkout: s, restTimer: emptyTimer(), exerciseStopwatch: emptyStopwatch() });
    get().persist();
    return true;
  },
  completeSet: (i, value) => {
    const currentTimer = get().restTimer;
    const restActive =
      (currentTimer.pausedRemaining !== null && currentTimer.pausedRemaining > 0) ||
      (currentTimer.endsAt !== null && currentTimer.endsAt > Date.now());
    if (restActive) return false;
    const a = structuredClone(get().activeWorkout);
    if (!a) return false;
    const ex = a.exercises[i];
    if (!ex || ex.skipped) return false;
    const measurementType = normalizeMeasurementType(
      ex.measurementType ??
        ex.target?.measurementType ??
        get().exercises.find((exercise) => exercise.id === ex.exerciseId)?.measurementType,
    );
    const input = normalizeSetInput(value, measurementType);
    if (!isValidSetInput(input, measurementType, ex.target?.minimumAddedWeightKg)) {
      set({ toast: localized(get().settings.language, 'invalidSetValue') });
      return false;
    }
    const planned = ex.target?.targetSets ?? 0;
    const allowed = planned + (ex.extraSetCount ?? 0);
    if (ex.sets.filter((item) => item.completed).length >= allowed) return false;
    ex.sets.push({
      id: createId(),
      setNumber: ex.sets.length + 1,
      ...input,
      completed: true,
      completedAt: new Date().toISOString(),
    });
    const completed = ex.sets.filter((item) => item.completed).length;
    const completedPlannedSets = completed >= planned;
    const completedAllowedSets = completed >= allowed;
    const isLastExercise = i === a.exercises.length - 1;
    if (completedPlannedSets && completedAllowedSets) {
      if (isLastExercise) a.completionReady = true;
      else a.currentExerciseIndex = i + 1;
    }
    const duration = ex.target?.restSeconds ?? get().settings.defaultRestSeconds;
    const shouldRest = !completedAllowedSets && duration > 0;
    set({
      activeWorkout: a,
      restTimer: shouldRest
        ? { id: createId(), endsAt: Date.now() + duration * 1000, duration, pausedRemaining: null }
        : emptyTimer(),
      toast: localized(get().settings.language, completedAllowedSets ? 'exerciseCompleted' : 'setCompleted'),
    });
    get().persist();
    return true;
  },
  addExtraSet: (i) => {
    const a = structuredClone(get().activeWorkout);
    if (!a?.exercises[i]) return;
    a.exercises[i].extraSetCount = (a.exercises[i].extraSetCount ?? 0) + 1;
    a.currentExerciseIndex = i;
    a.completionReady = false;
    set({ activeWorkout: a, restTimer: emptyTimer(), toast: localized(get().settings.language, 'extraSetAdded') });
    get().persist();
  },
  editSet: (i, id, value) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    const st = a.exercises[i].sets.find((x) => x.id === id);
    const ex = a.exercises[i];
    const measurementType = normalizeMeasurementType(ex.measurementType ?? ex.target?.measurementType);
    const input = normalizeSetInput(value, measurementType);
    if (st && isValidSetInput(input, measurementType, ex.target?.minimumAddedWeightKg)) {
      Object.assign(st, input);
      delete st.value;
    }
    set({ activeWorkout: a });
    get().persist();
  },
  deleteSet: (i, id) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    a.exercises[i].sets = a.exercises[i].sets
      .filter((x) => x.id !== id)
      .map((x, n) => ({ ...x, setNumber: n + 1 }));
    set({ activeWorkout: a });
    get().persist();
  },
  skipExercise: (i) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    a.exercises[i].skipped = true;
    a.currentExerciseIndex = Math.min(i + 1, a.exercises.length - 1);
    set({ activeWorkout: a, restTimer: emptyTimer(), exerciseStopwatch: emptyStopwatch() });
    get().persist();
  },
  setCurrentExercise: (i) => {
    const a = structuredClone(get().activeWorkout);
    if (a) {
      const changedExercise = a.currentExerciseIndex !== i;
      a.currentExerciseIndex = i;
      a.completionReady = false;
      set({
        activeWorkout: a,
        ...(changedExercise ? { exerciseStopwatch: emptyStopwatch() } : {}),
      });
      get().persist();
    }
  },
  setExerciseNotes: (i, notes) => {
    const a = structuredClone(get().activeWorkout);
    if (a) {
      a.exercises[i].notes = notes;
      set({ activeWorkout: a });
      get().persist();
    }
  },
  replaceActiveExercise: (i, exerciseId, options = {}) => {
    const active = structuredClone(get().activeWorkout);
    const replacement = get().exercises.find((exercise) => exercise.id === exerciseId);
    const current = active?.exercises[i];
    if (!active || !current || !replacement || current.exerciseId === exerciseId) return;
    const previousType = normalizeMeasurementType(
      current.measurementType ?? current.target?.measurementType,
    );
    const nextType = replacement.measurementType;
    const completedSets = current.sets.filter((item) => item.completed);
    const target = {
      ...replacementTarget(current.target, exerciseId, nextType, previousType),
      ...options.targetConfiguration,
    };

    if (options.keepCompleted && completedSets.length > 0) {
      current.replacedDuringWorkout = true;
      current.replacedByExerciseId = exerciseId;
      current.target = current.target
        ? { ...current.target, targetSets: completedSets.length }
        : current.target;
      current.extraSetCount = 0;
      active.exercises.splice(i + 1, 0, {
        id: createId(),
        exerciseId,
        target: { ...target, id: createId(), order: i + 1 },
        sets: [],
        skipped: false,
        extraSetCount: 0,
        measurementType: nextType,
      });
      active.currentExerciseIndex = i + 1;
    } else {
      Object.assign(current, {
        exerciseId,
        measurementType: nextType,
        target,
        sets: [],
        skipped: false,
        extraSetCount: 0,
        replacedDuringWorkout: false,
        replacedByExerciseId: undefined,
      });
      active.currentExerciseIndex = i;
    }
    active.completionReady = false;

    let programs = get().programs;
    if (options.updateProgram && active.workoutTemplateId && current.workoutExerciseId) {
      programs = programs.map((program) => ({
        ...program,
        updatedAt: new Date().toISOString(),
        workouts: program.workouts.map((workout) =>
          workout.id !== active.workoutTemplateId
            ? workout
            : {
                ...workout,
                updatedAt: new Date().toISOString(),
                exercises: workout.exercises.map((item) =>
                  item.id === current.workoutExerciseId
                    ? {
                        ...replacementTarget(item, exerciseId, nextType, previousType),
                        ...options.targetConfiguration,
                      }
                    : item,
                ),
              },
        ),
      }));
    }
    set({ activeWorkout: active, programs, restTimer: emptyTimer() });
    get().persist();
  },
  finishWorkout: (notes, difficultyRating, feelingRating, skillTechniqueRating) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    Object.assign(a, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      notes,
      difficultyRating,
      feelingRating,
      skillTechniqueRating,
    });
    const skillSuccessful = !!a.skillLink && evaluateSkillSession(a, skillTechniqueRating ?? 'needs-work');
    a.skillSuccessful = skillSuccessful;
    if (a.skillLink?.preview) {
      set({ activeWorkout: null, restTimer: emptyTimer(), exerciseStopwatch: emptyStopwatch(), toast: localized(get().settings.language, 'workoutCompleted') });
      get().persist();
      return;
    }
    set((s) => ({
      activeWorkout: null,
      workoutSessions: [a, ...s.workoutSessions],
      restTimer: emptyTimer(),
      exerciseStopwatch: emptyStopwatch(),
      toast: localized(get().settings.language, 'workoutCompleted'),
      skillProgress: a.skillLink
        ? updateSkillProgress(s.skillProgress, a, skillSuccessful)
        : s.skillProgress,
    }));
    get().persist();
  },
  activateSkillLevel: (skillKey, levelKey) => {
    set((state) => {
      const current = state.skillProgress[skillKey] ?? defaultFrontLeverProgress();
      if (!current.unlockedLevelKeys.includes(levelKey)) return state;
      return { skillProgress: { ...state.skillProgress, [skillKey]: { ...current, activeLevelKey: levelKey } } };
    });
    get().persist();
  },
  cancelWorkout: () => {
    set({ activeWorkout: null, restTimer: emptyTimer(), exerciseStopwatch: emptyStopwatch() });
    get().persist();
  },
  updateSession: (s) => {
    set((x) => ({ workoutSessions: x.workoutSessions.map((v) => (v.id === s.id ? s : v)) }));
    get().persist();
  },
  deleteSession: (id) => {
    set((s) => ({
      workoutSessions: s.workoutSessions.filter((x) => x.id !== id),
      toast: localized(get().settings.language, 'workoutDeleted'),
    }));
    get().persist();
  },
  setSettings: (settings) => {
    set({ settings, toast: localized(settings.language, 'settingsSaved') });
    get().persist();
  },
  setOnboardingCompleted: (onboardingCompleted) => {
    set((state) => ({
      settings: { ...state.settings, onboardingCompleted },
    }));
    get().persist();
  },
  requestOnboardingReplay: () => {
    set((state) => ({ onboardingReplayRequest: state.onboardingReplayRequest + 1 }));
  },
  addGoal: (g) => {
    set((s) => ({ goals: [...s.goals, g] }));
    get().persist();
  },
  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    get().persist();
  },
  importData: (d) => {
    set({ ...d, toast: localized(d.settings.language, 'importCompleted') });
    get().persist();
  },
  reset: () => {
    storageService.resetData();
    const data = createInitialData();
    set({
      ...data,
      onboardingReplayRequest: get().onboardingReplayRequest,
      toast: localized(data.settings.language, 'dataReset'),
    });
  },
  pauseTimer: () => {
    const r = get().restTimer;
    if (r.endsAt)
      set({
        restTimer: {
          ...r,
          endsAt: null,
          pausedRemaining: Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000)),
        },
      });
    get().persist();
  },
  resumeTimer: () => {
    const r = get().restTimer;
    if (r.pausedRemaining !== null)
      set({
        restTimer: { ...r, endsAt: Date.now() + r.pausedRemaining * 1000, pausedRemaining: null },
      });
    get().persist();
  },
  resetTimer: () => {
    const r = get().restTimer;
    set({ restTimer: { ...r, endsAt: Date.now() + r.duration * 1000, pausedRemaining: null } });
    get().persist();
  },
  skipTimer: () => {
    set({ restTimer: emptyTimer() });
    get().persist();
  },
  completeRestTimer: (id) => {
    if (!id || get().restTimer.id !== id) return false;
    set({ restTimer: emptyTimer() });
    get().persist();
    return true;
  },
  startExerciseStopwatch: (sessionExerciseId) => {
    const countdown = get().settings.timedExerciseStartCountdownSeconds;
    set({
      exerciseStopwatch: {
        id: createId(),
        sessionExerciseId,
        startedAt: Date.now() + countdown * 1000,
        running: true,
        measuredSeconds: null,
        adjustedSeconds: null,
        mode: 'countup',
        endsAt: null,
        targetSeconds: null,
      },
      restTimer: emptyTimer(),
    });
    get().persist();
  },
  startExerciseCountdown: (sessionExerciseId, durationSeconds) => {
    const duration = Math.max(1, Math.round(durationSeconds));
    const preparationSeconds = get().settings.timedExerciseStartCountdownSeconds;
    const startsAt = Date.now() + preparationSeconds * 1000;
    const id = createId();
    set({
      exerciseStopwatch: {
        id,
        sessionExerciseId,
        startedAt: startsAt,
        running: true,
        measuredSeconds: null,
        adjustedSeconds: null,
        mode: 'countdown',
        endsAt: startsAt + duration * 1000,
        targetSeconds: duration,
      },
      restTimer: emptyTimer(),
    });
    get().persist();
  },
  stopExerciseStopwatch: () => {
    const stopwatch = get().exerciseStopwatch;
    if (!stopwatch.running || !stopwatch.startedAt || stopwatch.mode === 'countdown') return null;
    const { measuredSeconds, recordedSeconds: adjustedSeconds } = calculateRecordedDuration(
      Date.now() - stopwatch.startedAt,
      get().settings.timerReactionAdjustmentSeconds,
    );
    set({
      exerciseStopwatch: {
        ...stopwatch,
        running: false,
        measuredSeconds,
        adjustedSeconds,
      },
    });
    get().persist();
    return { measuredSeconds, adjustedSeconds };
  },
  completeExerciseCountdown: (id) => {
    const stopwatch = get().exerciseStopwatch;
    if (
      !id ||
      stopwatch.id !== id ||
      stopwatch.mode !== 'countdown' ||
      !stopwatch.running
    ) {
      return false;
    }
    const duration = stopwatch.targetSeconds ?? 0;
    set({
      exerciseStopwatch: {
        ...stopwatch,
        running: false,
        measuredSeconds: duration,
        adjustedSeconds: duration,
      },
    });
    get().persist();
    return true;
  },
  resetExerciseStopwatch: () => {
    set({ exerciseStopwatch: emptyStopwatch() });
    get().persist();
  },
  startSkillWarmup: () => updateWarmup(set, get, 'start'),
  skipSkillWarmup: () => updateWarmup(set, get, 'skip-all'),
  completeSkillWarmupItem: () => updateWarmup(set, get, 'done'),
  skipSkillWarmupItem: () => updateWarmup(set, get, 'skip-item'),
}));

const emptyTimer = (): RestTimerState => ({ id: null, endsAt: null, duration: 0, pausedRemaining: null });
const emptyStopwatch = (): ExerciseStopwatchState => ({
  id: null,
  sessionExerciseId: null,
  startedAt: null,
  running: false,
  measuredSeconds: null,
  adjustedSeconds: null,
  mode: 'countup',
  endsAt: null,
  targetSeconds: null,
});
const replacementTarget = (
  target: WorkoutTemplate['exercises'][number] | undefined,
  exerciseId: string,
  nextType: MeasurementType,
  previousType: MeasurementType,
): WorkoutTemplate['exercises'][number] => {
  const compatible = nextType === previousType;
  return {
    id: target?.id ?? createId(),
    exerciseId,
    order: target?.order ?? 0,
    targetSets: target?.targetSets ?? 3,
    targetMin: compatible ? (target?.targetMin ?? 8) : nextType === 'duration' ? 20 : 5,
    targetMax: compatible ? (target?.targetMax ?? 12) : nextType === 'duration' ? 30 : 8,
    restSeconds: target?.restSeconds ?? 75,
    notes: target?.notes,
    measurementType: nextType,
    ...(nextType === 'weighted_reps'
      ? { targetAddedWeightKg: compatible ? target?.targetAddedWeightKg : 0 }
      : {}),
  };
};
const localized = (language: 'en' | 'he', key: TranslationKey) =>
  translations[language][key] ?? translations.en[key];

const updateWarmup = (
  set: (partial: Partial<Store> | ((state: Store) => Partial<Store>)) => void,
  get: () => Store,
  action: 'start' | 'skip-all' | 'done' | 'skip-item',
) => {
  const activeWorkout = structuredClone(get().activeWorkout);
  const warmup = activeWorkout?.skillWarmup;
  if (!activeWorkout || !warmup || warmup.status === 'completed' || warmup.status === 'skipped') return;
  if (action === 'start') warmup.status = 'in-progress';
  else if (action === 'skip-all') {
    warmup.status = 'skipped';
    warmup.items = warmup.items.map((item) => ({ ...item, status: 'skipped' }));
  } else {
    const item = warmup.items[warmup.currentIndex];
    if (!item) return;
    item.status = action === 'done' ? 'done' : 'skipped';
    const nextIndex = warmup.items.findIndex((candidate, index) => index > warmup.currentIndex && candidate.status === 'pending');
    if (nextIndex < 0) warmup.status = 'completed';
    else warmup.currentIndex = nextIndex;
  }
  set({ activeWorkout });
  get().persist();
};

const sameSkillConfiguration = (a: WorkoutTemplate, b: WorkoutTemplate) =>
  JSON.stringify(a.exercises.map(skillExerciseSignature)) === JSON.stringify(b.exercises.map(skillExerciseSignature));
const skillExerciseSignature = (exercise: WorkoutTemplate['exercises'][number]) => ({
  exerciseId: exercise.exerciseId, order: exercise.order, targetSets: exercise.targetSets,
  targetMin: exercise.targetMin, targetMax: exercise.targetMax,
  targetAddedWeightKg: exercise.targetAddedWeightKg, restSeconds: exercise.restSeconds,
  measurementType: exercise.measurementType, skillRole: exercise.skillRole,
  skillSection: exercise.skillSection, requiredForSkillSuccess: exercise.requiredForSkillSuccess,
});

const defaultFrontLeverProgress = (): UserSkillProgress => ({
  skillKey: 'front-lever',
  activeLevelKey: 'tuck',
  unlockedLevelKeys: ['tuck'],
  masteredLevelKeys: [],
  completedWorkoutSessionIds: [],
  assessments: [],
});

const updateSkillProgress = (
  records: Record<string, UserSkillProgress>,
  session: WorkoutSession,
  successful: boolean,
) => {
  const link = session.skillLink;
  if (!link) return records;
  const current = records[link.skillKey] ?? defaultFrontLeverProgress();
  if (current.completedWorkoutSessionIds.includes(session.id)) return records;
  const completedWorkoutSessionIds = [...current.completedWorkoutSessionIds, session.id];
  if (link.kind === 'workout') {
    return { ...records, [link.skillKey]: { ...current, completedWorkoutSessionIds } };
  }
  const durationSeconds = session.exercises[0]?.sets[0]?.durationSeconds ?? 0;
  const next = nextFrontLeverLevel(link.levelKey);
  const unlockedLevelKeys = successful && next && !current.unlockedLevelKeys.includes(next.key)
    ? [...current.unlockedLevelKeys, next.key]
    : current.unlockedLevelKeys;
  const masteredLevelKeys = successful && !current.masteredLevelKeys.includes(link.levelKey)
    ? [...current.masteredLevelKeys, link.levelKey]
    : current.masteredLevelKeys;
  return {
    ...records,
    [link.skillKey]: {
      ...current,
      unlockedLevelKeys,
      masteredLevelKeys,
      completedWorkoutSessionIds,
      assessments: [...current.assessments, {
        id: createId(), levelKey: link.levelKey, sessionId: session.id, passed: successful,
        durationSeconds, techniqueRating: session.skillTechniqueRating ?? 'needs-work',
        completedAt: session.completedAt ?? new Date().toISOString(),
      }],
    },
  };
};
