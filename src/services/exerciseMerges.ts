import type { AppData, Exercise, ExerciseMedia } from '../types';
import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';

export const EXERCISE_MERGE_CLIENT_SCHEMA_VERSION = 14;
const CACHE_KEY = 'calistrack.exercise-merge-redirects.v1';

export interface ExerciseMergeRedirect {
  id: string;
  sourceExerciseId: string;
  sourceStableKey: string;
  sourceRuntimeId: string;
  targetExerciseId: string;
  targetStableKey: string;
  targetRuntimeId: string;
  auditId: string;
  status: 'active' | 'rolled_back';
}

interface RedirectRow {
  id: string;
  source_exercise_id: string;
  source_stable_key: string;
  source_runtime_id: string;
  target_exercise_id: string;
  target_stable_key: string;
  target_runtime_id: string;
  audit_id: string;
  status: ExerciseMergeRedirect['status'];
}

export interface ExerciseMergePreview {
  safe: boolean;
  blocking: string[];
  warnings: string[];
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  sourceMedia: Array<Record<string, unknown>>;
  targetMedia: Array<Record<string, unknown>>;
  counts: Record<string, number>;
  visual: { source?: Record<string, unknown>; target?: Record<string, unknown>; policy: string };
  policies: Record<string, string>;
}

export interface ExerciseMergeCandidate {
  id: string;
  measurementType: string;
  movementFamily?: string;
  category?: string;
  difficulty?: string;
}

export function validateExerciseMergePair(source: ExerciseMergeCandidate, target: ExerciseMergeCandidate) {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (source.id === target.id) blocking.push('self_merge');
  if (source.measurementType !== target.measurementType) blocking.push('measurement_mismatch');
  if ((source.movementFamily ?? '').toLocaleLowerCase() !== (target.movementFamily ?? '').toLocaleLowerCase()) {
    blocking.push('movement_family_mismatch');
  }
  if (source.category !== target.category || source.difficulty !== target.difficulty) warnings.push('metadata_difference');
  return { safe: blocking.length === 0, blocking, warnings };
}

const redirectsByIdentity = new Map<string, ExerciseMergeRedirect>();
const listeners = new Set<() => void>();
let revision = 0;

const mapRedirect = (row: RedirectRow): ExerciseMergeRedirect => ({
  id: row.id,
  sourceExerciseId: row.source_exercise_id,
  sourceStableKey: row.source_stable_key,
  sourceRuntimeId: row.source_runtime_id,
  targetExerciseId: row.target_exercise_id,
  targetStableKey: row.target_stable_key,
  targetRuntimeId: row.target_runtime_id,
  auditId: row.audit_id,
  status: row.status,
});

export function installExerciseMergeRedirects(redirects: ExerciseMergeRedirect[]) {
  redirectsByIdentity.clear();
  redirects.filter((redirect) => redirect.status === 'active').forEach((redirect) => {
    [redirect.sourceExerciseId, redirect.sourceStableKey, redirect.sourceRuntimeId]
      .forEach((identity) => redirectsByIdentity.set(identity, redirect));
  });
  revision += 1;
  listeners.forEach((listener) => listener());
}

export const subscribeExerciseMergeRedirects = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getExerciseMergeRevision = () => revision;

export function resolveMergedExerciseIdentity(reference: string): string {
  let current = reference;
  const visited = new Set<string>();
  for (let depth = 0; depth < 32; depth += 1) {
    if (visited.has(current)) return reference;
    visited.add(current);
    const redirect = redirectsByIdentity.get(current);
    if (!redirect) return current;
    current = redirect.targetStableKey;
  }
  return reference;
}

export const areCanonicalExerciseIdentitiesEqual = (left: string, right: string) =>
  resolveMergedExerciseIdentity(left) === resolveMergedExerciseIdentity(right);

export function canonicalExerciseIdentity(exercise: Exercise): string {
  return resolveMergedExerciseIdentity(
    exercise.stableKey ?? exercise.canonicalExerciseId ?? exercise.id,
  );
}

