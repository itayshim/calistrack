import type {
  ManagedProgramEnrollment,
  ManagedProgramStageAttempt,
  ManagedStageReadinessRecommendation,
  WorkoutSession,
} from '../../types';
import type { ManagedProgramDefinition, ManagedProgramWeek } from './managedProgram';

export type ManagedWorkoutProgressState = 'up_next' | 'available' | 'completed' | 'skipped' | 'locked';
export type ManagedWorkoutPerformanceState = 'met' | 'partial' | 'skipped' | 'unknown' | 'remaining';

export interface ManagedStageReadiness {
  recommendation: ManagedStageReadinessRecommendation;
  reason: 'all_met' | 'mostly_met' | 'multiple_partial' | 'mostly_skipped' | 'insufficient_data' | 'replacement_limited';
  metCount: number;
  partialCount: number;
  skippedCount: number;
  unknownCount: number;
  assessedCount: number;
}

export interface ManagedWeekProgress {
  weekKey: string;
  unlocked: boolean;
  requiredCount: number;
  completedRequiredCount: number;
  skippedRequiredCount: number;
  successfulRequiredCount: number;
  partialRequiredCount: number;
  unknownRequiredCount: number;
  remainingRequiredCount: number;
  terminal: boolean;
  attemptNumber: number;
  readiness?: ManagedStageReadiness;
  lockReason?: { policy: ManagedProgramWeek['advancementPolicy']; previousWeekKey: string; remainingRequiredCount: number };
}

export interface ManagedProgramProgress {
  enrollment: ManagedProgramEnrollment;
  currentWeekKey: string;
  currentAttempt: ManagedProgramStageAttempt;
  unlockedWeekKeys: string[];
  completedWorkoutKeys: string[];
  successfulWorkoutKeys: string[];
  skippedWorkoutKeys: string[];
  remainingWorkoutKeys: string[];
  nextWorkoutKey?: string;
  nextStageKey?: string;
  canAdvance: boolean;
  canRepeat: boolean;
  weekProgress: Record<string, ManagedWeekProgress>;
  workoutStates: Record<string, ManagedWorkoutProgressState>;
  workoutPerformance: Record<string, ManagedWorkoutPerformanceState>;
  overall: { completedRequired: number; skippedRequired: number; totalRequired: number; percent: number };
}

export const managedWorkoutKey = (weekKey: string, workoutKey: string) => `${weekKey}:${workoutKey}`;
const legacyAttemptId = (enrollmentId: string, weekKey: string) => `legacy:${enrollmentId}:${weekKey}:1`;

function ensureAttempts(definition: ManagedProgramDefinition, enrollment: ManagedProgramEnrollment) {
  const existing = structuredClone(enrollment.stageAttempts ?? []);
  const weeksWithProgress = new Set([
    enrollment.currentWeekKey,
    ...enrollment.completedWorkoutKeys.map((key) => key.split(':')[0]),
    ...enrollment.skippedWorkoutKeys.map((key) => key.split(':')[0]),
  ]);
  for (const weekKey of weeksWithProgress) {
    if (!definition.weeks.some((week) => week.key === weekKey) || existing.some((attempt) => attempt.weekKey === weekKey)) continue;
    existing.push({
      id: legacyAttemptId(enrollment.id, weekKey), weekKey, attemptNumber: 1, startedAt: enrollment.startDate,
      completedWorkoutKeys: enrollment.completedWorkoutKeys.filter((key) => key.startsWith(`${weekKey}:`)),
      successfulWorkoutKeys: (enrollment.successfulWorkoutKeys ?? []).filter((key) => key.startsWith(`${weekKey}:`)),
      skippedWorkoutKeys: enrollment.skippedWorkoutKeys.filter((key) => key.startsWith(`${weekKey}:`)),
      assessedWorkoutKeys: (enrollment.assessedWorkoutKeys ?? []).filter((key) => key.startsWith(`${weekKey}:`)),
    });
  }
  let current = existing.find((attempt) => attempt.id === enrollment.currentStageAttemptId && attempt.weekKey === enrollment.currentWeekKey)
    ?? existing.filter((attempt) => attempt.weekKey === enrollment.currentWeekKey).sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
  if (!current) {
    current = { id: legacyAttemptId(enrollment.id, enrollment.currentWeekKey), weekKey: enrollment.currentWeekKey, attemptNumber: 1, startedAt: enrollment.startDate, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], assessedWorkoutKeys: [] };
    existing.push(current);
  }
  return { attempts: existing, current };
}

