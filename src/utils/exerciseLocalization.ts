import type { Exercise } from '../types';

export type AppLanguage = 'en' | 'he';

const comparable = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

export function findExerciseByReference(
  exercises: Exercise[],
  reference: string | undefined,
): Exercise | undefined {
  if (!reference) return undefined;
  const direct = exercises.find(
    (exercise) => exercise.id === reference || exercise.stableKey === reference,
  );
  if (direct) return direct;

  const legacy = comparable(reference);
  const exactName = exercises.find(
    (exercise) =>
      comparable(exercise.nameEn) === legacy ||
      comparable(exercise.nameHe) === legacy,
  );
  if (exactName) return exactName;
  return exercises.find(
    (exercise) =>
      exercise.aliases?.some((alias) => comparable(alias) === legacy) ||
      exercise.aliasesHe?.some((alias) => comparable(alias) === legacy),
  );
}

export function getExerciseName(exercise: Exercise, language: AppLanguage): string {
  if (exercise.isCustom || exercise.source === 'personal') return exercise.nameEn;
  return language === 'he' ? exercise.nameHe || exercise.nameEn : exercise.nameEn;
}

export function getExerciseDescription(exercise: Exercise, language: AppLanguage): string {
  if (exercise.isCustom || exercise.source === 'personal') return exercise.description;
  return language === 'he' ? exercise.descriptionHe || exercise.description : exercise.description;
}

export function getExerciseInstructions(exercise: Exercise, language: AppLanguage): string[] {
  if (exercise.isCustom || exercise.source === 'personal') return exercise.instructions;
  return language === 'he' && exercise.instructionsHe?.length
    ? exercise.instructionsHe
    : exercise.instructions;
}

export function getExerciseMistakes(exercise: Exercise, language: AppLanguage): string[] {
  if (exercise.isCustom || exercise.source === 'personal') return exercise.commonMistakes;
  return language === 'he' && exercise.commonMistakesHe?.length
    ? exercise.commonMistakesHe
    : exercise.commonMistakes;
}

export function hasExerciseDemonstration(exercise: Exercise): boolean {
  return (
    Boolean(exercise.media?.some((item) => item.isPublished)) ||
    exercise.instructions.length > 0 ||
    Boolean(exercise.instructionsHe?.length)
  );
}

export function resolveExerciseName(
  exercises: Exercise[],
  reference: string | undefined,
  language: AppLanguage,
  fallback: string,
): string {
  const exercise = findExerciseByReference(exercises, reference);
  return exercise ? getExerciseName(exercise, language) : fallback;
}
