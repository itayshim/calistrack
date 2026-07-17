import type { Difficulty, Exercise, ExerciseCategory, MeasurementType } from '../types';
type Seed = [string, string, ExerciseCategory, Difficulty, MeasurementType];
const seeds: Seed[] = [
  ['Wall Push-Up', 'Wall Push-Up', 'push', 'beginner', 'reps'],
  ['Incline Push-Up', 'Incline Push-Up', 'push', 'beginner', 'reps'],
  ['Knee Push-Up', 'Knee Push-Up', 'push', 'beginner', 'reps'],
  ['Push-Up', 'Push-Up', 'push', 'intermediate', 'reps'],
  ['Diamond Push-Up', 'Diamond Push-Up', 'push', 'intermediate', 'reps'],
  ['Pike Push-Up', 'Pike Push-Up', 'push', 'intermediate', 'reps'],
  ['Bench Dip', 'Bench Dip', 'push', 'beginner', 'reps'],
  ['Parallel Bar Dip', 'Parallel Bar Dip', 'push', 'advanced', 'reps'],
  ['Dead Hang', 'Dead Hang', 'pull', 'beginner', 'time'],
  ['Scapular Pull-Up', 'Scapular Pull-Up', 'pull', 'beginner', 'reps'],
  ['Australian Row', 'Australian Row', 'pull', 'beginner', 'reps'],
  ['Negative Pull-Up', 'Negative Pull-Up', 'pull', 'intermediate', 'reps'],
  ['Assisted Pull-Up', 'Assisted Pull-Up', 'pull', 'beginner', 'reps'],
  ['Pull-Up', 'Pull-Up', 'pull', 'advanced', 'reps'],
  ['Chin-Up', 'Chin-Up', 'pull', 'intermediate', 'reps'],
  ['Bodyweight Squat', 'Bodyweight Squat', 'legs', 'beginner', 'reps'],
  ['Assisted Split Squat', 'Assisted Split Squat', 'legs', 'beginner', 'reps'],
  ['Reverse Lunge', 'Reverse Lunge', 'legs', 'beginner', 'reps'],
  ['Bulgarian Split Squat', 'Bulgarian Split Squat', 'legs', 'intermediate', 'reps'],
  ['Glute Bridge', 'Glute Bridge', 'legs', 'beginner', 'reps'],
  ['Calf Raise', 'Calf Raise', 'legs', 'beginner', 'reps'],
  ['Wall Sit', 'Wall Sit', 'legs', 'beginner', 'time'],
  ['Plank', 'Plank', 'core', 'beginner', 'time'],
  ['Side Plank', 'Side Plank', 'core', 'beginner', 'time'],
  ['Dead Bug', 'Dead Bug', 'core', 'beginner', 'reps'],
  ['Hollow Body Hold', 'Hollow Body Hold', 'core', 'intermediate', 'time'],
  ['Knee Raise', 'Knee Raise', 'core', 'beginner', 'reps'],
  ['Hanging Knee Raise', 'Hanging Knee Raise', 'core', 'intermediate', 'reps'],
  ['Leg Raise', 'Leg Raise', 'core', 'intermediate', 'reps'],
  ['Wrist Warm-Up', 'Wrist Warm-Up', 'mobility', 'beginner', 'time'],
  ['Shoulder Circles', 'Shoulder Circles', 'mobility', 'beginner', 'reps'],
  ['Hip Mobility', 'Hip Mobility', 'mobility', 'beginner', 'time'],
  ['Ankle Mobility', 'Ankle Mobility', 'mobility', 'beginner', 'time'],
  ['Cat-Cow', 'Cat-Cow', 'mobility', 'beginner', 'reps'],
  ['Frog Stand', 'Frog Stand', 'skill', 'intermediate', 'time'],
  ['Crow Pose', 'Crow Pose', 'skill', 'intermediate', 'time'],
  ['Handstand Wall Hold', 'Handstand Wall Hold', 'skill', 'advanced', 'time'],
  ['Tuck L-Sit', 'Tuck L-Sit', 'skill', 'advanced', 'time'],
];
export const builtInExercises: Exercise[] = seeds.map(
  ([nameEn, , category, difficulty, measurementType], i) => ({
    id: `builtin-${nameEn.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    nameHe: nameEn,
    nameEn,
    category,
    difficulty,
    muscles: [category],
    measurementType,
    description:
      category === 'mobility'
        ? 'A mobility and warm-up exercise for safe, gradual development.'
        : 'A bodyweight exercise for safe, gradual development.',
    instructions: [
      'Set up in a stable starting position',
      'Set up in a stable starting position',
      'Maintain steady breathing and pace',
    ],
    commonMistakes: ['Moving too quickly', 'Losing body position'],
    easierExerciseId:
      i > 0 && seeds[i - 1][2] === category
        ? `builtin-${seeds[i - 1][0].toLowerCase().replace(/[^a-z]+/g, '-')}`
        : undefined,
    harderExerciseId:
      seeds[i + 1]?.[2] === category
        ? `builtin-${seeds[i + 1][0].toLowerCase().replace(/[^a-z]+/g, '-')}`
        : undefined,
    isCustom: false,
  }),
);
export const findBuiltIn = (name: string) => builtInExercises.find((e) => e.nameEn === name)!;
