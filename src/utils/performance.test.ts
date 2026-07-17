import { describe, expect, it } from 'vitest';
import type { WorkoutSet } from '../types';
import { builtInExercises } from '../data/exercises';
import {
  formatAddedWeight,
  formatDuration,
  formatSetPerformance,
  isValidSetInput,
  normalizeMeasurementType,
} from './performance';

describe('metric-specific set performance', () => {
  it('normalizes the legacy time measurement without changing other types', () => {
    expect(normalizeMeasurementType('time')).toBe('duration');
    expect(normalizeMeasurementType('weighted_reps')).toBe('weighted_reps');
    expect(normalizeMeasurementType(undefined)).toBe('reps');
  });

  it('formats English and Hebrew durations', () => {
    expect(formatDuration(18, 'en')).toBe('18 sec');
    expect(formatDuration(72, 'en')).toBe('1 min 12 sec');
    expect(formatDuration(18, 'he')).toBe('18 שניות');
    expect(formatDuration(72, 'he')).toBe('דקה ו־12 שניות');
  });

  it('formats decimal added weight without rounding', () => {
    expect(formatAddedWeight(7.5, 'en')).toBe('+7.5 kg');
    expect(formatAddedWeight(12.5, 'he')).toBe('12.5+ ק״ג');
  });

  it('formats each set type independently', () => {
    const duration = { id: 'd', setNumber: 1, durationSeconds: 30, completed: true };
    const weighted = { id: 'w', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true };
    expect(formatSetPerformance(duration, 'duration', 'en')).toBe('30 sec');
    expect(formatSetPerformance(weighted, 'weighted_reps', 'en')).toBe('6 reps × +7.5 kg');
  });

  it('requires only the fields appropriate to the measurement type', () => {
    expect(isValidSetInput({ reps: 1 }, 'reps')).toBe(true);
    expect(isValidSetInput({ reps: 0 }, 'reps')).toBe(false);
    expect(isValidSetInput({ durationSeconds: 20 }, 'duration')).toBe(true);
    expect(isValidSetInput({ durationSeconds: 0 }, 'duration')).toBe(false);
    expect(isValidSetInput({ reps: 5, addedWeightKg: 0 }, 'weighted_reps')).toBe(true);
    expect(isValidSetInput({ reps: 5, addedWeightKg: -0.5 }, 'weighted_reps')).toBe(false);
    expect(isValidSetInput({ reps: 5 }, 'weighted_reps')).toBe(false);
  });

  it('keeps legacy set values readable when the historical type is known', () => {
    const legacy = { id: 'old', setNumber: 1, value: 25, completed: true } satisfies WorkoutSet;
    expect(formatSetPerformance(legacy, 'duration', 'en')).toBe('25 sec');
    expect(formatSetPerformance(legacy, 'reps', 'en')).toBe('25 reps');
  });
  it('assigns built-in holds and weighted movements to their explicit metric', () => {
    for (const name of ['Plank', 'Tuck L-Sit', 'Dead Hang', 'Hollow Body Hold']) {
      expect(builtInExercises.find((exercise) => exercise.nameEn === name)?.measurementType).toBe('duration');
    }
    for (const name of ['Weighted Pull-Up', 'Weighted Chin-Up', 'Weighted Dip', 'Weighted Push-Up', 'Weighted Muscle-Up']) {
      expect(builtInExercises.find((exercise) => exercise.nameEn === name)?.measurementType).toBe('weighted_reps');
    }
  });
});
