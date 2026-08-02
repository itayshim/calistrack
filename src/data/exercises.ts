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
    { name: 'Weighted Push-Up', measurement: 'weighted_reps', difficulty: 'advanced' },
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
    { name: 'Weighted Dip', measurement: 'weighted_reps', difficulty: 'advanced' },
  ]),
  ...family('Pull-Up', 'pull', [
    { name: 'Dead Hang', measurement: 'duration' },
    { name: 'Active Bar Hang', measurement: 'duration' },
    'Scapular Pull-Up',
    'Negative Pull-Up',
    'Assisted Pull-Up',
    'Pull-Up',
    { name: 'Chest-to-Bar Pull-Up', difficulty: 'advanced' },
    { name: 'Archer Pull-Up', difficulty: 'advanced' },
    { name: 'Weighted Pull-Up', measurement: 'weighted_reps', difficulty: 'advanced' },
  ]),
  ...family('Chin-Up', 'pull', [
    'Assisted Chin-Up',
    'Negative Chin-Up',
    'Chin-Up',
    { name: 'Weighted Chin-Up', measurement: 'weighted_reps', difficulty: 'advanced' },
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
    { name: 'Squat Hold', measurement: 'duration', aliases: ['squat isometric'] },
    { name: 'Wall Sit', measurement: 'duration' },
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
    { name: 'Knee Plank', measurement: 'duration' },
    { name: 'Plank', measurement: 'duration' },
    { name: 'Side Plank', measurement: 'duration' },
    { name: 'Long-Lever Plank', measurement: 'duration', difficulty: 'intermediate' },
  ]),
  ...family('Hollow Body', 'core', [
    'Dead Bug',
    { name: 'Tuck Hollow Hold', measurement: 'duration' },
    { name: 'Hollow Body Hold', measurement: 'duration', difficulty: 'intermediate' },
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
    { name: 'Headstand', measurement: 'duration', difficulty: 'beginner' },
    { name: 'Wall Handstand', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Handstand', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Wall Handstand Hold', measurement: 'duration', aliases: ['handstand wall hold'] },
    { name: 'Chest-to-Wall Handstand', measurement: 'duration' },
    { name: 'Back-to-Wall Handstand', measurement: 'duration' },
    { name: 'Handstand Kick-Up', difficulty: 'intermediate' },
    { name: 'Freestanding Handstand Hold', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Handstand Shoulder Taps', difficulty: 'advanced' },
  ]),
  ...family('Handstand Push-Up', 'push', [
    { name: 'Pike Push-Up', difficulty: 'intermediate', aliases: ['pike hspu'] },
    { name: 'Hindu Push-Up', difficulty: 'intermediate' },
    { name: 'Advanced Pike Push-Up', difficulty: 'advanced', aliases: ['feet-elevated pike push-up'] },
    { name: 'Pike Handstand Push-Up', difficulty: 'intermediate' },
    { name: 'Wall Handstand Push-Up', difficulty: 'advanced', aliases: ['wall hspu'] },
    { name: 'Negative Handstand Push-Up', difficulty: 'advanced', aliases: ['handstand push-up negative'] },
    { name: 'Handstand Push-Up Negative', difficulty: 'advanced' },
    { name: 'Handstand Push-Up', difficulty: 'advanced', aliases: ['hspu'] },
    { name: 'Deficit Handstand Push-Up', difficulty: 'advanced' },
  ]),
  ...family('L-Sit', 'skill', [
    { name: 'Foot-Supported L-Sit', measurement: 'duration' },
    { name: 'Tuck L-Sit', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'One-Leg L-Sit', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'L-Sit', measurement: 'duration', difficulty: 'advanced' },
  ]),
  ...family('Front Lever', 'skill', [
    { name: 'Arch Active Hang', difficulty: 'intermediate' },
    { name: 'Tuck Front Lever', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Tuck Front Lever Raise', difficulty: 'intermediate' },
    { name: 'Advanced Tuck Front Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Advanced Tuck Front Lever Raise', difficulty: 'advanced' },
    { name: 'One-Leg Front Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Half Front Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Straddle Front Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Front Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Ice Cream Maker', difficulty: 'advanced' },
    { name: 'Dragon Flag', difficulty: 'advanced' },
  ]),
  ...family('Back Lever', 'skill', [
    { name: 'Tuck Back Lever', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Advanced Tuck Back Lever', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Back Lever', measurement: 'duration', difficulty: 'advanced' },
  ]),
  ...family('Muscle-Up', 'skill', [
    'Jumping Muscle-Up',
    { name: 'Band-Assisted Muscle-Up', difficulty: 'intermediate' },
    { name: 'Negative Muscle-Up', difficulty: 'intermediate' },
    { name: 'Bar Muscle-Up', difficulty: 'advanced', aliases: ['muscle up'] },
    { name: 'Ring Muscle-Up', difficulty: 'advanced' },
    { name: 'Weighted Muscle-Up', measurement: 'weighted_reps', difficulty: 'advanced' },
  ]),
  ...family('Planche', 'skill', [
    { name: 'Planche Lean', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Tuck Planche', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Advanced Tuck Planche', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Straddle Planche', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Full Planche', measurement: 'duration', difficulty: 'advanced' },
  ]),
  ...family('Human Flag', 'skill', [
    { name: 'Vertical Flag Hold', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Tuck Human Flag', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Straddle Human Flag', measurement: 'duration', difficulty: 'advanced' },
    { name: 'Human Flag', measurement: 'duration', difficulty: 'advanced' },
  ]),
  ...family('Warm-Up', 'mobility', [
    'Jumping Jacks',
    'Wrist Rolls',
    'Elbow Circles',
    'Arm Circles',
    { name: 'Wrist Warm-Up', measurement: 'duration' },
    'Shoulder Circles',
    'Scapular Circles',
    'Arm Swings',
    'Light Jumping Jacks',
  ]),
  ...family('Mobility', 'mobility', [
    { name: 'Downward Dog', measurement: 'duration', difficulty: 'beginner' },
    { name: 'Hip Mobility', measurement: 'duration' },
    { name: 'Ankle Mobility', measurement: 'duration' },
    'Cat-Cow',
    { name: 'Thoracic Rotation', measurement: 'duration' },
    { name: 'Deep Squat Mobility', measurement: 'duration', aliases: ['squat mobility'] },
  ]),
  ...family('Balance', 'skill', [
    { name: 'Frog Stand', measurement: 'duration', difficulty: 'intermediate' },
    { name: 'Crow Pose', measurement: 'duration', difficulty: 'intermediate' },
  ]),
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const levels: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const hebrewFamilies: Record<string, string> = {
  'Push-Up': 'שכיבות סמיכה',
  Dip: 'מקבילים',
  'Pull-Up': 'מתח',
  'Chin-Up': 'מתח באחיזה הפוכה',
  Row: 'משיכה אופקית',
  Squat: 'סקוואט',
  Lunge: 'מכרעים',
  'Calf Raise': 'עליות תאומים',
  'Glute Bridge': 'גשר ישבן',
  'Nordic Curl': 'כפיפת ברך נורדית',
  Plank: 'פלאנק',
  'Hollow Body': 'הולו בודי',
  'Leg Raise': 'הרמות רגליים',
  Handstand: 'עמידת ידיים',
  'Handstand Push-Up': 'שכיבות סמיכה בעמידת ידיים',
  'L-Sit': 'אל-סיט',
  'Front Lever': 'פרונט לבר',
  'Back Lever': 'בק לבר',
  'Muscle-Up': 'מאסל אפ',
  Planche: "פלאנץ'",
  'Human Flag': 'דגל אנושי',
  'Warm-Up': 'חימום',
  Mobility: 'מוביליטי',
  Balance: 'שיווי משקל',
};
const hebrewNames: Record<string, string> = {
  'Jumping Jacks': 'קפיצות פיסוק',
  'Wrist Rolls': 'סיבובי שורש כף היד',
  'Elbow Circles': 'סיבובי מרפקים',
  'Arm Circles': 'סיבובי זרועות',
  'Arch Active Hang': 'תלייה אקטיבית בקשת',
  'Active Bar Hang': 'תלייה אקטיבית על המוט',
  'Push-Up': 'שכיבות סמיכה',
  'Pull-Up': 'מתח',
  'Chin-Up': 'מתח באחיזה הפוכה',
  'Bodyweight Squat': 'סקוואט במשקל גוף',
  'Pistol Squat': 'פיסטול סקוואט',
  'Bulgarian Split Squat': 'סקוואט בולגרי',
  'Australian Row': 'מתח אוסטרלי',
  'Pike Push-Up': 'שכיבות סמיכה פייק',
  'Hindu Push-Up': 'שכיבת סמיכה הינדית',
  'Advanced Pike Push-Up': 'שכיבת סמיכה פייק מתקדמת',
  'Headstand': 'עמידת ראש',
  'Wall Handstand': 'עמידת ידיים על קיר',
  'Handstand': 'עמידת ידיים',
  'Wall Handstand Push-Up': 'שכיבת סמיכה בעמידת ידיים על קיר',
  'Negative Handstand Push-Up': 'שכיבת סמיכה שלילית בעמידת ידיים',
  'Frog Stand': 'עמידת צפרדע',
  'Downward Dog': 'כלב מביט מטה',
  'Parallel Bar Dip': 'מקבילים',
  'Ring Dip': 'מקבילים על טבעות',
  'Straight Bar Dip': 'מקבילים על מוט',
  'Negative Dip': 'מקבילים שליליים',
  'Weighted Dip': 'מקבילים עם משקל',
  'Wall Handstand Hold': 'עמידת ידיים על קיר',
  'Freestanding Handstand Hold': 'עמידת ידיים חופשית',
  'Hollow Body Hold': 'הולו בודי',
  Plank: 'פלאנק',
  'Tuck L-Sit': 'טאק אל-סיט',
  'L-Sit': 'אל-סיט',
  'Nordic Curl': 'כפיפת ברך נורדית',
  'Front Lever': 'פרונט לבר',
  'Back Lever': 'בק לבר',
  'Bar Muscle-Up': 'מאסל אפ על מוט',
  'Full Planche': "פלאנץ' מלא",
  'Human Flag': 'דגל אנושי',
};

const handstandSkillContent: Record<string, Partial<Exercise>> = {
  'Pike Push-Up': { description: 'An elevated-hip press that develops shoulder strength and a controlled inverted pressing path.', instructions: ['Set the hips high and brace the trunk', 'Let the head travel forward and down between the hands', 'Press smoothly while keeping the elbows controlled'], commonMistakes: ['Dropping the hips', 'Flaring the elbows abruptly', 'Collapsing into the bottom position'] },
  'Advanced Pike Push-Up': { description: 'A feet-elevated pike press that increases shoulder loading while preserving a deliberate head path.', instructions: ['Elevate the feet on a stable surface', 'Stack the hips toward the shoulders', 'Lower and press through a range you can control'], commonMistakes: ['Using an unstable platform', 'Turning the movement into a horizontal push-up', 'Forcing range after control is lost'] },
  'Wall Handstand Push-Up': { description: 'A wall-supported inverted press for building strength through a stable, controlled range.', instructions: ['Establish a stable wall-supported handstand', 'Lower with control and keep the head position safe', 'Press without bouncing or collapsing'], commonMistakes: ['Dropping onto the head', 'Overarching without control', 'Using a range that cannot be reversed safely'] },
  'Negative Handstand Push-Up': { description: 'A controlled eccentric handstand push-up used to develop inverted pressing strength and positional confidence.', instructions: ['Begin in a secure wall-supported handstand', 'Descend slowly while maintaining control', 'Stop or exit safely before the position breaks down'], commonMistakes: ['Falling through the descent', 'Continuing after control is lost', 'Using an unsafe exit path'] },
  'Handstand Push-Up': { description: 'An advanced inverted press combining shoulder strength, balance, and controlled range of motion.', instructions: ['Begin from a stable handstand appropriate to your ability', 'Lower through a controlled path', 'Press while maintaining balance and a safe head position'], commonMistakes: ['Training through pain', 'Rushing the bottom position', 'Attempting unsupported range without control'] },
  'Downward Dog': { description: 'A gentle whole-body preparation position that opens the shoulders and posterior chain before inverted pressing.', instructions: ['Place the hands firmly and lift the hips', 'Lengthen the spine while keeping the shoulders comfortable', 'Breathe steadily for the prescribed time'], commonMistakes: ['Forcing the heels down', 'Shrugging painfully into the shoulders'] },
};

export const builtInExercises: Exercise[] = seeds.map((seed, index) => {
  const siblings = seeds.filter((item) => item.family === seed.family);
  const familyIndex = siblings.findIndex((item) => item.name === seed.name);
  const difficulty = seed.difficulty ?? levels[Math.min(2, Math.floor(familyIndex / 3))];
  const familyHe = hebrewFamilies[seed.family] ?? seed.family;
  const nameHe = hebrewNames[seed.name] ?? `${familyHe} – ${seed.name}`;
  const authored = handstandSkillContent[seed.name];
  return {
    id: `builtin-${slug(seed.name)}`,
    nameHe,
    nameEn: seed.name,
    movementFamily: seed.family,
    category: seed.category,
    difficulty,
    muscles: seed.muscles ?? defaultMuscles(seed.category),
    aliases: seed.aliases ?? [],
    keywords: [seed.family, seed.category, ...(seed.aliases ?? [])],
    aliasesHe: [familyHe, nameHe],
    keywordsHe: [familyHe, nameHe],
    progressionOrder: familyIndex,
    measurementType: seed.measurement ?? 'reps',
    description: authored?.description ?? `${seed.name} is a ${seed.family.toLowerCase()} progression for controlled bodyweight training.`,
    descriptionHe: `${nameHe} הוא תרגיל ממשפחת ${familyHe}. עבדו בשליטה ובטווח תנועה נוח שמתאים לרמה שלכם.`,
    instructions: authored?.instructions ?? [
      'Set up in a stable starting position',
      'Move through a controlled, comfortable range',
      'Maintain steady breathing and body position',
    ],
    commonMistakes: authored?.commonMistakes ?? ['Rushing the movement', 'Losing a stable body position'],
    instructionsHe: [
      'היכנסו לעמדת מוצא יציבה',
      'בצעו את התנועה לאט ובשליטה',
      'שמרו על נשימה רציפה ומנח גוף יציב',
    ],
    commonMistakesHe: ['ביצוע מהיר מדי', 'איבוד מנח גוף יציב'],
    easierExerciseId: familyIndex > 0 ? `builtin-${slug(siblings[familyIndex - 1].name)}` : undefined,
    harderExerciseId:
      familyIndex < siblings.length - 1
        ? `builtin-${slug(siblings[familyIndex + 1].name)}`
        : undefined,
    isCustom: false,
    stableKey: slug(seed.name),
    source: 'built-in',
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
