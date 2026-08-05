import type { Exercise, MeasurementType, WorkoutTemplate } from '../../types';

export type ManagedProgramLifecycle = 'draft' | 'published' | 'unpublished' | 'archived';
export type ManagedProgramSectionKind =
  | 'warm_up'
  | 'main_work'
  | 'accessory'
  | 'skill_practice'
  | 'conditioning'
  | 'cool_down'
  | 'custom';
export type ManagedProgramAdvancement = 'manual' | 'required_complete' | 'calendar' | 'hybrid';
export type ManagedProgressionMetric = 'reps' | 'duration' | 'weighted_reps';
export type ManagedProgressionDecision = 'ready' | 'maintain' | 'regress';
export interface ManagedProgressionRule {
  key: string;
  metric: ManagedProgressionMetric;
  strategy: 'range' | 'variation' | 'load' | 'consolidation';
  minimumAcrossAllSets: number;
  maximumAcrossAllSets: number;
  consecutiveSuccesses: number;
  requireCompletedSets: boolean;
  requireTechniqueQuality: boolean;
  targetRirMin?: number;
  targetRirMax?: number;
  loadIncrementKgMin?: number;
  loadIncrementKgMax?: number;
  nextExerciseKey?: string;
  regressionExerciseKey?: string;
  failedExposureThreshold?: number;
  guidanceEn: string;
  guidanceHe: string;
}
export interface ManagedProgramMilestone {
  key: string;
  nameEn: string;
  nameHe: string;
  descriptionEn: string;
  descriptionHe: string;
  phaseKey: string;
  exerciseKeys: string[];
  metric: ManagedProgressionMetric;
  threshold: number;
  setsRequired?: number;
  userExplanationEn: string;
  userExplanationHe: string;
}
export interface ManagedProgramPrescription {
  key: string;
  exerciseKey: string;
  order: number;
  required: boolean;
  sets: number;
  targetMin: number;
  targetMax: number;
  restSeconds: number;
  addedWeightKg?: number;
  progression?:
    'fixed' | 'week-specific' | 'range-based' | 'percentage-increase' | 'manual' | 'deload';
  progressionRule?: ManagedProgressionRule;
  role?: 'skill' | 'primary_strength' | 'secondary_strength' | 'accessory' | 'core' | 'recovery';
  rirMin?: number;
  rirMax?: number;
  techniqueCueHe?: string;
  completionNoteEn?: string;
  completionNoteHe?: string;
  regressionNoteEn?: string;
  regressionNoteHe?: string;
  skillTransferEn?: string;
  skillTransferHe?: string;
  milestoneKeys?: string[];
  estimatedMinutes?: number;
  rpe?: string;
  tempo?: string;
  notes?: string;
  notesHe?: string;
  techniqueCue?: string;
  equipmentNote?: string;
  replacementKeys?: string[];
  replacementCountsForCompletion?: boolean;
  perSide?: boolean;
  perSideGuidanceEn?: string;
  perSideGuidanceHe?: string;
}
export interface ManagedProgramSection {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  kind: ManagedProgramSectionKind;
  contributesToHistory: boolean;
  requiredForSuccess: boolean;
  guidanceEn?: string;
  guidanceHe?: string;
  exercises: ManagedProgramPrescription[];
}
export interface ManagedProgramWorkoutDay {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  suggestedWeekday?: number;
  minimumRestHours?: number;
  flexible: boolean;
  repeatable: boolean;
  required?: boolean;
  goalEn?: string;
  goalHe?: string;
  skillFocusEn?: string;
  skillFocusHe?: string;
  strengthFocusEn?: string;
  strengthFocusHe?: string;
  recoveryEn?: string;
  recoveryHe?: string;
  estimatedMinutes?: number;
  equipment?: string[];
  sections: ManagedProgramSection[];
}
export interface ManagedProgramWeek {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  phaseKey?: string;
  advancementPolicy: ManagedProgramAdvancement;
  goalEn?: string;
  goalHe?: string;
  rationaleEn?: string;
  rationaleHe?: string;
  workouts: ManagedProgramWorkoutDay[];
}
export interface ManagedProgramPhase {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  descriptionEn?: string;
  descriptionHe?: string;
}
export interface ManagedProgramDefinition {
  schemaVersion: 1;
  key: string;
  version: number;
  nameEn: string;
  nameHe: string;
  shortDescriptionEn: string;
  shortDescriptionHe: string;
  descriptionEn: string;
  descriptionHe: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  goals: Array<'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'skill' | 'mixed'>;
  durationWeeks: number;
  sessionsPerWeek: number;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  equipment: string[];
  tags: string[];
  targetAudienceEn: string;
  targetAudienceHe: string;
  prerequisitesEn?: string;
  prerequisitesHe?: string;
  coverMedia?: string;
  icon?: string;
  featured: boolean;
  sortOrder: number;
  phases: ManagedProgramPhase[];
  weeks: ManagedProgramWeek[];
  progressionPhilosophyEn?: string;
  progressionPhilosophyHe?: string;
  recoveryGuidanceEn?: string;
  recoveryGuidanceHe?: string;
  milestones?: ManagedProgramMilestone[];
}
export interface ManagedProgramIssue {
  severity: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}
