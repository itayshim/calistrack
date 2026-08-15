import { describe, expect, it } from 'vitest';
import type { ManagedProgramEnrollment, WorkoutSession } from '../../types';
import type { ManagedProgramDefinition } from './managedProgram';
import { getManagedProgramProgress, managedWorkoutKey } from './managedProgramProgress';

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

  it('recognizes historical linked completion without an enrollment id and advances exactly at threshold', () => {
    const result = getManagedProgramProgress(definition, enrollment(), [session('week-1', 'a'), session('week-1', 'b')]);
    expect(result.completedWorkoutKeys).toEqual(['week-1:a', 'week-1:b']);
    expect(result.unlockedWeekKeys).toEqual(['week-1', 'week-2']);
    expect(result.currentWeekKey).toBe('week-2');
    expect(result.nextWorkoutKey).toBe('week-2:a');
  });

  it('accepts completion for the same enrollment and rejects another enrollment or version', () => {
    const another = session('week-1', 'a', 'other');
    const wrongVersion = { ...session('week-1', 'b', 'enrollment'), managedProgramLink: { ...session('week-1', 'b').managedProgramLink!, version: 3 } };
    const own = session('week-1', 'a', 'enrollment');
    expect(getManagedProgramProgress(definition, enrollment(), [another, wrongVersion, own]).completedWorkoutKeys).toEqual(['week-1:a']);
  });

  it('treats Skip as terminal for scheduling but never as completion or success', () => {
    const result = getManagedProgramProgress(definition, enrollment({ completedWorkoutKeys: ['week-1:a'], successfulWorkoutKeys: ['week-1:a'], skippedWorkoutKeys: ['week-1:b'] }), []);
    expect(result.unlockedWeekKeys).toContain('week-2');
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
});
