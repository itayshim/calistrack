import type { Difficulty, Exercise, ExerciseCategory, MeasurementType } from '../types';

interface ExerciseSeed {
  name: string;
  family: string;
  category: ExerciseCategory;
  difficulty?: Difficulty;
  measurement?: MeasurementType;
  aliases?: string[];
  muscles?: string[];
}

const family = (
  movementFamily: string,
  category: ExerciseCategory,
  names: Array<string | Partial<ExerciseSeed> & { name: string }>,
): ExerciseSeed[] =>
  names.map((item) => ({
    family: movementFamily,
    category,
    ...(typeof item === 'string' ? { name: item } : item),
  }));

const seeds: ExerciseSeed[] = [
  ...family('Push-Up', 'push', [
    { name: 'Wall Push-Up', difficulty: 'beginner' },
    'Incline Push-Up',
    'Knee Push-Up',
    'Push-Up',
    'Pause Push-Up',
    'Diamond Push-Up',
    'Decline Push-Up',
    { name: 'Archer Push-Up', difficulty: 'advanced' },
    { name: 'One-Arm Push-Up', difficulty: 'advanced' },
  ]),
  ...family('Dip', 'push', [
    'Bench Dip',
    { name: 'Assisted Dip', aliases: ['assisted dips'] },
    { name: 'Band-Assisted Dip', aliases: ['band dip'] },
    'Negative Dip',
    'Parallel Bar Dip',
    { name: 'Straight Bar Dip', difficulty: 'intermediate' },
    { name: 'Korean Dip', difficulty: 'advanced' },
    { name: 'Ring Dip', difficulty: 'advanced' },
    { name: 'Weighted Dip', difficulty: 'advanced' },
  ]),
  ...family('Pull-Up', 'pull', [
    { name: 'Dead Hang', measurement: 'time' },
    'Scapular Pull-Up',
    'Negative Pull-Up',
    'Assisted Pull-Up',
    'Pull-Up',
    { name: 'Chest-to-Bar Pull-Up', difficulty: 'advanced' },
    { name: 'Archer Pull-Up', difficulty: 'advanced' },
    { name: 'Weighted Pull-Up', difficulty: 'advanced' },
  ]),
  ...family('Chin-Up', 'pull', [
    'Assisted Chin-Up',
    'Negative Chin-Up',
    'Chin-Up',
    { name: 'Weighted Chin-Up', difficulty: 'advanced' },
  ]),
  ...family('Row', 'pull', [
    { name: 'High Australian Row', aliases: ['inverted row'] },
    { name: 'Australian Row', aliases: ['bodyweight row', 'inverted row'] },
    'Feet-Elevated Row',
    { name: 'Archer Row', difficulty: 'advanced' },
    { name: 'Ring Row', difficulty: 'intermediate' },
  ]),
  ...family('Squat', 'legs', [
    'Assisted Squat',
    'Bodyweight Squat',
    { name: 'Deep Squat', aliases: ['full squat'] },
    'Pause Squat',
    'Jump Squat',
    'Split Squat',
    'Assisted Split Squat',
    'Bulgarian Split Squat',
    { name: 'Shrimp Squat', difficulty: 'advanced' },
    { name: 'Assisted Pistol Squat', difficulty: 'intermediate' },
    { name: 'Pistol Squat', difficulty: 'advanced' },
    { name: 'Squat Hold', measurement: 'time', aliases: ['squat isometric'] },
    { name: 'Wall Sit', measurement: 'time' },
  ]),
  ...family('Lunge', 'legs', [
    'Reverse Lunge',
    'Forward Lunge',
    'Walking Lunge',
    'Lateral Lunge',
    { name: 'Jumping Lunge', difficulty: 'intermediate' },
  ]),
  ...family('Calf Raise', 'legs', [
    'Assisted Calf Raise',
    'Calf Raise',
    'Single-Leg Calf Raise',
    { name: 'Deficit Calf Raise', difficulty: 'intermediate' },
  ]),
  ...family('Glute Bridge', 'legs', [
    'Glute Bridge',
    'Pause Glute Bridge',
    'Single-Leg Glute Bridge',
    { name: 'Elevated Glute Bridge', difficulty: 'intermediate' },
  ]),
  ...family('Nordic Curl', 'legs', [
    'Assisted Nordic Curl',
    'Nordic Curl Negative',
    { name: 'Nordic Curl', difficulty: 'advanced' },
  ]),
  ...family('Plank', 'core', [
    { name: 'Knee Plank', measurement: 'time' },
    { name: 'Plank', measurement: 'time' },
    { name: 'Side Plank', measurement: 'time' },
    { name: 'Long-Lever Plank', measurement: 'time', difficulty: 'intermediate' },
  ]),
  ...family('Hollow Body', 'core', [
    'Dead Bug',
    { name: 'Tuck Hollow Hold', measurement: 'time' },
    { name: 'Hollow Body Hold', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Hollow Body Rock', difficulty: 'intermediate' },
  ]),
  ...family('Leg Raise', 'core', [
    'Knee Raise',
    'Hanging Knee Raise',
    'Lying Leg Raise',
    'Leg Raise',
    { name: 'Hanging Leg Raise', difficulty: 'advanced' },
    { name: 'Toes-to-Bar', difficulty: 'advanced' },
  ]),
  ...family('Handstand', 'skill', [
    { name: 'Wall Handstand Hold', measurement: 'time', aliases: ['handstand wall hold'] },
    { name: 'Chest-to-Wall Handstand', measurement: 'time' },
    { name: 'Back-to-Wall Handstand', measurement: 'time' },
    { name: 'Handstand Kick-Up', difficulty: 'intermediate' },
    { name: 'Freestanding Handstand Hold', measurement: 'time', difficulty: 'advanced' },
    { name: 'Handstand Shoulder Taps', difficulty: 'advanced' },
  ]),
  ...family('Handstand Push-Up', 'push', [
    { name: 'Pike Push-Up', difficulty: 'intermediate', aliases: ['pike hspu'] },
    { name: 'Pike Handstand Push-Up', difficulty: 'intermediate' },
    { name: 'Wall Handstand Push-Up', difficulty: 'advanced', aliases: ['wall hspu'] },
    { name: 'Handstand Push-Up Negative', difficulty: 'advanced' },
    { name: 'Handstand Push-Up', difficulty: 'advanced', aliases: ['hspu'] },
    { name: 'Deficit Handstand Push-Up', difficulty: 'advanced' },
  ]),
  ...family('L-Sit', 'skill', [
    { name: 'Foot-Supported L-Sit', measurement: 'time' },
    { name: 'Tuck L-Sit', measurement: 'time', difficulty: 'intermediate' },
    { name: 'One-Leg L-Sit', measurement: 'time', difficulty: 'intermediate' },
    { name: 'L-Sit', measurement: 'time', difficulty: 'advanced' },
  ]),
  ...family('Front Lever', 'skill', [
    { name: 'Tuck Front Lever', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Advanced Tuck Front Lever', measurement: 'time', difficulty: 'advanced' },
    { name: 'Straddle Front Lever', measurement: 'time', difficulty: 'advanced' },
    { name: 'Front Lever', measurement: 'time', difficulty: 'advanced' },
  ]),
  ...family('Back Lever', 'skill', [
    { name: 'Tuck Back Lever', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Advanced Tuck Back Lever', measurement: 'time', difficulty: 'advanced' },
    { name: 'Back Lever', measurement: 'time', difficulty: 'advanced' },
  ]),
  ...family('Muscle-Up', 'skill', [
    'Jumping Muscle-Up',
    { name: 'Band-Assisted Muscle-Up', difficulty: 'intermediate' },
    { name: 'Negative Muscle-Up', difficulty: 'intermediate' },
    { name: 'Bar Muscle-Up', difficulty: 'advanced', aliases: ['muscle up'] },
    { name: 'Ring Muscle-Up', difficulty: 'advanced' },
  ]),
  ...family('Planche', 'skill', [
    { name: 'Planche Lean', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Tuck Planche', measurement: 'time', difficulty: 'advanced' },
    { name: 'Advanced Tuck Planche', measurement: 'time', difficulty: 'advanced' },
    { name: 'Straddle Planche', measurement: 'time', difficulty: 'advanced' },
    { name: 'Full Planche', measurement: 'time', difficulty: 'advanced' },
  ]),
  ...family('Human Flag', 'skill', [
    { name: 'Vertical Flag Hold', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Tuck Human Flag', measurement: 'time', difficulty: 'advanced' },
    { name: 'Straddle Human Flag', measurement: 'time', difficulty: 'advanced' },
    { name: 'Human Flag', measurement: 'time', difficulty: 'advanced' },
  ]),
  ...family('Warm-Up', 'mobility', [
    { name: 'Wrist Warm-Up', measurement: 'time' },
    'Shoulder Circles',
    'Scapular Circles',
    'Arm Swings',
    'Light Jumping Jacks',
  ]),
  ...family('Mobility', 'mobility', [
    { name: 'Hip Mobility', measurement: 'time' },
    { name: 'Ankle Mobility', measurement: 'time' },
    'Cat-Cow',
    { name: 'Thoracic Rotation', measurement: 'time' },
    { name: 'Deep Squat Mobility', measurement: 'time', aliases: ['squat mobility'] },
  ]),
  ...family('Balance', 'skill', [
    { name: 'Frog Stand', measurement: 'time', difficulty: 'intermediate' },
    { name: 'Crow Pose', measurement: 'time', difficulty: 'intermediate' },
  ]),
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const levels: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export const builtInExercises: Exercise[] = seeds.map((seed, index) => {
  const siblings = seeds.filter((item) => item.family === seed.family);
  const familyIndex = siblings.findIndex((item) => item.name === seed.name);
  const difficulty = seed.difficulty ?? levels[Math.min(2, Math.floor(familyIndex / 3))];
  return {
    id: `builtin-${slug(seed.name)}`,
    nameHe: seed.name,
    nameEn: seed.name,
    movementFamily: seed.family,
    category: seed.category,
    difficulty,
    muscles: seed.muscles ?? defaultMuscles(seed.category),
    aliases: seed.aliases ?? [],
    keywords: [seed.family, seed.category, ...(seed.aliases ?? [])],
    progressionOrder: familyIndex,
    measurementType: seed.measurement ?? 'reps',
    description: `${seed.name} is a ${seed.family.toLowerCase()} progression for controlled bodyweight training.`,
    instructions: [
      'Set up in a stable starting position',
      'Move through a controlled, comfortable range',
      'Maintain steady breathing and body position',
    ],
    commonMistakes: ['Rushing the movement', 'Losing a stable body position'],
    easierExerciseId: familyIndex > 0 ? `builtin-${slug(siblings[familyIndex - 1].name)}` : undefined,
    harderExerciseId:
      familyIndex < siblings.length - 1
        ? `builtin-${slug(siblings[familyIndex + 1].name)}`
        : undefined,
    isCustom: false,
    updatedAt: String(index),
  };
});

function defaultMuscles(category: ExerciseCategory): string[] {
  const groups: Record<ExerciseCategory, string[]> = {
    push: ['chest', 'shoulders', 'triceps'],
    pull: ['back', 'biceps', 'forearms'],
    legs: ['quadriceps', 'glutes', 'hamstrings'],
    core: ['core', 'abdominals'],
    mobility: ['mobility', 'joints'],
    skill: ['core', 'shoulders', 'full body'],
  };
  return groups[category];
}

export const findBuiltIn = (name: string) => builtInExercises.find((exercise) => exercise.nameEn === name)!;
