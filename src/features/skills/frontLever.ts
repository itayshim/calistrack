import type { Exercise, MeasurementType, SkillWarmupItem, WorkoutExercise, WorkoutSession, WorkoutTemplate } from '../../types';
import { createId } from '../../utils/id';

export const FRONT_LEVER_SKILL_KEY = 'front-lever' as const;
export const FRONT_LEVER_TEMPLATE_VERSION = 2;
export type FrontLeverRole = NonNullable<WorkoutExercise['skillRole']>;

export interface FrontLeverPrescription {
  exerciseKey: string;
  sets: number;
  target: number;
  measurementType: MeasurementType;
  role: FrontLeverRole;
}
export interface FrontLeverWarmupPrescription {
  exerciseKey: string;
  guidanceEn: string;
  guidanceHe: string;
}
export interface FrontLeverLevel {
  key: string;
  number: number;
  nameEn: string;
  nameHe: string;
  assessmentSeconds: number;
  /** Canonical source for the reusable level performance summary. */
  performance?: { exerciseKey: string; metric: MeasurementType; sideMode?: 'left-right' };
  work: FrontLeverPrescription[];
}
export interface SkillValidationIssue { levelKey?: string; exerciseKey?: string; code: string; message: string }
export interface SkillValidationResult { valid: boolean; warnings: SkillValidationIssue[]; blockingErrors: SkillValidationIssue[] }

const hold = (exerciseKey: string, sets: number, target: number, role: FrontLeverRole = 'primary-skill'): FrontLeverPrescription => ({ exerciseKey, sets, target, measurementType: 'duration', role });
const reps = (exerciseKey: string, sets: number, target: number, role: FrontLeverRole): FrontLeverPrescription => ({ exerciseKey, sets, target, measurementType: 'reps', role });