export async function loadExerciseMergeRedirects(): Promise<ExerciseMergeRedirect[]> {
  if (supabaseConfigured) {
    try {
      const rows = await supabaseRequest<RedirectRow[]>(
        '/rest/v1/exercise_merge_redirects?status=eq.active&select=*',
      );
      const redirects = rows.map(mapRedirect);
      localStorage.setItem(CACHE_KEY, JSON.stringify(redirects));
      return redirects;
    } catch {
      // Offline clients keep resolving retired identities through the last trusted public map.
    }
  }
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as ExerciseMergeRedirect[];
  } catch {
    return [];
  }
}

export async function previewExerciseMerge(sourceId: string, targetId: string) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<ExerciseMergePreview>(
    '/rest/v1/rpc/exercise_merge_preview',
    { method: 'POST', body: JSON.stringify({ p_source_id: sourceId, p_target_id: targetId }) },
    session.accessToken,
  );
}

export async function executeExerciseMerge(sourceId: string, targetId: string, targetStableKey: string) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<{ auditId: string; copiedMedia: number; sourceStableKey: string; targetStableKey: string }>(
    '/rest/v1/rpc/merge_exercises',
    { method: 'POST', body: JSON.stringify({
      p_source_id: sourceId,
      p_target_id: targetId,
      p_expected_target_key: targetStableKey,
      p_client_schema_version: EXERCISE_MERGE_CLIENT_SCHEMA_VERSION,
    }) },
    session.accessToken,
  );
}

const canonical = (reference: string) => resolveMergedExerciseIdentity(reference);
const migrateMedia = (media: ExerciseMedia[] | undefined) => media?.map((item) => ({ ...item }));

export function applyExerciseMergeRedirects(data: AppData): AppData {
  const migrateWorkoutExercise = <T extends { exerciseId: string; allowedReplacementExerciseIds?: string[] }>(item: T): T => ({
    ...item,
    exerciseId: canonical(item.exerciseId),
    allowedReplacementExerciseIds: item.allowedReplacementExerciseIds?.map(canonical),
  });
  const migrateSession = (session: AppData['workoutSessions'][number]) => ({
    ...session,
    exercises: session.exercises.map((item) => ({
      ...item,
      exerciseId: canonical(item.exerciseId),
      mergedFromExerciseId: canonical(item.exerciseId) !== item.exerciseId
        ? (item.mergedFromExerciseId ?? item.exerciseId)
        : item.mergedFromExerciseId,
      replacedByExerciseId: item.replacedByExerciseId ? canonical(item.replacedByExerciseId) : undefined,
      target: item.target ? migrateWorkoutExercise(item.target) : item.target,
    })),
    skillWarmup: session.skillWarmup ? {
      ...session.skillWarmup,
      items: session.skillWarmup.items.map((item) => ({ ...item, exerciseId: canonical(item.exerciseId), stableKey: canonical(item.stableKey) })),
    } : session.skillWarmup,
    pendingCooldown: session.pendingCooldown?.map((item) => ({ ...item, exerciseId: canonical(item.exerciseId), stableKey: canonical(item.stableKey) })),
  });
  return {
    ...data,
    schemaVersion: EXERCISE_MERGE_CLIENT_SCHEMA_VERSION,
    exercises: data.exercises
      .filter((exercise) => canonicalExerciseIdentity(exercise) === (exercise.stableKey ?? exercise.canonicalExerciseId ?? exercise.id))
      .map((exercise) => ({ ...exercise, media: migrateMedia(exercise.media) })),
    programs: data.programs.map((program) => ({ ...program, workouts: program.workouts.map((workout) => ({
      ...workout,
      exercises: workout.exercises.map(migrateWorkoutExercise),
      skillWarmup: workout.skillWarmup?.map((item) => ({ ...item, exerciseId: canonical(item.exerciseId), stableKey: canonical(item.stableKey) })),
      skillCooldown: workout.skillCooldown?.map((item) => ({ ...item, exerciseId: canonical(item.exerciseId), stableKey: canonical(item.stableKey) })),
    })) })),
    workoutSessions: data.workoutSessions.map(migrateSession),
    activeWorkout: data.activeWorkout ? migrateSession(data.activeWorkout) : null,
    goals: data.goals.map((goal) => ({ ...goal, exerciseId: goal.exerciseId ? canonical(goal.exerciseId) : undefined })),
  };
}
