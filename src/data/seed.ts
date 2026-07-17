import { builtInExercises, findBuiltIn } from './exercises';
import type { AppData, Program, WorkoutExercise, WorkoutTemplate } from '../types';
const now = new Date().toISOString();
const config = (name: string, order: number): WorkoutExercise => {
  const e = findBuiltIn(name);
  const warm = e.category === 'mobility';
  return {
    id: `seed-we-${name}`,
    exerciseId: e.id,
    order,
    targetSets: warm ? 1 : 3,
    targetMin: e.measurementType === 'time' ? 20 : 8,
    targetMax: e.measurementType === 'time' ? 30 : 12,
    restSeconds: warm ? 30 : 75,
  };
};
const makeWorkout = (id: string, name: string, day: number, names: string[]): WorkoutTemplate => ({
  id,
  programId: 'beginner-program',
  name,
  scheduledDays: [day],
  exercises: names.map(config),
  createdAt: now,
  updatedAt: now,
});
export const beginnerProgram: Program = {
  id: 'beginner-program',
  name: 'Beginner Full Body',
  isBuiltIn: true,
  createdAt: now,
  updatedAt: now,
  workouts: [
    makeWorkout('beginner-a', 'Workout A – Full Body', 1, [
      'Wrist Warm-Up',
      'Bodyweight Squat',
      'Incline Push-Up',
      'Australian Row',
      'Glute Bridge',
      'Plank',
    ]),
    makeWorkout('beginner-b', 'Workout B – Full Body', 3, [
      'Shoulder Circles',
      'Reverse Lunge',
      'Knee Push-Up',
      'Assisted Pull-Up',
      'Calf Raise',
      'Dead Bug',
    ]),
    makeWorkout('beginner-c', 'Workout C – Full Body', 5, [
      'Wrist Warm-Up',
      'Bodyweight Squat',
      'Incline Push-Up',
      'Australian Row',
      'Glute Bridge',
      'Side Plank',
    ]),
  ],
};
export const createInitialData = (): AppData => ({
  schemaVersion: 2,
  exercises: builtInExercises,
  programs: [],
  workoutSessions: [],
  activeWorkout: null,
  settings: {
    weeklyWorkoutGoal: 3,
    restTimerSound: false,
    restTimerVibration: true,
    defaultRestSeconds: 75,
    theme: 'dark',
  },
  goals: [],
  restTimer: { endsAt: null, duration: 0, pausedRemaining: null },
});
