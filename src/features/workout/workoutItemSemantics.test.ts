import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import { resolveLightweightExercise, usesInstructionalExerciseVisual } from './workoutItemSemantics';

describe('workout item visual semantics', () => {
  it('resolves lightweight items by their authoritative canonical stable key', () => {
    const pushUp = builtInExercises.find((exercise) => exercise.stableKey === 'push-up')!;
    expect(resolveLightweightExercise(builtInExercises, {
      exerciseId: 'stale-runtime-id',
      stableKey: 'push-up',
    })).toBe(pushUp);
  });

  it('classifies phase, section, recovery role, and mobility category semantically', () => {
    expect(usesInstructionalExerciseVisual({ phase: 'warm_up' })).toBe(true);
    expect(usesInstructionalExerciseVisual({ phase: 'cool_down' })).toBe(true);
    expect(usesInstructionalExerciseVisual({ workoutExercise: { managedSectionKind: 'warm_up' } })).toBe(true);
    expect(usesInstructionalExerciseVisual({ workoutExercise: { skillRole: 'recovery' } })).toBe(true);
    expect(usesInstructionalExerciseVisual({ exercise: { category: 'mobility' } })).toBe(true);
    expect(usesInstructionalExerciseVisual({ workoutExercise: { managedSectionKind: 'main_work' }, exercise: { category: 'pull' } })).toBe(false);
  });
});
