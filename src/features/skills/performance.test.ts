import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import type { WorkoutSession } from '../../types';
import { deriveSkillLevelPerformance } from './performance';

const tuck = builtInExercises.find((item) => item.stableKey === 'tuck-front-lever')!;
const session = (id: string, duration: number, extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id, workoutName: 'History', startedAt: '2026-07-01T10:00:00Z', completedAt: '2026-07-01T10:10:00Z', status: 'completed', currentExerciseIndex: 0,
  exercises: [{ id: `${id}-exercise`, exerciseId: tuck.id, skipped: false, measurementType: 'duration', sets: [{ id: `${id}-set`, setNumber: 1, durationSeconds: duration, completed: true }] }],
  ...extra,
});

describe('skill-level performance summaries', () => {
  it('uses exact canonical history and includes normal program workouts', () => {
    const result = deriveSkillLevelPerformance({ exerciseKey: 'tuck-front-lever', metric: 'duration' }, builtInExercises, [session('one', 14), session('two', 18)], [], 'tuck');
    expect(result.best?.value).toBe(18);
  });

  it('excludes preview, incomplete, skipped, and invalid values', () => {
    const preview = session('preview', 30, { skillLink: { skillKey: 'front-lever', levelKey: 'tuck', templateVersion: 2, kind: 'workout', linkState: 'linked', preview: true } });
    const incomplete = session('incomplete', 25, { status: 'active', completedAt: undefined });
    const skipped = session('skipped', 20); skipped.exercises[0].skipped = true;
    const result = deriveSkillLevelPerformance({ exerciseKey: 'tuck-front-lever', metric: 'duration' }, builtInExercises, [preview, incomplete, skipped, session('valid', 12)], [], 'tuck');
    expect(result.best?.value).toBe(12);
  });

  it('keeps formal assessment status separate from a larger general best', () => {
    const assessment = { id: 'a', levelKey: 'tuck', sessionId: 'formal', passed: false, durationSeconds: 12, techniqueRating: 'needs-work' as const, completedAt: '2026-07-02T10:00:00Z' };
    const result = deriveSkillLevelPerformance({ exerciseKey: 'tuck-front-lever', metric: 'duration' }, builtInExercises, [session('general', 25)], [assessment], 'tuck');
    expect(result.best?.value).toBe(25);
    expect(result.bestAssessment?.passed).toBe(false);
  });

  it('supports reusable repetitions and weighted-repetition metrics', () => {
    const repsExercise = builtInExercises.find((item) => item.measurementType === 'reps')!;
    const weighted = { ...session('weighted', 0), exercises: [{ id: 'weighted-ex', exerciseId: repsExercise.id, skipped: false, measurementType: 'weighted_reps' as const, sets: [{ id: 'weighted-set', setNumber: 1, reps: 5, addedWeightKg: 20, completed: true }] }] };
    expect(deriveSkillLevelPerformance({ exerciseKey: repsExercise.stableKey!, metric: 'weighted_reps' }, builtInExercises, [weighted], [], 'future').best).toMatchObject({ value: 5, addedWeightKg: 20 });
  });
});