function linkedSessions(definition: ManagedProgramDefinition, enrollment: ManagedProgramEnrollment, attempt: ManagedProgramStageAttempt, sessions: WorkoutSession[]) {
  const valid = new Set(definition.weeks.flatMap((week) => week.workouts.map((workout) => managedWorkoutKey(week.key, workout.key))));
  return sessions.filter((session) => {
    const link = session.managedProgramLink;
    if (session.status !== 'completed' || !link || link.preview || link.programKey !== enrollment.programKey || link.version !== enrollment.programVersion) return false;
    if (link.enrollmentId && link.enrollmentId !== enrollment.id) return false;
    if (link.stageAttemptId ? link.stageAttemptId !== attempt.id : attempt.attemptNumber !== 1) return false;
    return link.weekKey === attempt.weekKey && valid.has(managedWorkoutKey(link.weekKey, link.workoutKey));
  });
}

function readinessFor(requiredKeys: string[], completed: Set<string>, successful: Set<string>, skipped: Set<string>, assessed: Set<string>, sessions: WorkoutSession[]): ManagedStageReadiness | undefined {
  if (!requiredKeys.every((key) => completed.has(key) || skipped.has(key))) return undefined;
  const metCount = requiredKeys.filter((key) => successful.has(key)).length;
  const partialCount = requiredKeys.filter((key) => completed.has(key) && assessed.has(key) && !successful.has(key)).length;
  const skippedCount = requiredKeys.filter((key) => skipped.has(key)).length;
  const unknownCount = requiredKeys.filter((key) => completed.has(key) && !assessed.has(key)).length;
  const assessedCount = metCount + partialCount;
  const replacementLimited = sessions.some((session) => session.exercises.some((exercise) => exercise.replacedDuringWorkout && exercise.target?.replacementCountsForCompletion === false));
  if (replacementLimited) return { recommendation: 'review', reason: 'replacement_limited', metCount, partialCount, skippedCount, unknownCount, assessedCount };
  if (unknownCount > 0) return { recommendation: 'unknown', reason: 'insufficient_data', metCount, partialCount, skippedCount, unknownCount, assessedCount };
  if (skippedCount >= Math.ceil(requiredKeys.length / 2) || assessedCount === 0) return { recommendation: 'review', reason: 'mostly_skipped', metCount, partialCount, skippedCount, unknownCount, assessedCount };
  if (partialCount >= 2 && partialCount >= metCount) return { recommendation: 'repeat', reason: 'multiple_partial', metCount, partialCount, skippedCount, unknownCount, assessedCount };
  return { recommendation: 'advance', reason: partialCount === 0 ? 'all_met' : 'mostly_met', metCount, partialCount, skippedCount, unknownCount, assessedCount };
}