export interface ManagedProgramValidation {
  valid: boolean;
  blockingErrors: ManagedProgramIssue[];
  warnings: ManagedProgramIssue[];
}

const stable = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateManagedProgram(
  definition: ManagedProgramDefinition,
  exercises: Exercise[],
): ManagedProgramValidation {
  const issues: ManagedProgramIssue[] = [];
  const add = (
    severity: ManagedProgramIssue['severity'],
    code: string,
    path: string,
    message: string,
  ) => issues.push({ severity, code, path, message });
  if (!stable.test(definition.key))
    add('error', 'invalid_program_key', 'program.key', 'Program key must be lowercase kebab-case.');
  if (
    ![
      definition.nameEn,
      definition.nameHe,
      definition.shortDescriptionEn,
      definition.shortDescriptionHe,
    ].every((x) => x.trim())
  )
    add(
      'error',
      'invalid_localization',
      'program.localization',
      'English and Hebrew names and short descriptions are required.',
    );
  if (!definition.weeks.length)
    add('error', 'no_weeks', 'program.weeks', 'At least one week is required.');
  if (definition.durationWeeks !== definition.weeks.length)
    add(
      'error',
      'duration_mismatch',
      'program.durationWeeks',
      'Duration metadata differs from the authored week count.',
    );
  const seen: Record<string, Set<string>> = {
    phase: new Set(),
    week: new Set(),
    workout: new Set(),
    section: new Set(),
    exercise: new Set(),
    milestone: new Set(),
  };
  const unique = (kind: keyof typeof seen, key: string, path: string, scope = '') => {
    const identity = `${scope}:${key}`;
    if (!stable.test(key)) add('error', 'invalid_key', path, 'Key must be lowercase kebab-case.');
    if (seen[kind].has(identity))
      add('error', 'duplicate_key', path, `Duplicate ${kind} key: ${key}.`);
    seen[kind].add(identity);
  };
  definition.phases.forEach((phase, pi) => unique('phase', phase.key, `phases.${pi}.key`));
  definition.milestones?.forEach((milestone, mi) => {
    unique('milestone', milestone.key, `milestones.${mi}.key`);
    if (!definition.phases.some((phase) => phase.key === milestone.phaseKey))
      add('error', 'invalid_milestone_phase', `milestones.${mi}`, 'Milestone phase is unavailable.');
    if (![milestone.nameEn, milestone.nameHe, milestone.descriptionEn, milestone.descriptionHe].every((x) => x.trim()))
      add('error', 'invalid_milestone_localization', `milestones.${mi}`, 'Milestone localization is incomplete.');
    milestone.exerciseKeys.forEach((key) => {
      if (!exercises.some((exercise) => exercise.stableKey === key))
        add('error', 'invalid_milestone_exercise', `milestones.${mi}`, `Milestone exercise ${key} is unavailable.`);
    });
    if (!(milestone.threshold > 0)) add('error', 'invalid_milestone_target', `milestones.${mi}`, 'Milestone threshold must be positive.');
  });
  definition.weeks.forEach((week, wi) => {
    unique('week', week.key, `weeks.${wi}.key`);
    if (!week.workouts.length) add('warning', 'empty_week', `weeks.${wi}`, 'Week has no workouts.');
    week.workouts.forEach((workout, di) => {
      unique('workout', workout.key, `weeks.${wi}.workouts.${di}.key`, week.key);
      const required = workout.sections
        .flatMap((section) => section.exercises)
        .filter((item) => item.required);
      if (workout.required !== false && !required.length)
        add(
          'error',
          'empty_required_workout',
          `weeks.${wi}.workouts.${di}`,
          'Workout needs a required prescription.',
        );
      workout.sections.forEach((section, si) => {
        unique(
          'section',
          section.key,
          `weeks.${wi}.workouts.${di}.sections.${si}.key`,
          `${week.key}:${workout.key}`,
        );
        if (!section.exercises.length)
          add(
            'warning',
            'empty_section',
            `weeks.${wi}.workouts.${di}.sections.${si}`,
            'Section has no exercises.',
          );
        const exerciseKeys = new Set<string>();
        section.exercises.forEach((item, ei) => {
          const path = `weeks.${wi}.workouts.${di}.sections.${si}.exercises.${ei}`;
          unique('exercise', item.key, `${path}.key`, `${week.key}:${workout.key}:${section.key}`);
          const exercise = exercises.find((candidate) => candidate.stableKey === item.exerciseKey);
          if (!exercise)
            add(
              'error',
              'missing_exercise',
              path,
              `Canonical exercise ${item.exerciseKey} is unavailable.`,
            );
          if (item.sets < 1 || !Number.isInteger(item.sets))
            add('error', 'invalid_sets', path, 'Sets must be a positive integer.');
          if (item.targetMin < 0 || item.targetMax < item.targetMin)
            add('error', 'invalid_target', path, 'Target range is invalid.');
          if (item.restSeconds < 0) add('error', 'invalid_rest', path, 'Rest cannot be negative.');
          if (item.rirMin !== undefined && (item.rirMin < 0 || item.rirMin > 10))
            add('error', 'invalid_rir', path, 'RIR must be between 0 and 10.');
          if (item.rirMax !== undefined && (item.rirMax < (item.rirMin ?? 0) || item.rirMax > 10))
            add('error', 'invalid_rir', path, 'RIR range is invalid.');
          if (item.progressionRule) {
            const rule = item.progressionRule;
            if (!stable.test(rule.key)) add('error', 'invalid_progression_key', path, 'Progression key must be kebab-case.');
            if (rule.maximumAcrossAllSets < rule.minimumAcrossAllSets || rule.consecutiveSuccesses < 1)
              add('error', 'invalid_progression_target', path, 'Progression thresholds are invalid.');
            if (exercise && rule.metric !== exercise.measurementType)
              add('error', 'progression_measurement_mismatch', path, 'Progression metric does not match the exercise.');
            if (rule.nextExerciseKey && rule.nextExerciseKey === rule.regressionExerciseKey)
              add('error', 'circular_progression', path, 'Progression and regression cannot resolve to the same exercise.');
            [rule.nextExerciseKey, rule.regressionExerciseKey].filter(Boolean).forEach((key) => {
              const candidate = exercises.find((entry) => entry.stableKey === key);
              if (!candidate) add('error', 'missing_progression_exercise', path, `Progression exercise ${key} is unavailable.`);
              else if (exercise && candidate.measurementType !== exercise.measurementType && !(exercise.measurementType === 'reps' && candidate.measurementType === 'weighted_reps'))
                add('error', 'progression_measurement_mismatch', path, `Progression exercise ${key} is incompatible.`);
            });
          }
          item.replacementKeys?.forEach((replacementKey) => {
            const replacement = exercises.find((candidate) => candidate.stableKey === replacementKey);
            if (!replacement)
              add('error', 'missing_replacement', path, `Replacement ${replacementKey} is unavailable.`);
            else if (exercise && replacement.measurementType !== exercise.measurementType)
              add('error', 'replacement_measurement_mismatch', path, `Replacement ${replacementKey} has an incompatible measurement type.`);
          });
          if (exerciseKeys.has(item.exerciseKey))
            add('warning', 'duplicate_exercise', path, 'Exercise is repeated in this section.');
          exerciseKeys.add(item.exerciseKey);
          if (!exercise?.media?.some((media) => media.isPublished))
            add('warning', 'missing_media', path, 'Exercise has no published media.');
        });
      });
    });
  });
  return {
    valid: !issues.some((x) => x.severity === 'error'),
    blockingErrors: issues.filter((x) => x.severity === 'error'),
    warnings: issues.filter((x) => x.severity === 'warning'),
  };
}

