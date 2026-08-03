import type { Exercise, MeasurementType } from '../../types';
import type { SkillDefinition, SkillLevelDefinition, SkillPrescription } from './skillEngine';
import { createSkillAssessment, createSkillWorkout, validateSkillContent } from './skillEngine';

export const HANDSTAND_SKILL_KEY = 'handstand' as const;
export const HANDSTAND_TEMPLATE_VERSION = 1;

const work = (
  exerciseKey: string,
  measurementType: MeasurementType,
  sets: number,
  target: number,
  restSeconds: number,
  role: string,
  noteEn?: string,
  noteHe?: string,
): SkillPrescription => ({
  exerciseKey,
  measurementType,
  sets,
  target,
  restSeconds,
  role,
  noteEn,
  noteHe,
});
const level = (definition: Omit<SkillLevelDefinition, 'number'> & { number: number }) => definition;

export const handstandSkill: SkillDefinition = {
  key: HANDSTAND_SKILL_KEY,
  templateVersion: HANDSTAND_TEMPLATE_VERSION,
  nameEn: 'Handstand',
  nameHe: 'עמידת ידיים',
  descriptionEn:
    'Build the strength, alignment, entry control, balance, and safe-exit skills needed for a controlled free-standing handstand.',
  descriptionHe:
    'פיתוח הכוח, יישור הגוף, השליטה בעלייה, שיווי המשקל והיציאה הבטוחה הנדרשים לעמידת ידיים חופשית ובשליטה.',
  techniquePromptEn: 'How controlled was your Handstand technique?',
  techniquePromptHe: 'עד כמה הביצוע בעמידת הידיים היה בשליטה?',
  metadata: {
    category: 'skill',
    difficultyMin: 'beginner',
    difficultyMax: 'advanced',
    equipment: ['stable wall', 'stable raised surface'],
    defaultRestSeconds: 90,
    assessmentRequired: true,
    techniqueModel: 'three-state',
    replacements: [
      {
        exerciseKey: 'elevated-pike-hold',
        replacementExerciseKey: 'pike-hold',
        requireSameMeasurementType: true,
        targetMode: 'custom',
        customTarget: 30,
      },
      {
        exerciseKey: 'handstand-kick-up',
        replacementExerciseKey: 'split-stance-kick-up-drill',
        requireSameMeasurementType: true,
        targetMode: 'same',
      },
    ],
  },
  warmup: [
    { exerciseKey: 'jumping-jacks', guidanceEn: '20 repetitions', guidanceHe: '20 חזרות' },
    { exerciseKey: 'wrist-rolls', guidanceEn: '10 each side', guidanceHe: '10 לכל צד' },
    { exerciseKey: 'elbow-circles', guidanceEn: '10 each direction', guidanceHe: '10 לכל כיוון' },
    { exerciseKey: 'arm-circles', guidanceEn: '10 each direction', guidanceHe: '10 לכל כיוון' },
    {
      exerciseKey: 'downward-dog',
      guidanceEn: '20 seconds',
      guidanceHe: '20 שניות',
      durationSeconds: 20,
    },
    {
      exerciseKey: 'wall-wrist-lean',
      guidanceEn: '10 controlled repetitions',
      guidanceHe: '10 חזרות מבוקרות',
    },
  ],
  levels: [
    level({
      key: 'shoulder-support',
      number: 1,
      nameEn: 'Shoulder Support',
      nameHe: 'תמיכת כתפיים',
      descriptionEn:
        'Develop shoulder, arm, and trunk support before placing more body weight over the hands.',
      descriptionHe: 'פיתוח תמיכת כתפיים, ידיים ומרכז גוף לפני העברת משקל נוסף אל כפות הידיים.',
      techniquePromptEn: 'How controlled was your shoulder-support and wall-walk technique?',
      techniquePromptHe: 'עד כמה תרגילי תמיכת הכתפיים והטיפוס על הקיר היו בשליטה?',
      work: [
        work('pike-hold', 'duration', 3, 30, 90, 'shoulder_support'),
        work('elevated-pike-hold', 'duration', 3, 20, 90, 'elevated_shoulder_support'),
        work(
          'wall-walk-with-top-hold',
          'reps',
          3,
          1,
          90,
          'primary_progression',
          'Hold the top position for 20 seconds on each repetition.',
          'יש להחזיק בתנוחה העליונה במשך 20 שניות בכל חזרה.',
        ),
        work('hollow-body-hold', 'duration', 3, 20, 90, 'alignment_accessory'),
      ],
      performance: { exerciseKey: 'wall-walk-with-top-hold', metric: 'reps' },
      assessment: {
        exerciseKey: 'wall-walk-with-top-hold',
        target: 3,
        measurementType: 'reps',
        techniqueRequired: true,
        instructionsEn:
          'Complete 3 controlled wall walks. Each repetition includes a controlled 20-second hold at the highest safe position; confirm this requirement honestly after the assessment.',
        instructionsHe:
          'השלימו 3 טיפוסים מבוקרים. בכל חזרה יש להחזיק 20 שניות בנקודה הגבוהה והבטוחה ביותר ולאשר זאת בכנות לאחר המבחן.',
        manuallyVerifiedRequirements: true,
        unlocksNextLevel: true,
      },
    }),
    level({
      key: 'handstand-kick-up',
      number: 2,
      nameEn: 'Handstand Kick-Up',
      nameHe: 'עלייה לעמידת ידיים',
      descriptionEn: 'Learn a controlled wall-supported entry without crashing into the wall.',
      descriptionHe: 'לימוד כניסה מבוקרת בתמיכת קיר ללא פגיעה חזקה בקיר.',
      techniquePromptEn: 'How controlled were your wall-supported kick-ups?',
      techniquePromptHe: 'עד כמה העליות לעמידת ידיים מול הקיר היו בשליטה?',
      work: [
        work('wall-handstand-kick-up', 'reps', 3, 2, 75, 'primary_progression'),
        work('wall-handstand', 'duration', 3, 20, 90, 'alignment_control'),
        work(
          'split-stance-kick-up-drill',
          'reps',
          3,
          4,
          60,
          'entry_coordination',
          'Perform each set with the preferred leading side and practise both sides across sessions.',
          'בצעו כל סט עם הצד המוביל המועדף ותרגלו את שני הצדדים לאורך האימונים.',
        ),
        work('hollow-body-hold', 'duration', 3, 25, 75, 'alignment_accessory'),
      ],
      performance: { exerciseKey: 'wall-handstand-kick-up', metric: 'reps' },
      assessment: {
        exerciseKey: 'wall-handstand-kick-up',
        target: 5,
        measurementType: 'reps',
        techniqueRequired: true,
        instructionsEn:
          'Complete 5 controlled kick-ups with straight arms, planted hands, light wall contact, and a safe exit.',
        instructionsHe:
          'השלימו 5 עליות מבוקרות עם ידיים ישרות, כפות ידיים יציבות, מגע קל בקיר ויציאה בטוחה.',
        manuallyVerifiedRequirements: true,
        unlocksNextLevel: true,
      },
    }),
    level({
      key: 'fingertip-control',
      number: 3,
      nameEn: 'Fingertip Control',
      nameHe: 'שליטה באמצעות האצבעות',
      descriptionEn:
        'Use the fingers to counter forward movement and reduce pressure against the wall.',
      descriptionHe: 'שימוש באצבעות לתיקון תנועה קדימה ולהפחתת הלחץ על הקיר.',
      techniquePromptEn: 'How controlled was your fingertip steering?',
      techniquePromptHe: 'עד כמה השליטה באמצעות האצבעות הייתה מבוקרת?',
      work: [
        work('handstand-finger-press', 'reps', 3, 5, 90, 'primary_progression'),
        work('wall-handstand', 'duration', 3, 25, 90, 'alignment_control'),
        work('wall-handstand-toe-pull', 'reps', 3, 5, 90, 'balance_transition'),
        work('hollow-body-hold', 'duration', 3, 30, 75, 'alignment_accessory'),
      ],
      performance: { exerciseKey: 'handstand-finger-press', metric: 'reps' },
      assessment: {
        exerciseKey: 'handstand-finger-press',
        target: 15,
        measurementType: 'reps',
        techniqueRequired: true,
        instructionsEn:
          'Complete 15 controlled finger presses. Keep the hands planted and elbows locked while the feet move lightly away and return under control.',
        instructionsHe:
          'השלימו 15 לחיצות אצבעות מבוקרות. שמרו על כפות הידיים במגע ועל מרפקים נעולים בזמן שהרגליים מתנתקות קלות וחוזרות בשליטה.',
        manuallyVerifiedRequirements: true,
        unlocksNextLevel: true,
      },
    }),
    level({
      key: 'free-balance',
      number: 4,
      nameEn: 'Free Balance',
      nameHe: 'שיווי משקל חופשי',
      descriptionEn:
        'Alternate fingertip and palm pressure to maintain a short free handstand near a wall.',
      descriptionHe: 'שילוב לחץ אצבעות וכף יד לשמירת עמידת ידיים חופשית קצרה ליד קיר.',
      work: [
        work('wall-handstand-finger-press-release', 'reps', 3, 5, 90, 'balance_control'),
        work('free-standing-handstand', 'duration', 3, 8, 120, 'primary_progression'),
        work('wall-handstand-toe-pull', 'reps', 3, 8, 90, 'balance_transition'),
        work('handstand-kick-up', 'reps', 3, 3, 90, 'entry_control'),
      ],
      performance: { exerciseKey: 'free-standing-handstand', metric: 'duration' },
      assessment: {
        exerciseKey: 'free-standing-handstand',
        target: 20,
        measurementType: 'duration',
        techniqueRequired: true,
        instructionsEn:
          'Record a formal 20-second free-standing handstand with controlled technique and a safe exit.',
        instructionsHe: 'תעדו עמידת ידיים חופשית רשמית של 20 שניות עם טכניקה נשלטת ויציאה בטוחה.',
        unlocksNextLevel: true,
      },
    }),
    level({
      key: 'controlled-handstand',
      number: 5,
      nameEn: 'Controlled Handstand',
      nameHe: 'עמידת ידיים בשליטה',
      descriptionEn: 'Combine entry, free balance, alignment, and a safe controlled exit.',
      descriptionHe: 'שילוב עלייה, שיווי משקל חופשי, יישור ויציאה בטוחה ומבוקרת.',
      work: [
        work('free-standing-handstand', 'duration', 3, 15, 120, 'primary_progression'),
        work('handstand-kick-up', 'reps', 3, 5, 90, 'entry_control'),
        work(
          'handstand-cartwheel-exit',
          'reps',
          3,
          3,
          75,
          'safe_exit',
          'Complete 3 controlled exits on each side.',
          'השלימו 3 יציאות מבוקרות לכל צד.',
        ),
        work('wall-handstand-finger-press-release', 'reps', 3, 8, 90, 'balance_control'),
      ],
      performance: { exerciseKey: 'free-standing-handstand', metric: 'duration' },
      assessment: {
        exerciseKey: 'free-standing-handstand',
        target: 30,
        measurementType: 'duration',
        techniqueRequired: true,
        instructionsEn:
          'Hold for 30 seconds and confirm a controlled kick-up, straight-arm support, reasonable stacked alignment, controlled balance, and a safe side-step exit in a clear space.',
        instructionsHe:
          'החזיקו 30 שניות ואשרו עלייה מבוקרת, תמיכה בידיים ישרות, יישור סביר, שיווי משקל נשלט ויציאה צידית בטוחה באזור פנוי.',
        manuallyVerifiedRequirements: true,
        marksSkillMastered: true,
      },
    }),
  ],
};

export const createHandstandWorkout = (
  levelKey: string,
  exercises: Exercise[],
  includeWarmup: boolean,
  programId = 'skill-training',
  preview = false,
) => createSkillWorkout(handstandSkill, levelKey, exercises, includeWarmup, programId, preview);
export const createHandstandAssessment = (levelKey: string, exercises: Exercise[]) =>
  createSkillAssessment(handstandSkill, levelKey, exercises);
export const validateHandstandContent = (exercises: Exercise[], levelKey?: string) =>
  validateSkillContent(handstandSkill, exercises, levelKey);
