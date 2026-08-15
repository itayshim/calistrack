import { describe, expect, it } from 'vitest';
import type { ManagedProgramEnrollment, WorkoutSession } from '../../types';
import type { ManagedProgramDefinition } from './managedProgram';
import { advanceManagedProgramStage, getManagedProgramProgress, managedWorkoutKey, repeatManagedProgramStage } from './managedProgramProgress';

const definition: ManagedProgramDefinition = {
  schemaVersion: 1, key: 'test-program', version: 2, nameEn: 'Test', nameHe: 'בדיקה', shortDescriptionEn: '', shortDescriptionHe: '', descriptionEn: '', descriptionHe: '', difficulty: 'beginner', goals: ['strength'], durationWeeks: 2, sessionsPerWeek: 2, estimatedMinutesMin: 20, estimatedMinutesMax: 30, equipment: [], tags: [], targetAudienceEn: '', targetAudienceHe: '', featured: false, sortOrder: 0, phases: [],
  weeks: [1, 2].map((number) => ({ key: `week-${number}`, nameEn: `Week ${number}`, nameHe: `שבוע ${number}`, order: number - 1, advancementPolicy: 'required_complete', workouts: ['a', 'b'].map((key, index) => ({ key, nameEn: key, nameHe: key, order: index, flexible: true, repeatable: false, required: true, sections: [] })) })),
};
const enrollment = (changes: Partial<ManagedProgramEnrollment> = {}): ManagedProgramEnrollment => ({ id: 'enrollment', programKey: definition.key, programVersion: definition.version, startDate: '2026-08-01', currentWeekKey: 'week-1', completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], preferredWeekdays: [], status: 'active', detached: false, ...changes });
const session = (weekKey: string, workoutKey: string, enrollmentId?: string, exerciseId = 'legacy-dip'): WorkoutSession => ({ id: `${weekKey}-${workoutKey}`, workoutName: workoutKey, startedAt: '2026-08-01', completedAt: '2026-08-01', status: 'completed', currentExerciseIndex: 0, exercises: [{ id: 'exercise', exerciseId, skipped: false, sets: [] }], managedProgramLink: { programKey: definition.key, version: definition.version, weekKey, workoutKey, enrollmentId, source: 'managed_program' } });

