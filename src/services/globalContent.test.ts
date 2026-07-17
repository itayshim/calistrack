import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../data/exercises';
import type { Exercise } from '../types';
import { mergeExerciseSources } from './globalContent';

describe('global exercise merging', () => {
  it('lets published global content override a built-in stable key and keeps personal exercises', () => {
    const builtIn = builtInExercises.find((exercise) => exercise.stableKey === 'push-up')!;
    const global = { ...builtIn, nameEn: 'Updated Push-Up', source: 'global' as const };
    const personal: Exercise = { ...builtIn, id: 'personal', stableKey: 'personal', nameEn: 'My Move', isCustom: true };
    const merged = mergeExerciseSources([global], [...builtInExercises, personal]);
    expect(merged.find((exercise) => exercise.stableKey === 'push-up')?.nameEn).toBe('Updated Push-Up');
    expect(merged.filter((exercise) => exercise.stableKey === 'push-up')).toHaveLength(1);
    expect(merged.find((exercise) => exercise.id === 'personal')).toBeTruthy();
  });

  it('preserves a global canonical ID while keeping the stable built-in app ID', () => {
    const builtIn = builtInExercises.find(
      (exercise) => exercise.stableKey === 'incline-push-up',
    )!;
    const global = {
      ...builtIn,
      id: 'builtin-incline-push-up',
      canonicalExerciseId: 'supabase-uuid',
      source: 'global' as const,
    };
    const merged = mergeExerciseSources([global], builtInExercises);
    expect(
      merged.find((exercise) => exercise.stableKey === 'incline-push-up'),
    ).toEqual(expect.objectContaining({
      id: 'builtin-incline-push-up',
      canonicalExerciseId: 'supabase-uuid',
    }));
  });
});
