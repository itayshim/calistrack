export type ExerciseCategory = string;
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MeasurementType = 'reps' | 'duration' | 'weighted_reps';
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
  descriptionHe?: string;
  instructionsHe?: string[];
  commonMistakesHe?: string[];
  aliasesHe?: string[];
  keywordsHe?: string[];
  stableKey?: string;
  canonicalExerciseId?: string;
  source?: 'built-in' | 'global' | 'personal';
  media?: ExerciseMedia[];
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
  targetAddedWeightKg?: number;
  minimumAddedWeightKg?: number;
  restSeconds: number;
  notes?: string;
  measurementType?: MeasurementType;
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
  /** @deprecated Read only when migrating workout logs created before schema v5. */
  value?: number;
  reps?: number;
  durationSeconds?: number;
  addedWeightKg?: number;
  notes?: string;
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
  measurementType?: MeasurementType;
  replacedDuringWorkout?: boolean;
  replacedByExerciseId?: string;
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
  language: 'en' | 'he';
  allowEmptyNumericFields: boolean;
  onboardingCompleted: boolean;
}
export type GoalType =
  | 'weekly-workouts'
  | 'exercise-reps'
  | 'exercise-time'
  | 'exercise-weighted-reps'
  | 'first-skill';
export interface UserGoal {
  id: string;
  type: GoalType;
  title: string;
  exerciseId?: string;
  targetValue: number;
  targetReps?: number;
  targetAddedWeightKg?: number;
  createdAt: string;
  completedAt?: string;
}
export interface AppData {
  schemaVersion: number;
  exercises: Exercise[];
  programs: Program[];
  activeProgramId: string | null;
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

export type WorkoutSetInput = Pick<
  WorkoutSet,
  'reps' | 'durationSeconds' | 'addedWeightKg' | 'notes'
>;

export type MediaType = 'youtube' | 'uploaded_video' | 'image' | 'external_link' | 'coaching_note' | 'equipment_note';
export interface ExerciseMedia {
  id: string;
  exerciseId: string;
  mediaType: MediaType;
  provider: 'youtube' | 'supabase_storage' | 'external';
  title?: string;
  description?: string;
  externalUrl?: string;
  youtubeVideoId?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  sortOrder: number;
  isPrimary: boolean;
  isPublished: boolean;
}
