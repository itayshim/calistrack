export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'mobility' | 'skill';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MeasurementType = 'reps' | 'time';
export interface Exercise {
  id: string;
  nameHe: string;
  nameEn: string;
  movementFamily?: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  muscles: string[];
  aliases?: string[];
  keywords?: string[];
  progressionOrder?: number;
  measurementType: MeasurementType;
  description: string;
  instructions: string[];
  commonMistakes: string[];
  easierExerciseId?: string;
  harderExerciseId?: string;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetMin: number;
  targetMax: number;
  restSeconds: number;
  notes?: string;
}
export interface WorkoutTemplate {
  id: string;
  programId: string;
  name: string;
  scheduledDays: number[];
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}
export interface Program {
  id: string;
  name: string;
  workouts: WorkoutTemplate[];
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutSet {
  id: string;
  setNumber: number;
  value: number;
  completed: boolean;
  completedAt?: string;
}
export interface ExerciseSession {
  id: string;
  exerciseId: string;
  workoutExerciseId?: string;
  target?: WorkoutExercise;
  sets: WorkoutSet[];
  notes?: string;
  skipped: boolean;
  extraSetCount?: number;
}
export interface WorkoutSession {
  id: string;
  workoutTemplateId?: string;
  workoutName: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  exercises: ExerciseSession[];
  currentExerciseIndex: number;
  difficultyRating?: number;
  feelingRating?: number;
  notes?: string;
  completionReady?: boolean;
}
export interface UserSettings {
  weeklyWorkoutGoal: number;
  restTimerSound: boolean;
  restTimerVibration: boolean;
  defaultRestSeconds: number;
  theme: 'dark' | 'light';
}
export type GoalType = 'weekly-workouts' | 'exercise-reps' | 'exercise-time' | 'first-skill';
export interface UserGoal {
  id: string;
  type: GoalType;
  title: string;
  exerciseId?: string;
  targetValue: number;
  createdAt: string;
  completedAt?: string;
}
export interface AppData {
  schemaVersion: number;
  exercises: Exercise[];
  programs: Program[];
  workoutSessions: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
  settings: UserSettings;
  goals: UserGoal[];
  restTimer: RestTimerState;
}
export interface RestTimerState {
  endsAt: number | null;
  duration: number;
  pausedRemaining: number | null;
}