export const frontLeverLevels: FrontLeverLevel[] = [
  { key: 'tuck', number: 1, nameEn: 'Tuck Front Lever', nameHe: 'פרונט לבר טאק', assessmentSeconds: 20, work: [hold('tuck-front-lever', 3, 6), reps('tuck-front-lever-raise', 3, 5, 'secondary-skill'), reps('pull-up', 3, 6, 'pulling-strength'), reps('leg-raise', 3, 10, 'core-strength')] },
  { key: 'advanced-tuck', number: 2, nameEn: 'Advanced Tuck', nameHe: 'טאק מתקדם', assessmentSeconds: 20, work: [hold('advanced-tuck-front-lever', 3, 8), hold('tuck-front-lever', 3, 20, 'secondary-skill'), reps('tuck-front-lever-raise', 3, 6, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'one-leg', number: 3, nameEn: 'One-Leg Front Lever', nameHe: 'פרונט לבר רגל אחת', assessmentSeconds: 15, work: [hold('one-leg-front-lever', 3, 8), hold('advanced-tuck-front-lever', 3, 10, 'secondary-skill'), reps('advanced-tuck-front-lever-raise', 3, 3, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'half', number: 4, nameEn: 'Half Front Lever', nameHe: 'חצי פרונט לבר', assessmentSeconds: 15, work: [hold('half-front-lever', 3, 8), hold('advanced-tuck-front-lever', 3, 15, 'secondary-skill'), reps('ice-cream-maker', 3, 5, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'straddle', number: 5, nameEn: 'Straddle Front Lever', nameHe: 'פרונט לבר סטראדל', assessmentSeconds: 15, work: [hold('straddle-front-lever', 3, 5), hold('one-leg-front-lever', 3, 15, 'secondary-skill'), reps('ice-cream-maker', 3, 8, 'pulling-strength'), reps('dragon-flag', 1, 6, 'core-strength')] },
  { key: 'full', number: 6, nameEn: 'Full Front Lever', nameHe: 'פרונט לבר מלא', assessmentSeconds: 12, work: [hold('front-lever', 3, 3), hold('straddle-front-lever', 3, 10, 'secondary-skill'), reps('ice-cream-maker', 3, 5, 'pulling-strength'), reps('dragon-flag', 1, 8, 'core-strength')] },
];

frontLeverLevels.forEach((level) => {
  level.performance = {
    exerciseKey: level.work[0].exerciseKey,
    metric: level.work[0].measurementType,
    sideMode: level.key === 'one-leg' ? 'left-right' : undefined,
  };
});

export const frontLeverWarmup: FrontLeverWarmupPrescription[] = [
  { exerciseKey: 'jumping-jacks', guidanceEn: '20 reps', guidanceHe: '20 חזרות' },
  { exerciseKey: 'wrist-rolls', guidanceEn: '10 each side', guidanceHe: '10 לכל צד' },
  { exerciseKey: 'elbow-circles', guidanceEn: '10 each direction', guidanceHe: '10 לכל כיוון' },
  { exerciseKey: 'arm-circles', guidanceEn: '10 each direction', guidanceHe: '10 לכל כיוון' },
  { exerciseKey: 'arch-active-hang', guidanceEn: '4 reps', guidanceHe: '4 חזרות' },
  { exerciseKey: 'active-bar-hang', guidanceEn: '15–20 seconds', guidanceHe: '15–20 שניות' },
];

export const resolveSkillExercise = (exercises: Exercise[], stableKey: string) => {
  const matches = exercises.filter((item) => item.stableKey === stableKey);
  if (matches.length !== 1) throw new Error(matches.length ? `Duplicate skill exercise: ${stableKey}` : `Missing skill exercise: ${stableKey}`);
  return matches[0];
};

const toWorkoutExercise = (item: FrontLeverPrescription, order: number, exercises: Exercise[]): WorkoutExercise => {
  const exercise = resolveSkillExercise(exercises, item.exerciseKey);
  return { id: createId(), exerciseId: exercise.id, order, targetSets: item.sets, targetMin: item.target, targetMax: item.target, restSeconds: 90, measurementType: item.measurementType, skillRole: item.role, skillSection: 'work', requiredForSkillSuccess: true };
};

const createWarmupItems = (exercises: Exercise[]): SkillWarmupItem[] => frontLeverWarmup.map((item) => {
  const exercise = resolveSkillExercise(exercises, item.exerciseKey);
  return { exerciseId: exercise.id, stableKey: item.exerciseKey, guidanceEn: item.guidanceEn, guidanceHe: item.guidanceHe };
});

export function createFrontLeverWorkout(levelKey: string, exercises: Exercise[], includeWarmup: boolean, programId = 'skill-training', preview = false): WorkoutTemplate {
  const level = frontLeverLevels.find((item) => item.key === levelKey) ?? frontLeverLevels[0];
  const now = new Date().toISOString();
  return {
    id: createId(), programId, name: `Front Lever · ${level.nameEn}`, scheduledDays: [],
    exercises: level.work.map((item, index) => toWorkoutExercise(item, index, exercises)),
    skillWarmup: includeWarmup ? createWarmupItems(exercises) : undefined,
    createdAt: now, updatedAt: now,
    skillLink: { skillKey: FRONT_LEVER_SKILL_KEY, levelKey, templateVersion: FRONT_LEVER_TEMPLATE_VERSION, kind: 'workout', linkState: 'linked', preview },
  };
}

export function createFrontLeverAssessment(levelKey: string, exercises: Exercise[]): WorkoutTemplate {
  const level = frontLeverLevels.find((item) => item.key === levelKey) ?? frontLeverLevels[0];
  const workout = createFrontLeverWorkout(levelKey, exercises, false);
  workout.name = `Front Lever assessment · ${level.nameEn}`;
  workout.exercises = [toWorkoutExercise(hold(level.work[0].exerciseKey, 1, level.assessmentSeconds), 0, exercises)];
  workout.skillLink = { ...workout.skillLink!, kind: 'assessment' };
  return workout;
}

export function evaluateSkillSession(session: WorkoutSession, technique: 'good' | 'needs-work') {
  if (!session.skillLink || technique !== 'good') return false;
  return session.exercises.every((exercise) => {
    if (exercise.target?.requiredForSkillSuccess !== true) return true;
    if (exercise.skipped) return false;
    const sets = exercise.sets.filter((set) => set.completed);
    if (sets.length < exercise.target.targetSets) return false;
    return sets.slice(0, exercise.target.targetSets).every((set) => exercise.measurementType === 'duration' ? (set.durationSeconds ?? 0) >= exercise.target!.targetMin : (set.reps ?? 0) >= exercise.target!.targetMin);
  });
}

export function skillSessionDetails(session: WorkoutSession) {
  return session.exercises.filter((exercise) => exercise.target?.requiredForSkillSuccess).map((exercise) => {
    const target = exercise.target!;
    const values = exercise.sets.filter((set) => set.completed).map((set) => exercise.measurementType === 'duration' ? set.durationSeconds ?? 0 : set.reps ?? 0);
    return { exerciseId: exercise.exerciseId, target: target.targetMin, targetSets: target.targetSets, values, met: !exercise.skipped && values.length >= target.targetSets && values.slice(0, target.targetSets).every((value) => value >= target.targetMin), exceeded: values.some((value) => value > target.targetMax) };
  });
}

export function nextFrontLeverLevel(levelKey: string) {
  const index = frontLeverLevels.findIndex((item) => item.key === levelKey);
  return index >= 0 ? frontLeverLevels[index + 1] : undefined;
}

export function validateFrontLeverContent(exercises: Exercise[], onlyLevelKey?: string): SkillValidationResult {
  const blockingErrors: SkillValidationIssue[] = [];
  const warnings: SkillValidationIssue[] = [];
  const levels = onlyLevelKey ? frontLeverLevels.filter((level) => level.key === onlyLevelKey) : frontLeverLevels;
  if (!onlyLevelKey && new Set(frontLeverLevels.map((level) => level.key)).size !== frontLeverLevels.length) blockingErrors.push({ code: 'duplicate_level_key', message: 'Front Lever level keys must be unique.' });
  if (!onlyLevelKey && frontLeverLevels.some((level, index) => level.number !== index + 1)) blockingErrors.push({ code: 'invalid_level_order', message: 'Front Lever levels must have deterministic sequential order.' });
  const validateReference = (exerciseKey: string, expectedType?: MeasurementType, levelKey?: string) => {
    const matches = exercises.filter((exercise) => exercise.stableKey === exerciseKey);
    if (matches.length !== 1) { blockingErrors.push({ levelKey, exerciseKey, code: matches.length ? 'duplicate_stable_key' : 'missing_exercise', message: matches.length ? `Stable key ${exerciseKey} is duplicated.` : `Missing exact stable key ${exerciseKey}.` }); return; }
    const exercise = matches[0];
    if (expectedType && exercise.measurementType !== expectedType) blockingErrors.push({ levelKey, exerciseKey, code: 'measurement_mismatch', message: `${exerciseKey} must use ${expectedType}, found ${exercise.measurementType}.` });
    if (!exercise.nameEn.trim() || !exercise.nameHe.trim()) blockingErrors.push({ levelKey, exerciseKey, code: 'missing_translation', message: `${exerciseKey} requires English and Hebrew names.` });
  };
  const warmupKeys = new Set<string>();
  frontLeverWarmup.forEach((item) => { validateReference(item.exerciseKey); if (warmupKeys.has(item.exerciseKey)) blockingErrors.push({ exerciseKey: item.exerciseKey, code: 'duplicate_warmup_reference', message: `${item.exerciseKey} is duplicated in the warm-up.` }); warmupKeys.add(item.exerciseKey); if (!item.guidanceEn.trim() || !item.guidanceHe.trim()) blockingErrors.push({ exerciseKey: item.exerciseKey, code: 'missing_guidance', message: `${item.exerciseKey} requires localized guidance.` }); });
  levels.forEach((level) => {
    const keys = new Set<string>();
    level.work.forEach((item) => {
      validateReference(item.exerciseKey, item.measurementType, level.key);
      if (keys.has(item.exerciseKey)) blockingErrors.push({ levelKey: level.key, exerciseKey: item.exerciseKey, code: 'duplicate_reference', message: `${item.exerciseKey} is duplicated in level ${level.key}.` });
      keys.add(item.exerciseKey);
      if (item.sets < 1 || item.target <= 0) blockingErrors.push({ levelKey: level.key, exerciseKey: item.exerciseKey, code: 'invalid_target', message: `${item.exerciseKey} has an invalid prescription.` });
    });
    validateReference(level.work[0]?.exerciseKey ?? '', 'duration', level.key);
  });
  return { valid: blockingErrors.length === 0, warnings, blockingErrors };
}
