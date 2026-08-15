export type ExerciseCategory = string;
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MeasurementType = 'reps' | 'duration' | 'weighted_reps';
export type RestSoundId =
  | 'classic'
  | 'bell'
  | 'digital-beep'
  | 'double-beep'
  | 'gym-buzzer'
  | 'sharp-alert'
  | 'chime'
  | 'silent';
export type RestAlertRepeatCount = 1 | 2 | 3;
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
  equipment?: string[];
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
  skillRole?: string;
  skillSection?: 'warm-up' | 'work';
  requiredForSkillSuccess?: boolean;
  managedSectionKey?: string;
  managedSectionKind?: string;
  managedRequiredForSuccess?: boolean;
  allowedReplacementExerciseIds?: string[];
  replacementCountsForCompletion?: boolean;
}
export interface ManagedProgramLink {
  programKey: string;
  version: number;
  phaseKey?: string;
  weekKey: string;
  workoutKey: string;
  enrollmentId?: string;
  stageAttemptId?: string;
  source: 'managed_program';
  preview?: boolean;
}
export type ManagedStageReadinessRecommendation = 'advance' | 'repeat' | 'review' | 'unknown';
export interface ManagedProgramStageAttempt {
  id: string;
  weekKey: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  completedWorkoutKeys: string[];
  successfulWorkoutKeys: string[];
  skippedWorkoutKeys: string[];
  assessedWorkoutKeys?: string[];
  recommendation?: ManagedStageReadinessRecommendation;
  decision?: 'advanced' | 'repeated' | 'program_finished';
  decidedAt?: string;
}
export interface SkillWorkoutLink {
  skillKey: string;
  levelKey: string;
  templateVersion: number;
  kind: 'workout' | 'assessment';
  linkState: 'linked' | 'detached';
  preview?: boolean;
}
export interface SkillWarmupItem {
  exerciseId: string;
  stableKey: string;
  guidanceEn: string;
  guidanceHe: string;
  durationSeconds?: number;
  status?: 'pending' | 'done' | 'skipped';
}
export interface SkillWarmupState {
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  currentIndex: number;
  items: SkillWarmupItem[];
  phase?: 'warm_up' | 'cool_down';
}
export interface WorkoutTemplate {
  id: string;
  programId: string;
  name: string;
  scheduledDays: number[];
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
  skillLink?: SkillWorkoutLink;
  skillWarmup?: SkillWarmupItem[];
  skillCooldown?: SkillWarmupItem[];
  managedProgramLink?: ManagedProgramLink;
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
  /** Original identity retained when a canonical merge redirect migrates this session. */
  mergedFromExerciseId?: string;
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
  /** Stable origin used to scope runtime history without duplicating workout data. */
  programId?: string;
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
  skillLink?: SkillWorkoutLink;
  skillTechniqueRating?: 'good' | 'partial' | 'breakdown' | 'needs-work';
  skillSuccessful?: boolean;
  skillWarmup?: SkillWarmupState;
  pendingCooldown?: SkillWarmupItem[];
  managedProgramLink?: ManagedProgramLink;
}
export interface ManagedProgramEnrollment {
  id: string;
  programKey: string;
  programVersion: number;
  startDate: string;
  currentWeekKey: string;
  completedWorkoutKeys: string[];
  successfulWorkoutKeys?: string[];
  assessedWorkoutKeys?: string[];
  skippedWorkoutKeys: string[];
  preferredWeekdays: number[];
  status: 'active' | 'completed' | 'cancelled';
  detached: boolean;
  stageAttempts?: ManagedProgramStageAttempt[];
  currentStageAttemptId?: string;
}
export interface SkillAssessmentRecord {
  id: string;
  levelKey: string;
  sessionId: string;
  passed: boolean;
  durationSeconds?: number;
  reps?: number;
  measurementType?: MeasurementType;
  techniqueRating: 'good' | 'partial' | 'breakdown' | 'needs-work';
  completedAt: string;
}
export interface UserSkillProgress {
  skillKey: string;
  activeLevelKey: string;
  unlockedLevelKeys: string[];
  masteredLevelKeys: string[];
  completedWorkoutSessionIds: string[];
  assessments: SkillAssessmentRecord[];
}
export interface UserSettings {
  weeklyWorkoutGoal: number;
  /** @deprecated Kept optional for importing settings saved before schema v9. */
  restTimerSound?: boolean;
  restCompletionSound: RestSoundId;
  restAlertRepeatCount: RestAlertRepeatCount;
  restTimerVibration: boolean;
  backgroundTimerNotifications: boolean;
  timerReactionAdjustmentSeconds: number;
  timedExerciseStartCountdownSeconds: 0 | 3 | 5;
  defaultRestSeconds: number;
  theme: 'dark' | 'light';
  language: 'en' | 'he';
  allowEmptyNumericFields: boolean;
  onboardingCompleted: boolean;
}
export type GoalType =
  'weekly-workouts' | 'exercise-reps' | 'exercise-time' | 'exercise-weighted-reps' | 'first-skill';
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
  exerciseStopwatch: ExerciseStopwatchState;
  skillProgress: Record<string, UserSkillProgress>;
  managedProgramEnrollments: ManagedProgramEnrollment[];
}
export interface RestTimerState {
  id: string | null;
  endsAt: number | null;
  duration: number;
  pausedRemaining: number | null;
}
export interface ExerciseStopwatchState {
  id: string | null;
  sessionExerciseId: string | null;
  startedAt: number | null;
  running: boolean;
  measuredSeconds: number | null;
  adjustedSeconds: number | null;
  mode?: 'countup' | 'countdown';
  endsAt?: number | null;
  targetSeconds?: number | null;
  targetReached?: boolean;
}

export type WorkoutSetInput = Pick<
  WorkoutSet,
  'reps' | 'durationSeconds' | 'addedWeightKg' | 'notes'
>;

export type MediaType =
  'youtube' | 'uploaded_video' | 'image' | 'external_link' | 'coaching_note' | 'equipment_note';
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
export type ExerciseVisualFormat = 'svg' | 'webp' | 'png';
export interface ExerciseVisualAsset {
  stableKey: string;
  storagePath?: string;
  src?: string;
  mimeType: 'image/svg+xml' | 'image/webp' | 'image/png';
  format: ExerciseVisualFormat;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  viewBox?: string;
  updatedAt?: string;
}
