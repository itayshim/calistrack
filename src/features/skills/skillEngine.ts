import type {
  Exercise,
  MeasurementType,
  SkillWarmupItem,
  WorkoutExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../../types';
import { createId } from '../../utils/id';

export interface SkillPrescription {
  exerciseKey: string;
  sets: number;
  target: number;
  measurementType: MeasurementType;
  role: string;
  restSeconds?: number;
}
export interface SkillWarmupPrescription {
  exerciseKey: string;
  guidanceEn: string;
  guidanceHe: string;
  durationSeconds?: number;
}
export interface SkillAssessmentDefinition {
  exerciseKey: string;
  target: number;
  measurementType: MeasurementType;
  techniqueRequired: boolean;
}
export type SkillLifecycleStatus = 'draft' | 'ready' | 'published' | 'unpublished' | 'archived';
export interface SkillReplacementDefinition {
  exerciseKey: string;
  replacementExerciseKey: string;
  requireSameMeasurementType: boolean;
  targetMode: 'same' | 'custom';
  customTarget?: number;
}
export interface SkillBuilderMetadata {
  category?: string;
  difficultyMin?: string;
  difficultyMax?: string;
  equipment?: string[];
  coverAsset?: string;
  defaultRestSeconds?: number;
  assessmentRequired?: boolean;
  techniqueModel?: 'binary' | 'three-state';
  replacements?: SkillReplacementDefinition[];
}
export interface SkillLevelDefinition {
  key: string;
  number: number;
  nameEn: string;
  nameHe: string;
  work: SkillPrescription[];
  assessment: SkillAssessmentDefinition;
  performance: { exerciseKey: string; metric: MeasurementType; sideMode?: 'left-right' };
}
export interface SkillDefinition {
  key: string;
  templateVersion: number;
  nameEn: string;
  nameHe: string;
  descriptionEn: string;
  descriptionHe: string;
  techniquePromptEn: string;
  techniquePromptHe: string;
  levels: SkillLevelDefinition[];
  warmup: SkillWarmupPrescription[];
  metadata?: SkillBuilderMetadata;
}
export interface SkillValidationIssue {
  levelKey?: string;
  exerciseKey?: string;
  code: string;
  message: string;
}
export interface SkillValidationResult {
  valid: boolean;
  warnings: SkillValidationIssue[];
  blockingErrors: SkillValidationIssue[];
}

export const resolveSkillExercise = (exercises: Exercise[], stableKey: string) => {
  const matches = exercises.filter((item) => item.stableKey === stableKey);
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? `Duplicate skill exercise: ${stableKey}`
        : `Missing skill exercise: ${stableKey}`,
    );
  return matches[0];
};

const toWorkoutExercise = (
  item: SkillPrescription,
  order: number,
  exercises: Exercise[],
): WorkoutExercise => {
  const exercise = resolveSkillExercise(exercises, item.exerciseKey);
  return {
    id: createId(),
    exerciseId: exercise.id,
    order,
    targetSets: item.sets,
    targetMin: item.target,
    targetMax: item.target,
    restSeconds: item.restSeconds ?? 90,
    measurementType: item.measurementType,
    skillRole: item.role,
    skillSection: 'work',
    requiredForSkillSuccess: true,
  };
};

export function createSkillWorkout(
  definition: SkillDefinition,
  levelKey: string,
  exercises: Exercise[],
  includeWarmup: boolean,
  programId = 'skill-training',
  preview = false,
): WorkoutTemplate {
  const level = definition.levels.find((item) => item.key === levelKey);
  if (!level) throw new Error(`Unknown ${definition.key} level: ${levelKey}`);
  const now = new Date().toISOString();
  const skillWarmup: SkillWarmupItem[] | undefined = includeWarmup
    ? definition.warmup.map((item) => {
        const exercise = resolveSkillExercise(exercises, item.exerciseKey);
        return {
          exerciseId: exercise.id,
          stableKey: item.exerciseKey,
          guidanceEn: item.guidanceEn,
          guidanceHe: item.guidanceHe,
          durationSeconds: item.durationSeconds,
        };
      })
    : undefined;
  return {
    id: createId(),
    programId,
    name: `${definition.nameEn} · ${level.nameEn}`,
    scheduledDays: [],
    exercises: level.work.map((item, index) => toWorkoutExercise(item, index, exercises)),
    skillWarmup,
    createdAt: now,
    updatedAt: now,
    skillLink: {
      skillKey: definition.key,
      levelKey,
      templateVersion: definition.templateVersion,
      kind: 'workout',
      linkState: 'linked',
      preview,
    },
  };
}

