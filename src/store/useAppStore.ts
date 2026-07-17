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
  WorkoutTemplate,
} from '../types';
import { createId } from '../utils/id';
interface Store extends AppData {
  hydrated: boolean;
  toast: string | null;
  restTimer: RestTimerState;
  hydrate: () => void;
  persist: () => void;
  setToast: (v: string | null) => void;
  addExercise: (e: Exercise) => void;
  updateExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;
  saveProgram: (p: Program) => void;
  deleteProgram: (id: string) => void;
  adoptBeginner: () => void;
  startWorkout: (t: WorkoutTemplate) => boolean;
  completeSet: (exerciseIndex: number, value: number) => void;
  editSet: (exerciseIndex: number, setId: string, value: number) => void;
  deleteSet: (exerciseIndex: number, setId: string) => void;
  skipExercise: (exerciseIndex: number) => void;
  setCurrentExercise: (i: number) => void;
  setExerciseNotes: (i: number, notes: string) => void;
  finishWorkout: (notes?: string, difficulty?: number, feeling?: number) => void;
  cancelWorkout: () => void;
  updateSession: (s: WorkoutSession) => void;
  deleteSession: (id: string) => void;
  setSettings: (s: UserSettings) => void;
  addGoal: (g: UserGoal) => void;
  deleteGoal: (id: string) => void;
  importData: (d: AppData) => void;
  reset: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
}
const initial = createInitialData();
export const useAppStore = create<Store>((set, get) => ({
  ...initial,
  hydrated: false,
  toast: null,
  restTimer: { endsAt: null, duration: 0, pausedRemaining: null },
  hydrate: () => set({ ...storageService.loadAppData(), hydrated: true }),
  persist: () =>
    storageService.saveAppData({
      schemaVersion: get().schemaVersion,
      exercises: get().exercises,
      programs: get().programs,
      workoutSessions: get().workoutSessions,
      activeWorkout: get().activeWorkout,
      settings: get().settings,
      goals: get().goals,
    }),
  setToast: (v) => set({ toast: v }),
  addExercise: (e) => {
    set((s) => ({ exercises: [...s.exercises, e] }));
    get().persist();
  },
  updateExercise: (e) => {
    set((s) => ({ exercises: s.exercises.map((x) => (x.id === e.id ? e : x)) }));
    get().persist();
  },
  deleteExercise: (id) => {
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) }));
    get().persist();
  },
  saveProgram: (p) => {
    set((s) => ({
      programs: [...s.programs.filter((x) => x.id !== p.id), p],
      toast: 'Program saved',
    }));
    get().persist();
  },
  deleteProgram: (id) => {
    set((s) => ({ programs: s.programs.filter((p) => p.id !== id) }));
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
          id: createId(),
          exerciseId: x.exerciseId,
          workoutExerciseId: x.id,
          target: { ...x },
          sets: [],
          skipped: false,
        })),
    };
    set({ activeWorkout: s });
    get().persist();
    return true;
  },
  completeSet: (i, value) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    const ex = a.exercises[i];
    ex.sets.push({
      id: createId(),
      setNumber: ex.sets.length + 1,
      value,
      completed: true,
      completedAt: new Date().toISOString(),
    });
    const duration = ex.target?.restSeconds ?? get().settings.defaultRestSeconds;
    set({
      activeWorkout: a,
      restTimer: { endsAt: Date.now() + duration * 1000, duration, pausedRemaining: null },
      toast: 'Set completed and saved',
    });
    get().persist();
  },
  editSet: (i, id, value) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    const st = a.exercises[i].sets.find((x) => x.id === id);
    if (st) st.value = value;
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
    set({ activeWorkout: a });
    get().persist();
  },
  setCurrentExercise: (i) => {
    const a = structuredClone(get().activeWorkout);
    if (a) {
      a.currentExerciseIndex = i;
      set({ activeWorkout: a });
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
  finishWorkout: (notes, difficultyRating, feelingRating) => {
    const a = structuredClone(get().activeWorkout);
    if (!a) return;
    Object.assign(a, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      notes,
      difficultyRating,
      feelingRating,
    });
    set((s) => ({
      activeWorkout: null,
      workoutSessions: [a, ...s.workoutSessions],
      restTimer: { endsAt: null, duration: 0, pausedRemaining: null },
      toast: 'Workout completed',
    }));
    get().persist();
  },
  cancelWorkout: () => {
    set({ activeWorkout: null, restTimer: { endsAt: null, duration: 0, pausedRemaining: null } });
    get().persist();
  },
  updateSession: (s) => {
    set((x) => ({ workoutSessions: x.workoutSessions.map((v) => (v.id === s.id ? s : v)) }));
    get().persist();
  },
  deleteSession: (id) => {
    set((s) => ({
      workoutSessions: s.workoutSessions.filter((x) => x.id !== id),
      toast: 'Workout deleted',
    }));
    get().persist();
  },
  setSettings: (settings) => {
    set({ settings, toast: 'Settings saved' });
    get().persist();
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
    set({ ...d, toast: 'Import completed successfully' });
    get().persist();
  },
  reset: () => {
    storageService.resetData();
    set({ ...createInitialData(), toast: 'All data was reset' });
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
  },
  resumeTimer: () => {
    const r = get().restTimer;
    if (r.pausedRemaining !== null)
      set({
        restTimer: { ...r, endsAt: Date.now() + r.pausedRemaining * 1000, pausedRemaining: null },
      });
  },
  resetTimer: () => {
    const r = get().restTimer;
    set({ restTimer: { ...r, endsAt: Date.now() + r.duration * 1000, pausedRemaining: null } });
  },
  skipTimer: () => set({ restTimer: { endsAt: null, duration: 0, pausedRemaining: null } }),
}));