describe('managed Program progress resolver', () => {
  it('keeps Week 2 locked until every required Week 1 session is terminal', () => {
    const none = getManagedProgramProgress(definition, enrollment(), []);
    expect(none.unlockedWeekKeys).toEqual(['week-1']);
    expect(none.nextWorkoutKey).toBe('week-1:a');
    const one = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a'] }), []);
    expect(one.unlockedWeekKeys).toEqual(['week-1']);
    expect(one.weekProgress['week-2'].lockReason?.remainingRequiredCount).toBe(1);
  });

  it('recognizes historical linked completion without an enrollment id and requests an explicit decision', () => {
    const result = getManagedProgramProgress(definition, enrollment(), [session('week-1', 'a'), session('week-1', 'b')]);
    expect(result.completedWorkoutKeys).toEqual(['week-1:a', 'week-1:b']);
    expect(result.unlockedWeekKeys).toEqual(['week-1']);
    expect(result.currentWeekKey).toBe('week-1');
    expect(result.canAdvance).toBe(true);
    expect(result.weekProgress['week-1'].readiness?.recommendation).toBe('unknown');
  });

  it('accepts completion for the same enrollment and rejects another enrollment or version', () => {
    const another = session('week-1', 'a', 'other');
    const wrongVersion = { ...session('week-1', 'b', 'enrollment'), managedProgramLink: { ...session('week-1', 'b').managedProgramLink!, version: 3 } };
    const own = session('week-1', 'a', 'enrollment');
    expect(getManagedProgramProgress(definition, enrollment(), [another, wrongVersion, own]).completedWorkoutKeys).toEqual(['week-1:a']);
  });

  it('treats Skip as terminal for scheduling but never as completion or success', () => {
    const result = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a'], successfulWorkoutKeys: ['week-1:a'], skippedWorkoutKeys: ['week-1:b'] }), []);
    expect(result.canAdvance).toBe(true);
    expect(result.completedWorkoutKeys).not.toContain('week-1:b');
    expect(result.successfulWorkoutKeys).not.toContain('week-1:b');
    expect(result.workoutStates['week-1:b']).toBe('skipped');
    expect(result.overall).toMatchObject({ completedRequired: 1, skippedRequired: 1 });
  });

  it('completion wins over a stale skipped marker and survives resolver reload', () => {
    const first = getManagedProgramProgress(definition, enrollment({ skippedWorkoutKeys: ['week-1:a'] }), [session('week-1', 'a', 'enrollment')]);
    expect(first.skippedWorkoutKeys).not.toContain('week-1:a');
    const reloaded = getManagedProgramProgress(definition, first.enrollment, [session('week-1', 'a', 'enrollment')]);
    expect(reloaded.completedWorkoutKeys).toContain(managedWorkoutKey('week-1', 'a'));
  });

  it('does not depend on exercise identity when immutable Program provenance matches', () => {
    const redirectedExerciseHistory = session('week-1', 'a', undefined, 'parallel-bar-dip');
    expect(getManagedProgramProgress(definition, enrollment(), [redirectedExerciseHistory]).completedWorkoutKeys).toContain('week-1:a');
  });

  it('recommends Advance when most assessed required workouts meet targets', () => {
    const result = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], successfulWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    expect(result.weekProgress['week-1'].readiness).toMatchObject({ recommendation: 'advance', reason: 'all_met', metCount: 2 });
  });

  it('recommends Repeat when multiple assessed workouts are partial', () => {
    const result = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    expect(result.weekProgress['week-1'].readiness).toMatchObject({ recommendation: 'repeat', partialCount: 2 });
  });

  it('creates an independent repeat attempt without deleting the prior attempt', () => {
    const first = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    const repeated = repeatManagedProgramStage(first.enrollment, first, '2026-08-08', 'attempt-2');
    expect(repeated.stageAttempts).toHaveLength(2);
    expect(repeated.stageAttempts?.[0]).toMatchObject({ decision: 'repeated', completedWorkoutKeys: ['week-1:a', 'week-1:b'] });
    expect(repeated.stageAttempts?.[1]).toMatchObject({ id: 'attempt-2', attemptNumber: 2, completedWorkoutKeys: [] });
    const second = getManagedProgramProgress(definition, repeated, []);
    expect(second.weekProgress['week-1'].completedRequiredCount).toBe(0);
  });

  it('allows an explicit Continue despite a Repeat recommendation', () => {
    const first = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    const advanced = advanceManagedProgramStage(first, '2026-08-08', 'week-2-attempt');
    expect(advanced).toMatchObject({ currentWeekKey: 'week-2', currentStageAttemptId: 'week-2-attempt', status: 'active' });
    expect(advanced.stageAttempts?.[0]).toMatchObject({ recommendation: 'repeat', decision: 'advanced' });
  });

  it('marks an all-skipped stage terminal but recommends Review', () => {
    const result = getManagedProgramProgress(definition, enrollment({ skippedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    expect(result.weekProgress['week-1']).toMatchObject({ terminal: true, completedRequiredCount: 0, skippedRequiredCount: 2 });
    expect(result.weekProgress['week-1'].readiness).toMatchObject({ recommendation: 'review', reason: 'mostly_skipped' });
  });

  it('does not let an unfinished optional workout block readiness', () => {
    const withOptional = structuredClone(definition);
    withOptional.weeks[0].workouts.push({ key: 'optional', nameEn: 'Optional', nameHe: 'רשות', order: 2, flexible: true, repeatable: false, required: false, sections: [] });
    const result = getManagedProgramProgress(withOptional, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], successfulWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    expect(result.weekProgress['week-1'].terminal).toBe(true);
    expect(result.workoutPerformance['week-1:optional']).toBe('remaining');
  });

  it('uses the explicit Program completion decision on the final stage', () => {
    const finalDefinition = { ...definition, durationWeeks: 1, weeks: [definition.weeks[0]] };
    const result = getManagedProgramProgress(finalDefinition, enrollment({ completedWorkoutKeys: ['week-1:a', 'week-1:b'], successfulWorkoutKeys: ['week-1:a', 'week-1:b'], assessedWorkoutKeys: ['week-1:a', 'week-1:b'] }), []);
    expect(result.enrollment.status).toBe('active');
    const finished = advanceManagedProgramStage(result, '2026-08-08', 'unused');
    expect(finished.status).toBe('completed');
    expect(finished.stageAttempts?.[0].decision).toBe('program_finished');
  });
});
