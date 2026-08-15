import type { ManagedProgramEnrollment, WorkoutSession } from '../../types';
import type { ManagedProgramDefinition, ManagedProgramWeek } from './managedProgram';

export type ManagedWorkoutProgressState = 'up_next' | 'available' | 'completed' | 'skipped' | 'locked';

export interface ManagedWeekProgress {
  weekKey: string;
  unlocked: boolean;
  requiredCount: number;
  completedRequiredCount: number;
  skippedRequiredCount: number;
  remainingRequiredCount: number;
  terminal: boolean;
  lockReason?: {
    policy: ManagedProgramWeek['advancementPolicy'];
    previousWeekKey: string;
    remainingRequiredCount: number;
  };
}

export interface ManagedProgramProgress {
  enrollment: ManagedProgramEnrollment;
  currentWeekKey: string;
  unlockedWeekKeys: string[];
  completedWorkoutKeys: string[];
  successfulWorkoutKeys: string[];
  skippedWorkoutKeys: string[];
  remainingWorkoutKeys: string[];
  nextWorkoutKey?: string;
  weekProgress: Record<string, ManagedWeekProgress>;
  workoutStates: Record<string, ManagedWorkoutProgressState>;
  overall: { completedRequired: number; skippedRequired: number; totalRequired: number; percent: number };
}

export const managedWorkoutKey = (weekKey: string, workoutKey: string) => `${weekKey}:${workoutKey}`;

const validWorkoutKeys = (definition: ManagedProgramDefinition) => new Set(
  definition.weeks.flatMap((week) => week.workouts.map((workout) => managedWorkoutKey(week.key, workout.key))),
);

function linkedCompletionKeys(
  definition: ManagedProgramDefinition,
  enrollment: ManagedProgramEnrollment,
  sessions: WorkoutSession[],
) {
  const valid = validWorkoutKeys(definition);
  return sessions.flatMap((session) => {
    const link = session.managedProgramLink;
    if (session.status !== 'completed' || !link || link.preview) return [];
    if (link.programKey !== enrollment.programKey || link.version !== enrollment.programVersion) return [];
    if (link.enrollmentId && link.enrollmentId !== enrollment.id) return [];
    const key = managedWorkoutKey(link.weekKey, link.workoutKey);
    return valid.has(key) ? [key] : [];
  });
}

