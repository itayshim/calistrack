import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import { buildProgressExerciseSummaries } from '../utils/progressExercises';
import { personalRecords } from '../utils/stats';
import {
  applyExerciseMergeRedirects,
  areCanonicalExerciseIdentitiesEqual,
  installExerciseMergeRedirects,
  resolveMergedExerciseIdentity,
  validateExerciseMergePair,
  type ExerciseMergeRedirect,
} from './exerciseMerges';

const redirect = (overrides: Partial<ExerciseMergeRedirect> = {}): ExerciseMergeRedirect => ({
  id: 'merge-1',
  sourceExerciseId: 'source-uuid',
  sourceStableKey: 'source-key',
  sourceRuntimeId: 'builtin-source-key',
  targetExerciseId: 'target-uuid',
  targetStableKey: 'target-key',
  targetRuntimeId: 'builtin-target-key',
  auditId: 'audit-1',
  status: 'active',
  ...overrides,
});

describe('exercise merge canonical redirects', () => {
  beforeEach(() => installExerciseMergeRedirects([]));

  it('resolves source UUID, stable key, and runtime ID to one target', () => {
    installExerciseMergeRedirects([redirect()]);
    expect(resolveMergedExerciseIdentity('source-uuid')).toBe('target-key');
    expect(resolveMergedExerciseIdentity('source-key')).toBe('target-key');
    expect(resolveMergedExerciseIdentity('builtin-source-key')).toBe('target-key');
    expect(resolveMergedExerciseIdentity('unrelated')).toBe('unrelated');
  });

  it('collapses historical chains and terminates safely on a cycle', () => {
    installExerciseMergeRedirects([
      redirect(),
      redirect({ id: 'merge-2', sourceExerciseId: 'target-uuid', sourceStableKey: 'target-key', sourceRuntimeId: 'builtin-target-key', targetExerciseId: 'final-uuid', targetStableKey: 'final-key', targetRuntimeId: 'builtin-final-key' }),
    ]);
    expect(resolveMergedExerciseIdentity('source-key')).toBe('final-key');
    installExerciseMergeRedirects([
      redirect(),
      redirect({ id: 'merge-2', sourceExerciseId: 'target-uuid', sourceStableKey: 'target-key', sourceRuntimeId: 'builtin-target-key', targetExerciseId: 'source-uuid', targetStableKey: 'source-key', targetRuntimeId: 'builtin-source-key' }),
    ]);
    expect(resolveMergedExerciseIdentity('source-key')).toBe('source-key');
  });

  it('blocks self, measurement, and movement-family mismatches but only warns on metadata', () => {
    expect(validateExerciseMergePair({ id: 'same', measurementType: 'reps', movementFamily: 'Dip' }, { id: 'same', measurementType: 'duration', movementFamily: 'Core' }).blocking)
      .toEqual(['self_merge', 'measurement_mismatch', 'movement_family_mismatch']);
    expect(validateExerciseMergePair({ id: 'dip', measurementType: 'reps', movementFamily: 'Dip', difficulty: 'intermediate' }, { id: 'parallel', measurementType: 'reps', movementFamily: 'Dip', difficulty: 'advanced' }))
      .toEqual({ safe: true, blocking: [], warnings: ['metadata_difference'] });
  });

  it('migrates programs, active/history targets, replacements, goals and keeps set provenance', () => {
    installExerciseMergeRedirects([redirect()]);
    const data = createInitialData();
    const workoutExercise = { id: 'we', exerciseId: 'source-uuid', order: 0, targetSets: 1, targetMin: 1, targetMax: 2, restSeconds: 60, allowedReplacementExerciseIds: ['builtin-source-key'] };
    data.programs = [{ id: 'p', name: 'P', createdAt: 'now', updatedAt: 'now', workouts: [{ id: 'w', programId: 'p', name: 'W', scheduledDays: [], createdAt: 'now', updatedAt: 'now', exercises: [workoutExercise] }] }];
    const session = { id: 's', workoutName: 'W', startedAt: '2026-01-01', status: 'completed' as const, currentExerciseIndex: 0, exercises: [{ id: 'se', exerciseId: 'source-key', replacedByExerciseId: 'source-uuid', target: workoutExercise, skipped: false, sets: [{ id: 'set', setNumber: 1, reps: 12, completed: true, notes: 'preserve' }] }] };
    data.workoutSessions = [session];
    data.activeWorkout = { ...session, id: 'active', status: 'active' };
    data.goals = [{ id: 'g', type: 'exercise-reps', title: 'Goal', exerciseId: 'builtin-source-key', targetValue: 20, createdAt: 'now' }];
    const migrated = applyExerciseMergeRedirects(data);
    expect(migrated.schemaVersion).toBe(14);
    expect(migrated.programs[0].workouts[0].exercises[0]).toMatchObject({ exerciseId: 'target-key', allowedReplacementExerciseIds: ['target-key'] });
    expect(migrated.workoutSessions[0].exercises[0]).toMatchObject({ exerciseId: 'target-key', mergedFromExerciseId: 'source-key', replacedByExerciseId: 'target-key' });
    expect(migrated.workoutSessions[0].exercises[0].sets[0]).toMatchObject({ reps: 12, notes: 'preserve' });
    expect(migrated.activeWorkout?.exercises[0].exerciseId).toBe('target-key');
    expect(migrated.goals[0].exerciseId).toBe('target-key');
  });

  it('aggregates source and target historical sessions into target progress and PRs', () => {
    const target = { ...builtInExercises[0], id: 'builtin-target-key', stableKey: 'target-key', canonicalExerciseId: 'target-uuid', measurementType: 'reps' as const };
    installExerciseMergeRedirects([redirect()]);
    const sessions = ['source-key', 'target-key'].map((exerciseId, index) => ({ id: `s${index}`, workoutName: 'W', startedAt: `2026-01-0${index + 1}`, completedAt: `2026-01-0${index + 1}`, status: 'completed' as const, currentExerciseIndex: 0, exercises: [{ id: `e${index}`, exerciseId, measurementType: 'reps' as const, skipped: false, sets: [{ id: `set${index}`, setNumber: 1, reps: 10 + index, completed: true }] }] }));
    expect(buildProgressExerciseSummaries([target], sessions)[0]).toMatchObject({ sessionCount: 2, personalBest: 11 });
    expect(personalRecords(sessions, [target])[0]).toMatchObject({ bestSet: 11 });
    expect(areCanonicalExerciseIdentitiesEqual('source-uuid', 'target-key')).toBe(true);
  });

  it('does not activate rolled-back mappings', () => {
    installExerciseMergeRedirects([redirect({ status: 'rolled_back' })]);
    expect(resolveMergedExerciseIdentity('source-key')).toBe('source-key');
  });
});

describe('merge service contract', () => {
  it('does not mutate during a dry-run RPC', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ safe: true, blocking: [], warnings: [], source: {}, target: {}, sourceMedia: [], targetMedia: [], counts: {}, visual: { policy: 'target_wins' }, policies: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    sessionStorage.setItem('calistrack.admin.session', JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 10000, userId: 'admin' }));
    const { previewExerciseMerge } = await import('./exerciseMerges');
    await previewExerciseMerge('source-uuid', 'target-uuid');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ p_source_id: 'source-uuid', p_target_id: 'target-uuid' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/rpc/exercise_merge_preview');
    vi.unstubAllGlobals();
  });
});
