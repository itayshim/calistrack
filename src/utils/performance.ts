import type {
  MeasurementType,
  WorkoutSet,
  WorkoutSetInput,
} from '../types';

export const normalizeMeasurementType = (value: unknown): MeasurementType => {
  if (value === 'time' || value === 'duration') return 'duration';
  if (value === 'weighted_reps') return 'weighted_reps';
  return 'reps';
};

export const getSetReps = (set: WorkoutSet, type: MeasurementType) =>
  set.reps ?? (type !== 'duration' ? set.value : undefined);

export const getSetDuration = (set: WorkoutSet, type: MeasurementType) =>
  set.durationSeconds ?? (type === 'duration' ? set.value : undefined);

export const getSetAddedWeight = (set: WorkoutSet) => set.addedWeightKg;

export const normalizeSetInput = (
  input: WorkoutSetInput | number,
  type: MeasurementType,
): WorkoutSetInput => {
  if (typeof input !== 'number') return input;
  return type === 'duration' ? { durationSeconds: input } : { reps: input };
};

export const isValidSetInput = (
  input: WorkoutSetInput,
  type: MeasurementType,
  minimumAddedWeightKg = 0,
) => {
  if (type === 'duration') return (input.durationSeconds ?? 0) > 0;
  if ((input.reps ?? 0) <= 0) return false;
  if (type === 'weighted_reps') {
    const weight = input.addedWeightKg;
    return weight !== undefined && weight >= Math.max(0, minimumAddedWeightKg);
  }
  return true;
};

export const inferSetMeasurementType = (
  set: WorkoutSet,
  fallback: MeasurementType = 'reps',
): MeasurementType => {
  if (set.durationSeconds !== undefined) return 'duration';
  if (set.addedWeightKg !== undefined) return 'weighted_reps';
  return fallback;
};

export const formatDuration = (seconds: number, language: 'en' | 'he' = 'en') => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  if (language === 'he') {
    if (!minutes) return `${remaining} שניות`;
    if (!remaining) return minutes === 1 ? 'דקה' : `${minutes} דקות`;
    const minuteText = minutes === 1 ? 'דקה' : `${minutes} דקות`;
    return `${minuteText} ו־${remaining} שניות`;
  }
  if (!minutes) return `${remaining} sec`;
  if (!remaining) return `${minutes} min`;
  return `${minutes} min ${remaining} sec`;
};

export const formatReps = (count: number, language: 'en' | 'he' = 'en') =>
  language === 'he' ? `${count} חזרות` : `${count} reps`;

export const formatAddedWeight = (weightKg: number, language: 'en' | 'he' = 'en') => {
  const formatted = new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(weightKg);
  return language === 'he' ? `${formatted}+ ק״ג` : `+${formatted} kg`;
};

export const formatSetPerformance = (
  set: WorkoutSet,
  type: MeasurementType,
  language: 'en' | 'he' = 'en',
) => {
  if (type === 'duration') return formatDuration(getSetDuration(set, type) ?? 0, language);
  if (type === 'weighted_reps') {
    const reps = getSetReps(set, type) ?? 0;
    return `${formatReps(reps, language)} × ${formatAddedWeight(getSetAddedWeight(set) ?? 0, language)}`;
  }
  return formatReps(getSetReps(set, type) ?? 0, language);
};
