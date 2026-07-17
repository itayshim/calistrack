import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../data/exercises';
import { searchExercises } from './exerciseSearch';

describe('exercise search', () => {
  it('normalizes punctuation, plurals and common spelling variants', () => {
    expect(searchExercises(builtInExercises, 'push up')[0].nameEn).toBe('Push-Up');
    expect(searchExercises(builtInExercises, 'pullup')[0].nameEn).toBe('Pull-Up');
    expect(searchExercises(builtInExercises, 'dips').slice(0, 5).every((exercise) => exercise.movementFamily === 'Dip')).toBe(true);
  });

  it('returns a movement family in progression order', () => {
    const squats = searchExercises(builtInExercises, 'squat').filter(
      (exercise) => exercise.movementFamily === 'Squat',
    );
    expect(squats.map((exercise) => exercise.nameEn)).toEqual(
      expect.arrayContaining(['Bodyweight Squat', 'Bulgarian Split Squat', 'Pistol Squat', 'Squat Hold']),
    );
    expect(squats[0].progressionOrder).toBeLessThanOrEqual(squats.at(-1)?.progressionOrder ?? 0);
  });

  it('supports small spelling mistakes and ranks exact names first', () => {
    expect(searchExercises(builtInExercises, 'handstad').some((exercise) => exercise.movementFamily === 'Handstand')).toBe(true);
    expect(searchExercises(builtInExercises, 'plank')[0].nameEn).toBe('Plank');
  });
});
