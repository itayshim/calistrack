import type { Exercise, MeasurementType, WorkoutExercise, WorkoutSession, WorkoutTemplate } from '../../types';
import { createId } from '../../utils/id';

export const FRONT_LEVER_SKILL_KEY = 'front-lever' as const;
export const FRONT_LEVER_TEMPLATE_VERSION = 1;

export type FrontLeverRole = NonNullable<WorkoutExercise['skillRole']>;
export interface FrontLeverPrescription {
  exerciseKey: string;
  sets: number;
  target: number;
  measurementType: MeasurementType;
  role: FrontLeverRole;
  warmup?: boolean;
}
export interface FrontLeverLevel {
  key: string;
  number: number;
  nameEn: string;
  nameHe: string;
  assessmentSeconds: number;
  work: FrontLeverPrescription[];
}

const hold = (exerciseKey: string, sets: number, target: number, role: FrontLeverRole = 'primary-skill'): FrontLeverPrescription =>
  ({ exerciseKey, sets, target, measurementType: 'duration', role });
const reps = (exerciseKey: string, sets: number, target: number, role: FrontLeverRole): FrontLeverPrescription =>
  ({ exerciseKey, sets, target, measurementType: 'reps', role });

export const frontLeverLevels: FrontLeverLevel[] = [
  { key: 'tuck', number: 1, nameEn: 'Tuck Front Lever', nameHe: 'פרונט לבר טאק', assessmentSeconds: 20, work: [hold('tuck-front-lever', 3, 6), reps('tuck-front-lever-raise', 3, 5, 'secondary-skill'), reps('pull-up', 3, 6, 'pulling-strength'), reps('hanging-leg-raise', 3, 10, 'core-strength')] },
  { key: 'advanced-tuck', number: 2, nameEn: 'Advanced Tuck', nameHe: 'טאק מתקדם', assessmentSeconds: 20, work: [hold('advanced-tuck-front-lever', 3, 8), hold('tuck-front-lever', 3, 20, 'secondary-skill'), reps('tuck-front-lever-raise', 3, 6, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'one-leg', number: 3, nameEn: 'One-Leg Front Lever', nameHe: 'פרונט לבר רגל אחת', assessmentSeconds: 15, work: [hold('one-leg-front-lever', 3, 8), hold('advanced-tuck-front-lever', 3, 10, 'secondary-skill'), reps('advanced-tuck-front-lever-raise', 3, 3, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'half', number: 4, nameEn: 'Half Front Lever', nameHe: 'חצי פרונט לבר', assessmentSeconds: 15, work: [hold('half-front-lever', 3, 8), hold('advanced-tuck-front-lever', 3, 15, 'secondary-skill'), reps('ice-cream-maker', 3, 5, 'pulling-strength'), reps('toes-to-bar', 3, 10, 'core-strength')] },
  { key: 'straddle', number: 5, nameEn: 'Straddle Front Lever', nameHe: 'פרונט לבר סטראדל', assessmentSeconds: 15, work: [hold('straddle-front-lever', 3, 5), hold('one-leg-front-lever', 3, 15, 'secondary-skill'), reps('ice-cream-maker', 3, 8, 'pulling-strength'), reps('dragon-flag', 1, 6, 'core-strength')] },
  { key: 'full', number: 6, nameEn: 'Full Front Lever', nameHe: 'פרונט לבר מלא', assessmentSeconds: 12, work: [hold('front-lever', 3, 3), hold('straddle-front-lever', 3, 10, 'secondary-skill'), reps('ice-cream-maker', 3, 5, 'pulling-strength'), reps('dragon-flag', 1, 8, 'core-strength')] },
];

export const frontLeverWarmup: FrontLeverPrescription[] = [
  reps('light-jumping-jacks', 1, 20, 'warm-up'),
  hold('wrist-warm-up', 1, 20, 'warm-up'),
  reps('shoulder-circles', 1, 10, 'warm-up'),
  reps('scapular-circles', 1, 10, 'warm-up'),
  reps('arm-swings', 1, 10, 'warm-up'),
  hold('dead-hang', 1, 15, 'warm-up'),
];

const resolveExercise = (exercises: Exercise[], stableKey: string) => {
  const exercise = exercises.find((item) => item.stableKey === stableKey);
  if (!exercise) throw new Error(`Missing skill exercise: ${stableKey}`);
  return exercise;
};

const toWorkoutExercise = (item: FrontLeverPrescription, order: number, exercises: Exercise[]): WorkoutExercise => {
  const exercise = resolveExercise(exercises, item.exerciseKey);
  return {
    id: createId(), exerciseId: exercise.id, order, targetSets: item.sets,
    targetMin: item.target, targetMax: item.target, restSeconds: item.warmup ? 30 : 90,
    measurementType: item.measurementType, skillRole: item.role,
    skillSection: item.warmup ? 'warm-up' : 'work', requiredForSkillSuccess: !item.warmup,
  };
};

export function createFrontLeverWorkout(levelKey: string, exercises: Exercise[], includeWarmup: boolean, programId = 'skill-training'): WorkoutTemplate {
  const level = frontLeverLevels.find((item) => item.key === levelKey) ?? frontLeverLevels[0];
  const now = new Date().toISOString();
  const prescriptions = [...(includeWarmup ? frontLeverWarmup.map((x) => ({ ...x, warmup: true })) : []), ...level.work];
  return {
    id: createId(), programId, name: `Front Lever · ${level.nameEn}`, scheduledDays: [],
    exercises: prescriptions.map((item, index) => toWorkoutExercise(item, index, exercises)),
    createdAt: now, updatedAt: now,
    skillLink: { skillKey: FRONT_LEVER_SKILL_KEY, levelKey, templateVersion: FRONT_LEVER_TEMPLATE_VERSION, kind: 'workout', linkState: 'linked' },
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
    return sets.slice(0, exercise.target.targetSets).every((set) =>
      exercise.measurementType === 'duration'
        ? (set.durationSeconds ?? 0) >= exercise.target!.targetMin
        : (set.reps ?? 0) >= exercise.target!.targetMin,
    );
  });
}

export function skillSessionDetails(session: WorkoutSession) {
  return session.exercises.filter((exercise) => exercise.target?.requiredForSkillSuccess).map((exercise) => {
    const target = exercise.target!;
    const values = exercise.sets.filter((set) => set.completed).map((set) => exercise.measurementType === 'duration' ? set.durationSeconds ?? 0 : set.reps ?? 0);
    return {
      exerciseId: exercise.exerciseId,
      target: target.targetMin,
      targetSets: target.targetSets,
      values,
      met: !exercise.skipped && values.length >= target.targetSets && values.slice(0, target.targetSets).every((value) => value >= target.targetMin),
      exceeded: values.some((value) => value > target.targetMax),
    };
  });
}

export function nextFrontLeverLevel(levelKey: string) {
  const index = frontLeverLevels.findIndex((item) => item.key === levelKey);
  return index >= 0 ? frontLeverLevels[index + 1] : undefined;
}