export function getManagedProgramProgress(definition: ManagedProgramDefinition, enrollment: ManagedProgramEnrollment, sessions: WorkoutSession[]): ManagedProgramProgress {
  const { attempts, current } = ensureAttempts(definition, enrollment);
  const currentWeekIndex = Math.max(0, definition.weeks.findIndex((week) => week.key === enrollment.currentWeekKey));
  const currentWeek = definition.weeks[currentWeekIndex] ?? definition.weeks[0];
  const currentSessionRows = linkedSessions(definition, enrollment, current, sessions);
  const currentSessionKeys = currentSessionRows.map((session) => managedWorkoutKey(session.managedProgramLink!.weekKey, session.managedProgramLink!.workoutKey));
  const completed = new Set([...current.completedWorkoutKeys, ...currentSessionKeys]);
  const successful = new Set(current.successfulWorkoutKeys.filter((key) => completed.has(key)));
  const assessed = new Set((current.assessedWorkoutKeys ?? []).filter((key) => completed.has(key)));
  const skipped = new Set(current.skippedWorkoutKeys.filter((key) => !completed.has(key)));
  const requiredKeys = currentWeek.workouts.filter((workout) => workout.required !== false).map((workout) => managedWorkoutKey(currentWeek.key, workout.key));
  const readiness = readinessFor(requiredKeys, completed, successful, skipped, assessed, currentSessionRows);
  const terminal = Boolean(readiness);
  const normalizedCurrent = { ...current, completedWorkoutKeys: [...completed], successfulWorkoutKeys: [...successful], skippedWorkoutKeys: [...skipped], assessedWorkoutKeys: [...assessed], recommendation: readiness?.recommendation };
  const normalizedAttempts = attempts.map((attempt) => attempt.id === current.id ? normalizedCurrent : attempt);
  const weekProgress: Record<string, ManagedWeekProgress> = {};
  const workoutStates: Record<string, ManagedWorkoutProgressState> = {};
  const workoutPerformance: Record<string, ManagedWorkoutPerformanceState> = {};
  const remainingWorkoutKeys: string[] = [];
  let nextWorkoutKey: string | undefined;
  definition.weeks.forEach((week, index) => {
    const unlocked = index <= currentWeekIndex;
    const isCurrent = week.key === currentWeek.key;
    const attempt = isCurrent ? normalizedCurrent : normalizedAttempts.filter((candidate) => candidate.weekKey === week.key).sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
    const weekCompleted = new Set(attempt?.completedWorkoutKeys ?? []);
    const weekSuccess = new Set(attempt?.successfulWorkoutKeys ?? []);
    const weekSkipped = new Set(attempt?.skippedWorkoutKeys ?? []);
    const weekAssessed = new Set(attempt?.assessedWorkoutKeys ?? []);
    const keys = week.workouts.filter((workout) => workout.required !== false).map((workout) => managedWorkoutKey(week.key, workout.key));
    const remaining = keys.filter((key) => !weekCompleted.has(key) && !weekSkipped.has(key));
    const weekReadiness = isCurrent ? readiness : readinessFor(keys, weekCompleted, weekSuccess, weekSkipped, weekAssessed, []);
    weekProgress[week.key] = {
      weekKey: week.key, unlocked, requiredCount: keys.length,
      completedRequiredCount: keys.filter((key) => weekCompleted.has(key)).length,
      skippedRequiredCount: keys.filter((key) => weekSkipped.has(key)).length,
      successfulRequiredCount: keys.filter((key) => weekSuccess.has(key)).length,
      partialRequiredCount: keys.filter((key) => weekCompleted.has(key) && weekAssessed.has(key) && !weekSuccess.has(key)).length,
      unknownRequiredCount: keys.filter((key) => weekCompleted.has(key) && !weekAssessed.has(key)).length,
      remainingRequiredCount: remaining.length, terminal: Boolean(weekReadiness), attemptNumber: attempt?.attemptNumber ?? 1, readiness: weekReadiness,
      ...(!unlocked && index > 0 ? { lockReason: { policy: definition.weeks[index - 1].advancementPolicy, previousWeekKey: definition.weeks[index - 1].key, remainingRequiredCount: weekProgress[definition.weeks[index - 1].key]?.remainingRequiredCount ?? 0 } } : {}),
    };
    week.workouts.forEach((workout) => {
      const key = managedWorkoutKey(week.key, workout.key);
      const performance: ManagedWorkoutPerformanceState = weekSkipped.has(key) ? 'skipped' : weekSuccess.has(key) ? 'met' : weekCompleted.has(key) ? weekAssessed.has(key) ? 'partial' : 'unknown' : 'remaining';
      workoutPerformance[key] = performance;
      if (performance === 'remaining') remainingWorkoutKeys.push(key);
      if (weekCompleted.has(key)) workoutStates[key] = 'completed';
      else if (weekSkipped.has(key)) workoutStates[key] = 'skipped';
      else if (!isCurrent) workoutStates[key] = 'locked';
      else if (!nextWorkoutKey && !terminal) { workoutStates[key] = 'up_next'; nextWorkoutKey = key; }
      else workoutStates[key] = 'available';
    });
  });
  const aggregateAttempts = normalizedAttempts.filter((attempt) => attempt.id !== current.id).concat(normalizedCurrent);
  const aggregateCompleted = new Set(aggregateAttempts.flatMap((attempt) => attempt.completedWorkoutKeys));
  const aggregateSkipped = new Set(aggregateAttempts.flatMap((attempt) => attempt.skippedWorkoutKeys).filter((key) => !aggregateCompleted.has(key)));
  const allRequired = definition.weeks.flatMap((week) => week.workouts.filter((workout) => workout.required !== false).map((workout) => managedWorkoutKey(week.key, workout.key)));
  const normalizedEnrollment: ManagedProgramEnrollment = {
    ...enrollment, currentWeekKey: currentWeek.key, currentStageAttemptId: normalizedCurrent.id, stageAttempts: normalizedAttempts,
    completedWorkoutKeys: [...aggregateCompleted], successfulWorkoutKeys: [...new Set(aggregateAttempts.flatMap((attempt) => attempt.successfulWorkoutKeys))], assessedWorkoutKeys: [...new Set(aggregateAttempts.flatMap((attempt) => attempt.assessedWorkoutKeys ?? []))], skippedWorkoutKeys: [...aggregateSkipped],
  };
  return {
    enrollment: normalizedEnrollment, currentWeekKey: currentWeek.key, currentAttempt: normalizedCurrent,
    unlockedWeekKeys: definition.weeks.slice(0, currentWeekIndex + 1).map((week) => week.key),
    completedWorkoutKeys: normalizedEnrollment.completedWorkoutKeys, successfulWorkoutKeys: normalizedEnrollment.successfulWorkoutKeys ?? [], skippedWorkoutKeys: normalizedEnrollment.skippedWorkoutKeys,
    remainingWorkoutKeys, nextWorkoutKey, nextStageKey: definition.weeks[currentWeekIndex + 1]?.key,
    canAdvance: terminal, canRepeat: terminal, weekProgress, workoutStates, workoutPerformance,
    overall: { completedRequired: allRequired.filter((key) => aggregateCompleted.has(key)).length, skippedRequired: allRequired.filter((key) => aggregateSkipped.has(key)).length, totalRequired: allRequired.length, percent: allRequired.length ? Math.round((allRequired.filter((key) => aggregateCompleted.has(key)).length / allRequired.length) * 100) : 0 },
  };
}