export function createSkillAssessment(
  definition: SkillDefinition,
  levelKey: string,
  exercises: Exercise[],
): WorkoutTemplate {
  const level = definition.levels.find((item) => item.key === levelKey);
  if (!level) throw new Error(`Unknown ${definition.key} level: ${levelKey}`);
  const workout = createSkillWorkout(definition, levelKey, exercises, false);
  workout.name = `${definition.nameEn} assessment · ${level.nameEn}`;
  workout.exercises = [
    toWorkoutExercise(
      { ...level.assessment, sets: 1, role: 'primary-skill', restSeconds: 0 },
      0,
      exercises,
    ),
  ];
  workout.skillLink = { ...workout.skillLink!, kind: 'assessment' };
  return workout;
}

export function validateSkillContent(
  definition: SkillDefinition,
  exercises: Exercise[],
  onlyLevelKey?: string,
): SkillValidationResult {
  const blockingErrors: SkillValidationIssue[] = [];
  const warnings: SkillValidationIssue[] = [];
  const levels = onlyLevelKey
    ? definition.levels.filter((level) => level.key === onlyLevelKey)
    : definition.levels;
  if (!definition.key.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    blockingErrors.push({
      code: 'invalid_skill_key',
      message: 'Skill key must use lowercase kebab-case.',
    });
  if (!definition.nameEn.trim() || !definition.nameHe.trim())
    blockingErrors.push({
      code: 'missing_skill_translation',
      message: 'English and Hebrew Skill names are required.',
    });
  if (!onlyLevelKey && definition.levels.length === 0)
    blockingErrors.push({ code: 'missing_levels', message: 'At least one level is required.' });
  if (onlyLevelKey && levels.length === 0)
    blockingErrors.push({
      levelKey: onlyLevelKey,
      code: 'missing_level',
      message: `Unknown level ${onlyLevelKey}.`,
    });
  if (
    !onlyLevelKey &&
    new Set(definition.levels.map((level) => level.key)).size !== definition.levels.length
  )
    blockingErrors.push({
      code: 'duplicate_level_key',
      message: `${definition.nameEn} level keys must be unique.`,
    });
  if (!onlyLevelKey && definition.levels.some((level, index) => level.number !== index + 1))
    blockingErrors.push({
      code: 'invalid_level_order',
      message: `${definition.nameEn} levels must have deterministic sequential order.`,
    });
  const validateReference = (
    exerciseKey: string,
    expectedType?: MeasurementType,
    levelKey?: string,
  ) => {
    const matches = exercises.filter((exercise) => exercise.stableKey === exerciseKey);
    if (matches.length !== 1) {
      blockingErrors.push({
        levelKey,
        exerciseKey,
        code: matches.length ? 'duplicate_stable_key' : 'missing_exercise',
        message: matches.length
          ? `Stable key ${exerciseKey} is duplicated.`
          : `Missing exact stable key ${exerciseKey}.`,
      });
      return;
    }
    const exercise = matches[0];
    if (expectedType && exercise.measurementType !== expectedType)
      blockingErrors.push({
        levelKey,
        exerciseKey,
        code: 'measurement_mismatch',
        message: `${exerciseKey} must use ${expectedType}, found ${exercise.measurementType}.`,
      });
    if (!exercise.nameEn.trim() || !exercise.nameHe.trim())
      blockingErrors.push({
        levelKey,
        exerciseKey,
        code: 'missing_translation',
        message: `${exerciseKey} requires English and Hebrew names.`,
      });
  };
  const warmupKeys = new Set<string>();
  definition.warmup.forEach((item) => {
    validateReference(item.exerciseKey);
    if (warmupKeys.has(item.exerciseKey))
      blockingErrors.push({
        exerciseKey: item.exerciseKey,
        code: 'duplicate_warmup_reference',
        message: `${item.exerciseKey} is duplicated in the warm-up.`,
      });
    warmupKeys.add(item.exerciseKey);
    if (!item.guidanceEn.trim() || !item.guidanceHe.trim())
      blockingErrors.push({
        exerciseKey: item.exerciseKey,
        code: 'missing_guidance',
        message: `${item.exerciseKey} requires localized guidance.`,
      });
  });
  levels.forEach((level) => {
    if (
      !level.key.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) ||
      !level.nameEn.trim() ||
      !level.nameHe.trim()
    )
      blockingErrors.push({
        levelKey: level.key,
        code: 'invalid_level_metadata',
        message: `${level.key || 'Level'} requires a stable key and localized names.`,
      });
    const keys = new Set<string>();
    level.work.forEach((item) => {
      validateReference(item.exerciseKey, item.measurementType, level.key);
      if (keys.has(item.exerciseKey))
        blockingErrors.push({
          levelKey: level.key,
          exerciseKey: item.exerciseKey,
          code: 'duplicate_reference',
          message: `${item.exerciseKey} is duplicated in level ${level.key}.`,
        });
      keys.add(item.exerciseKey);
      if (item.sets < 1 || item.target <= 0 || (item.restSeconds ?? 90) < 0)
        blockingErrors.push({
          levelKey: level.key,
          exerciseKey: item.exerciseKey,
          code: 'invalid_target',
          message: `${item.exerciseKey} has an invalid prescription.`,
        });
    });
    validateReference(level.assessment.exerciseKey, level.assessment.measurementType, level.key);
    if (
      level.performance.exerciseKey !== level.work[0]?.exerciseKey ||
      level.performance.metric !== level.work[0]?.measurementType
    )
      blockingErrors.push({
        levelKey: level.key,
        code: 'primary_performance_mismatch',
        message: `${level.key} primary performance must match its first work exercise.`,
      });
  });
  for (const replacement of definition.metadata?.replacements ?? []) {
    validateReference(replacement.exerciseKey);
    validateReference(replacement.replacementExerciseKey);
    if (replacement.exerciseKey === replacement.replacementExerciseKey)
      blockingErrors.push({
        exerciseKey: replacement.exerciseKey,
        code: 'circular_replacement',
        message: 'An exercise cannot replace itself.',
      });
    const source = exercises.find((exercise) => exercise.stableKey === replacement.exerciseKey);
    const candidate = exercises.find(
      (exercise) => exercise.stableKey === replacement.replacementExerciseKey,
    );
    if (
      replacement.requireSameMeasurementType &&
      source &&
      candidate &&
      source.measurementType !== candidate.measurementType
    )
      blockingErrors.push({
        exerciseKey: replacement.replacementExerciseKey,
        code: 'replacement_measurement_mismatch',
        message: 'Replacement measurement types must match.',
      });
  }
  return { valid: blockingErrors.length === 0, warnings, blockingErrors };
}

