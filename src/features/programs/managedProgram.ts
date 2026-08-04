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
  rpe?: string;
  tempo?: string;
  notes?: string;
  techniqueCue?: string;
  equipmentNote?: string;
  replacementKeys?: string[];
  replacementCountsForCompletion?: boolean;
}
export interface ManagedProgramSection {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  kind: ManagedProgramSectionKind;
  contributesToHistory: boolean;
  requiredForSuccess: boolean;
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
  sections: ManagedProgramSection[];
}
export interface ManagedProgramWeek {
  key: string;
  nameEn: string;
  nameHe: string;
  order: number;
  phaseKey?: string;
  advancementPolicy: ManagedProgramAdvancement;
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
      'warning',
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
  };
  const unique = (kind: keyof typeof seen, key: string, path: string, scope = '') => {
    const identity = `${scope}:${key}`;
    if (!stable.test(key)) add('error', 'invalid_key', path, 'Key must be lowercase kebab-case.');
    if (seen[kind].has(identity))
      add('error', 'duplicate_key', path, `Duplicate ${kind} key: ${key}.`);
    seen[kind].add(identity);
  };
  definition.phases.forEach((phase, pi) => unique('phase', phase.key, `phases.${pi}.key`));
  definition.weeks.forEach((week, wi) => {
    unique('week', week.key, `weeks.${wi}.key`);
    if (!week.workouts.length) add('warning', 'empty_week', `weeks.${wi}`, 'Week has no workouts.');
    week.workouts.forEach((workout, di) => {
      unique('workout', workout.key, `weeks.${wi}.workouts.${di}.key`, week.key);
      const required = workout.sections
        .flatMap((section) => section.exercises)
        .filter((item) => item.required);
      if (!required.length)
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
  const warmupItems = day.sections
    .filter((section) => section.kind === 'warm_up')
    .flatMap((section) => section.exercises.map((prescription) => ({ section, prescription })));
  const items = day.sections
    .filter((section) => section.kind !== 'warm_up')
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
        notes: prescription.notes,
        managedSectionKey: section.key,
        managedSectionKind: section.kind,
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
          prescription.notes ||
          `${target} ${exercise.measurementType === 'duration' ? 'שניות' : 'חזרות'}`,
        durationSeconds:
          exercise.measurementType === 'duration' ? prescription.targetMax : undefined,
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