export function repeatManagedProgramStage(enrollment: ManagedProgramEnrollment, progress: ManagedProgramProgress, now: string, attemptId: string): ManagedProgramEnrollment {
  const weekKey = progress.currentWeekKey;
  const completedAttempt = { ...progress.currentAttempt, completedAt: progress.currentAttempt.completedAt ?? now, recommendation: progress.weekProgress[weekKey].readiness?.recommendation, decision: 'repeated' as const, decidedAt: now };
  const nextAttempt: ManagedProgramStageAttempt = { id: attemptId, weekKey, attemptNumber: completedAttempt.attemptNumber + 1, startedAt: now, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], assessedWorkoutKeys: [] };
  const withoutWeek = (keys: string[] | undefined) => (keys ?? []).filter((key) => !key.startsWith(`${weekKey}:`));
  return { ...enrollment, status: 'active', currentStageAttemptId: attemptId, stageAttempts: [...(progress.enrollment.stageAttempts ?? []).filter((attempt) => attempt.id !== completedAttempt.id), completedAttempt, nextAttempt], completedWorkoutKeys: withoutWeek(progress.enrollment.completedWorkoutKeys), successfulWorkoutKeys: withoutWeek(progress.enrollment.successfulWorkoutKeys), assessedWorkoutKeys: withoutWeek(progress.enrollment.assessedWorkoutKeys), skippedWorkoutKeys: withoutWeek(progress.enrollment.skippedWorkoutKeys) };
}

export function advanceManagedProgramStage(progress: ManagedProgramProgress, now: string, attemptId: string): ManagedProgramEnrollment {
  const currentIndex = progress.enrollment.stageAttempts?.findIndex((attempt) => attempt.id === progress.currentAttempt.id) ?? -1;
  const isFinal = !progress.nextStageKey;
  const completedAttempt = { ...progress.currentAttempt, completedAt: progress.currentAttempt.completedAt ?? now, recommendation: progress.weekProgress[progress.currentWeekKey].readiness?.recommendation, decision: isFinal ? 'program_finished' as const : 'advanced' as const, decidedAt: now };
  const attempts = [...(progress.enrollment.stageAttempts ?? [])];
  if (currentIndex >= 0) attempts[currentIndex] = completedAttempt; else attempts.push(completedAttempt);
  if (isFinal) return { ...progress.enrollment, stageAttempts: attempts, status: 'completed' };
  const nextAttempt: ManagedProgramStageAttempt = { id: attemptId, weekKey: progress.nextStageKey!, attemptNumber: 1, startedAt: now, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], assessedWorkoutKeys: [] };
  attempts.push(nextAttempt);
  return { ...progress.enrollment, currentWeekKey: progress.nextStageKey!, currentStageAttemptId: attemptId, stageAttempts: attempts, status: 'active' };
}

export function managedEnrollmentChanged(before: ManagedProgramEnrollment, after: ManagedProgramEnrollment) { return JSON.stringify(before) !== JSON.stringify(after); }
