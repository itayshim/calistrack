import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../data/exercises';
import type { Exercise } from '../types';
import {
  findExerciseByReference,
  getExerciseDescription,
  getExerciseName,
  resolveExerciseName,
} from './exerciseLocalization';

describe('exercise localization', () => {
  const pushUp = builtInExercises.find((exercise) => exercise.nameEn === 'Push-Up')!;

  it('always uses canonical English for built-in exercises in English mode', () => {
    expect(getExerciseName(pushUp, 'en')).toBe('Push-Up');
    expect(getExerciseName(pushUp, 'en')).not.toMatch(/[\u0590-\u05ff]/);
    expect(getExerciseDescription(pushUp, 'en')).toBe(pushUp.description);
  });

  it('uses Hebrew content when available in Hebrew mode', () => {
    expect(getExerciseName(pushUp, 'he')).toBe(pushUp.nameHe);
    expect(getExerciseName(pushUp, 'he')).toMatch(/[\u0590-\u05ff]/);
  });

  it('preserves user-created names exactly in every language', () => {
    const custom: Exercise = {
      ...pushUp,
      id: 'custom-1',
      stableKey: 'custom-1',
      nameEn: 'My MIXED תרגיל',
      nameHe: 'My MIXED תרגיל',
      source: 'personal',
      isCustom: true,
    };
    expect(getExerciseName(custom, 'en')).toBe('My MIXED תרגיל');
    expect(getExerciseName(custom, 'he')).toBe('My MIXED תרגיל');
  });

  it('resolves historical stable IDs, stable keys, and legacy translated names', () => {
    expect(findExerciseByReference(builtInExercises, pushUp.id)).toBe(pushUp);
    expect(findExerciseByReference(builtInExercises, pushUp.stableKey)).toBe(pushUp);
    expect(findExerciseByReference(builtInExercises, pushUp.nameHe)).toBe(pushUp);
    expect(resolveExerciseName(builtInExercises, pushUp.nameHe, 'en', 'Missing')).toBe('Push-Up');
  });
});