export function evaluateSkillSession(
  session: WorkoutSession,
  technique: 'good' | 'partial' | 'breakdown' | 'needs-work',
) {
  if (!session.skillLink || technique !== 'good') return false;
  return session.exercises.every((exercise) => {
    if (exercise.target?.requiredForSkillSuccess !== true) return true;
    if (exercise.skipped) return false;
    const sets = exercise.sets.filter((set) => set.completed);
    if (sets.length < exercise.target.targetSets) return false;
    return sets
      .slice(0, exercise.target.targetSets)
      .every((set) =>
        exercise.measurementType === 'duration'
          ? (set.durationSeconds ?? 0) >= exercise.target!.targetMin
          : (set.reps ?? 0) >= exercise.target!.targetMin,
      );
  });
}

export function skillSessionDetails(session: WorkoutSession) {
  return session.exercises
    .filter((exercise) => exercise.target?.requiredForSkillSuccess)
    .map((exercise) => {
      const target = exercise.target!;
      const values = exercise.sets
        .filter((set) => set.completed)
        .map((set) =>
          exercise.measurementType === 'duration' ? (set.durationSeconds ?? 0) : (set.reps ?? 0),
        );
      return {
        exerciseId: exercise.exerciseId,
        target: target.targetMin,
        targetSets: target.targetSets,
        values,
        met:
          !exercise.skipped &&
          values.length >= target.targetSets &&
          values.slice(0, target.targetSets).every((value) => value >= target.targetMin),
        exceeded: values.some((value) => value > target.targetMax),
      };
    });
}