export function compileManagedWorkout(
  definition: ManagedProgramDefinition,
  weekKey: string,
  workoutKey: string,
  exercises: Exercise[],
  enrollmentId?: string,
  language: 'en' | 'he' = 'en',
): WorkoutTemplate {
  const week = definition.weeks.find((x) => x.key === weekKey);
  const day = week?.workouts.find((x) => x.key === workoutKey);
  if (!week || !day) throw new Error('managed_program_workout_not_found');
  const lightweightItems = (kind: 'warm_up' | 'cool_down') => day.sections
    .filter((section) => section.kind === kind)
    .flatMap((section) => section.exercises.map((prescription) => ({ section, prescription })));
  const warmupItems = lightweightItems('warm_up');
  const cooldownItems = lightweightItems('cool_down');
  const items = day.sections
    .filter((section) => section.kind !== 'warm_up' && section.kind !== 'cool_down')
    .flatMap((section) => section.exercises.map((prescription) => ({ section, prescription })));
  return {
    id: `managed-${definition.key}-v${definition.version}-${week.key}-${day.key}`,
    programId: `managed:${definition.key}:${enrollmentId ?? definition.version}`,
    name: language === 'he' ? day.nameHe : day.nameEn,
    scheduledDays: day.suggestedWeekday === undefined ? [] : [day.suggestedWeekday],
    exercises: items.map(({ section, prescription }, index) => {
      const exercise = exercises.find(
        (candidate) => candidate.stableKey === prescription.exerciseKey,
      );
      if (!exercise) throw new Error(`missing_exercise:${prescription.exerciseKey}`);
      return {
        id: `${day.key}-${section.key}-${prescription.key}`,
        exerciseId: exercise.id,
        order: index,
        targetSets: prescription.sets,
        targetMin: prescription.targetMin,
        targetMax: prescription.targetMax,
        targetAddedWeightKg: prescription.addedWeightKg,
        restSeconds: prescription.restSeconds,
        measurementType: exercise.measurementType as MeasurementType,
        notes: [
          prescription.notes,
          language === 'he' ? prescription.techniqueCueHe : prescription.techniqueCue,
          prescription.rirMin !== undefined
            ? `RIR ${prescription.rirMin}${prescription.rirMax !== undefined && prescription.rirMax !== prescription.rirMin ? `â€“${prescription.rirMax}` : ''}`
            : prescription.rpe,
        ].filter(Boolean).join(' Â· ') || undefined,
        managedSectionKey: section.key,
        managedSectionKind: section.kind,
        managedRequiredForSuccess: section.requiredForSuccess && prescription.required,
        allowedReplacementExerciseIds: prescription.replacementKeys?.map((stableKey) => {
          const replacement = exercises.find((candidate) => candidate.stableKey === stableKey);
          if (!replacement) throw new Error(`missing_exercise:${stableKey}`);
          return replacement.id;
        }),
        replacementCountsForCompletion: prescription.replacementCountsForCompletion,
      };
    }),
    skillWarmup: warmupItems.map(({ prescription }) => {
      const exercise = exercises.find(
        (candidate) => candidate.stableKey === prescription.exerciseKey,
      );
      if (!exercise) throw new Error(`missing_exercise:${prescription.exerciseKey}`);
      const target =
        prescription.targetMin === prescription.targetMax
          ? `${prescription.targetMin}`
          : `${prescription.targetMin}–${prescription.targetMax}`;
      const unit = exercise.measurementType === 'duration' ? 'seconds' : 'reps';
      return {
        exerciseId: exercise.id,
        stableKey: prescription.exerciseKey,
        guidanceEn: prescription.notes || `${target} ${unit}`,
        guidanceHe:
          prescription.notesHe ||
          `${target} ${exercise.measurementType === 'duration' ? 'שניות' : 'חזרות'}`,
        durationSeconds:
          exercise.measurementType === 'duration' ? prescription.targetMax : undefined,
      };
    }),
    skillCooldown: cooldownItems.map(({ prescription }) => {
      const exercise = exercises.find((candidate) => candidate.stableKey === prescription.exerciseKey);
      if (!exercise) throw new Error(`missing_exercise:${prescription.exerciseKey}`);
      const target = prescription.targetMin === prescription.targetMax ? `${prescription.targetMin}` : `${prescription.targetMin}–${prescription.targetMax}`;
      return {
        exerciseId: exercise.id,
        stableKey: prescription.exerciseKey,
        guidanceEn: prescription.notes || `${target} ${exercise.measurementType === 'duration' ? 'seconds' : 'reps'}`,
        guidanceHe: prescription.notesHe || `${target} ${exercise.measurementType === 'duration' ? 'שניות' : 'חזרות'}`,
        durationSeconds: exercise.measurementType === 'duration' ? prescription.targetMax : undefined,
      };
    }),
    managedProgramLink: {
      programKey: definition.key,
      version: definition.version,
      phaseKey: week.phaseKey,
      weekKey: week.key,
      workoutKey: day.key,
      enrollmentId,
      source: 'managed_program',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const MANAGED_PROGRAM_SCHEMA_VERSION = 1;
export const exportManagedProgram = (definition: ManagedProgramDefinition) =>
  JSON.stringify({ schemaVersion: MANAGED_PROGRAM_SCHEMA_VERSION, definition }, null, 2);
export function importManagedProgram(value: string): ManagedProgramDefinition {
  if (value.length > 1_000_000) throw new Error('managed_program_import_too_large');
  const parsed = JSON.parse(value) as {
    schemaVersion?: number;
    definition?: ManagedProgramDefinition;
  };
  if (parsed.schemaVersion !== 1 || !parsed.definition || typeof parsed.definition.key !== 'string')
    throw new Error('invalid_managed_program_import');
  return structuredClone(parsed.definition);
}