export function getManagedProgramProgress(
  definition: ManagedProgramDefinition,
  enrollment: ManagedProgramEnrollment,
  sessions: WorkoutSession[],
): ManagedProgramProgress {
  const valid = validWorkoutKeys(definition);
  const completed = new Set([
    ...enrollment.completedWorkoutKeys.filter((key) => valid.has(key)),
    ...linkedCompletionKeys(definition, enrollment, sessions),
  ]);
  const successful = new Set((enrollment.successfulWorkoutKeys ?? []).filter((key) => completed.has(key)));
  const skipped = new Set(enrollment.skippedWorkoutKeys.filter((key) => valid.has(key) && !completed.has(key)));
  const persistedWeekIndex = Math.max(0, definition.weeks.findIndex((week) => week.key === enrollment.currentWeekKey));
  const unlockedIndexes = new Set<number>(Array.from({ length: persistedWeekIndex + 1 }, (_, index) => index));
  unlockedIndexes.add(0);

  const terminalFor = (week: ManagedProgramWeek) => week.workouts
    .filter((workout) => workout.required !== false)
    .every((workout) => {
      const key = managedWorkoutKey(week.key, workout.key);
      return completed.has(key) || skipped.has(key);
    });

  for (let index = 0; index < definition.weeks.length - 1; index += 1) {
    if (!unlockedIndexes.has(index)) break;
    const week = definition.weeks[index];
    const automaticallyAdvances = week.advancementPolicy === 'required_complete';
    if (automaticallyAdvances && terminalFor(week)) unlockedIndexes.add(index + 1);
  }

  const unlockedWeekKeys = definition.weeks
    .filter((_, index) => unlockedIndexes.has(index))
    .map((week) => week.key);
  const currentWeekIndex = definition.weeks.findIndex((week, index) =>
    unlockedIndexes.has(index) && !terminalFor(week),
  );
  const resolvedCurrentIndex = currentWeekIndex >= 0
    ? Math.max(currentWeekIndex, persistedWeekIndex)
    : Math.max(...unlockedIndexes);
  const currentWeek = definition.weeks[resolvedCurrentIndex] ?? definition.weeks[0];
  const currentRequiredRemaining = currentWeek.workouts
    .filter((workout) => workout.required !== false)
    .map((workout) => managedWorkoutKey(currentWeek.key, workout.key))
    .filter((key) => !completed.has(key) && !skipped.has(key));
  const currentOptionalRemaining = currentWeek.workouts
    .filter((workout) => workout.required === false)
    .map((workout) => managedWorkoutKey(currentWeek.key, workout.key))
    .filter((key) => !completed.has(key) && !skipped.has(key));
  const nextWorkoutKey = currentRequiredRemaining[0] ?? currentOptionalRemaining[0];

  const weekProgress: Record<string, ManagedWeekProgress> = {};
  const workoutStates: Record<string, ManagedWorkoutProgressState> = {};
  const remainingWorkoutKeys: string[] = [];
  definition.weeks.forEach((week, index) => {
    const requiredKeys = week.workouts
      .filter((workout) => workout.required !== false)
      .map((workout) => managedWorkoutKey(week.key, workout.key));
    const completedRequiredCount = requiredKeys.filter((key) => completed.has(key)).length;
    const skippedRequiredCount = requiredKeys.filter((key) => skipped.has(key)).length;
    const remainingRequiredCount = requiredKeys.length - completedRequiredCount - skippedRequiredCount;
    const unlocked = unlockedIndexes.has(index);
    weekProgress[week.key] = {
      weekKey: week.key,
      unlocked,
      requiredCount: requiredKeys.length,
      completedRequiredCount,
      skippedRequiredCount,
      remainingRequiredCount,
      terminal: remainingRequiredCount === 0,
      ...(!unlocked && index > 0 ? {
        lockReason: {
          policy: definition.weeks[index - 1].advancementPolicy,
          previousWeekKey: definition.weeks[index - 1].key,
          remainingRequiredCount: weekProgress[definition.weeks[index - 1].key]?.remainingRequiredCount ?? 0,
        },
      } : {}),
    };
    week.workouts.forEach((workout) => {
      const key = managedWorkoutKey(week.key, workout.key);
      workoutStates[key] = completed.has(key)
        ? 'completed'
        : skipped.has(key)
          ? 'skipped'
          : !unlocked
            ? 'locked'
            : key === nextWorkoutKey
              ? 'up_next'
              : 'available';
      if (!completed.has(key) && !skipped.has(key)) remainingWorkoutKeys.push(key);
    });
  });

  const requiredKeys = definition.weeks.flatMap((week) => week.workouts
    .filter((workout) => workout.required !== false)
    .map((workout) => managedWorkoutKey(week.key, workout.key)));
  const completedRequired = requiredKeys.filter((key) => completed.has(key)).length;
  const skippedRequired = requiredKeys.filter((key) => skipped.has(key)).length;
  const finalRequiredTerminal = requiredKeys.every((key) => completed.has(key) || skipped.has(key));
  const normalizedEnrollment: ManagedProgramEnrollment = {
    ...enrollment,
    currentWeekKey: currentWeek.key,
    completedWorkoutKeys: [...completed],
    successfulWorkoutKeys: [...successful],
    skippedWorkoutKeys: [...skipped],
    status: finalRequiredTerminal ? 'completed' : enrollment.status === 'completed' ? 'active' : enrollment.status,
  };
  return {
    enrollment: normalizedEnrollment,
    currentWeekKey: currentWeek.key,
    unlockedWeekKeys,
    completedWorkoutKeys: [...completed],
    successfulWorkoutKeys: [...successful],
    skippedWorkoutKeys: [...skipped],
    remainingWorkoutKeys,
    nextWorkoutKey,
    weekProgress,
    workoutStates,
    overall: {
      completedRequired,
      skippedRequired,
      totalRequired: requiredKeys.length,
      percent: requiredKeys.length ? Math.round((completedRequired / requiredKeys.length) * 100) : 0,
    },
  };
}

export function managedEnrollmentChanged(
  before: ManagedProgramEnrollment,
  after: ManagedProgramEnrollment,
) {
  return JSON.stringify(before) !== JSON.stringify(after);
}
