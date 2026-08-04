import type {
  ManagedProgramDefinition,
  ManagedProgramPrescription,
  ManagedProgramSection,
  ManagedProgramWeek,
  ManagedProgramWorkoutDay,
} from './managedProgram';

type Rx = Omit<ManagedProgramPrescription, 'key' | 'order' | 'required' | 'progression'> & {
  perSide?: boolean;
};

const rx = (exerciseKey: string, sets: number, min: number, max: number, restSeconds: number, extra: Partial<Rx> = {}): Rx => ({
  exerciseKey,
  sets,
  targetMin: min,
  targetMax: max,
  restSeconds,
  ...extra,
});

const section = (
  key: string,
  kind: ManagedProgramSection['kind'],
  nameEn: string,
  nameHe: string,
  items: Rx[],
  requiredForSuccess = true,
  guidanceEn?: string,
  guidanceHe?: string,
): ManagedProgramSection => ({
  key,
  kind,
  nameEn,
  nameHe,
  order: 0,
  contributesToHistory: kind !== 'warm_up' && kind !== 'cool_down',
  requiredForSuccess,
  guidanceEn,
  guidanceHe,
  exercises: items.map((item, order) => ({
    key: `${key}-${item.exerciseKey}-${order + 1}`,
    order,
    required: requiredForSuccess,
    progression: 'week-specific',
    ...item,
  })),
});

const warmup = () => section(
  'warm-up', 'warm_up', 'Optional warm-up', 'חימום אופציונלי',
  [
    rx('jumping-jacks', 1, 20, 20, 0, { notes: 'Move easily and finish feeling warmer, not tired.', notesHe: 'נועו בקלות וסיימו חמים יותר, לא עייפים.' }),
    rx('wrist-rolls', 1, 10, 10, 0, { perSide: true, notes: '10 controlled circles each direction.', notesHe: '10 סיבובים מבוקרים לכל כיוון.' }),
    rx('arm-circles', 1, 10, 10, 0, { perSide: true, notes: '10 controlled circles each direction.', notesHe: '10 סיבובים מבוקרים לכל כיוון.' }),
  ], false,
  'Take 5–10 minutes. Mark each item Done or Skip; warm-up results do not affect success or records.',
  'הקדישו 5–10 דקות. סמנו כל פריט כהושלם או דלגו; החימום אינו משפיע על הצלחת האימון או על שיאים.',
);

const cooldown = () => section(
  'cool-down', 'cool_down', 'Optional cool-down', 'שחרור אופציונלי',
  [
    rx('cat-cow', 1, 6, 8, 0, { notes: 'Move gently through a comfortable range.' }),
    rx('downward-dog', 1, 20, 30, 0, { notes: 'Breathe calmly; do not force range.' }),
  ], false,
  'Spend 5–10 minutes returning to easy breathing. Stop any movement that causes pain.',
  'הקדישו 5–10 דקות לחזרה לנשימה רגועה. הפסיקו כל תנועה שגורמת לכאב.',
);

const replacements = {
  row: { replacementKeys: ['band-assisted-pull-up', 'negative-pull-up', 'pull-up'], replacementCountsForCompletion: true },
  pull: { replacementKeys: ['australian-row', 'band-assisted-pull-up', 'negative-pull-up'], replacementCountsForCompletion: true },
  dip: { replacementKeys: ['assisted-dip', 'push-up'], replacementCountsForCompletion: true },
  legRaise: { replacementKeys: ['knee-raise', 'lying-leg-raise'], replacementCountsForCompletion: true },
  pistol: { replacementKeys: ['split-squat', 'reverse-lunge'], replacementCountsForCompletion: true },
  wiper: { replacementKeys: ['lying-windshield-wiper', 'windshield-wiper'], replacementCountsForCompletion: true },
  handstand: { replacementKeys: ['free-standing-handstand'], replacementCountsForCompletion: true },
};

const day = (key: string, nameEn: string, nameHe: string, order: number, sections: ManagedProgramSection[], suggestedWeekday?: number, required = true): ManagedProgramWorkoutDay => ({
  key, nameEn, nameHe, order, sections: sections.map((s, i) => ({ ...s, order: i })), suggestedWeekday,
  minimumRestHours: 24, flexible: true, repeatable: false, required,
});

const phase1Targets = [
  [[6, 8], [5, 8], [6, 8], [12, 15], [8, 8], [20, 30]],
  [[8, 10], [6, 9], [8, 10], [15, 18], [9, 9], [30, 40]],
  [[10, 12], [7, 10], [8, 12], [18, 20], [10, 10], [40, 50]],
  [[8, 12], [6, 10], [8, 10], [15, 20], [8, 10], [30, 45]],
] as const;

const fullBody = (week: number) => {
  const t = phase1Targets[week - 1];
  return section('main-work', 'main_work', 'Full-body strength', 'כוח לכל הגוף', [
    rx('push-up', 3, t[0][0], t[0][1], 90),
    rx('australian-row', 3, t[1][0], t[1][1], 90, { ...replacements.row, equipmentNote: 'Use a stable low bar or safe row setup.' }),
    rx('bench-dip', 3, t[2][0], t[2][1], 90, { ...replacements.dip, equipmentNote: 'Use a stable bench and a pain-free shoulder range.' }),
    rx('bodyweight-squat', 3, t[3][0], t[3][1], 75),
    rx('reverse-lunge', 3, t[4][0], t[4][1], 75, { perSide: true, perSideGuidanceEn: 'Each leg', perSideGuidanceHe: 'לכל רגל' }),
    rx('plank', 3, t[5][0], t[5][1], 60),
  ], true, week === 4 ? 'Consolidate controlled repetitions; maximal volume is not required.' : undefined,
  week === 4 ? 'מטרת השבוע היא ביצוע עקבי ומבוקר; אין צורך להגיע לנפח מרבי.' : undefined);
};

const phase1Week = (week: number): ManagedProgramWeek => ({
  key: `week-${week}`, nameEn: `Week ${week}`, nameHe: `שבוע ${week}`, order: week - 1,
  phaseKey: 'foundation', advancementPolicy: 'required_complete',
  workouts: ['a', 'b', 'c'].map((letter, index) => day(
    `day-${letter}`, `Full Body ${letter.toUpperCase()}`, `אימון גוף מלא ${letter.toUpperCase()}`,
    index, [warmup(), fullBody(week), cooldown()], [1, 3, 5][index],
  )),
});

const upperTargets: Record<number, readonly (readonly [number, number])[]> = {
  5: [[8, 10], [5, 8], [6, 10], [6, 8], [6, 6]],
  6: [[10, 12], [6, 9], [8, 10], [8, 10], [8, 8]],
  7: [[10, 15], [6, 10], [8, 12], [8, 12], [8, 10]],
  8: [[10, 15], [6, 10], [8, 12], [8, 12], [8, 10]],
};
const lowerTargets: Record<number, readonly (readonly [number, number])[]> = {
  5: [[15, 20], [10, 10], [15, 20], [15, 20], [6, 8], [12, 12]],
  6: [[18, 22], [10, 12], [18, 22], [20, 22], [8, 10], [15, 15]],
  7: [[20, 25], [12, 15], [20, 25], [20, 25], [8, 12], [18, 20]],
  8: [[20, 25], [12, 15], [20, 25], [20, 25], [8, 12], [18, 20]],
};
const upper = (week: number) => {
  const t = upperTargets[week];
  return section('main-work', 'main_work', 'Upper-body strength', 'כוח פלג גוף עליון', [
    rx('push-up', 4, ...t[0], 90), rx('pull-up', 4, ...t[1], 90, replacements.pull),
    rx('parallel-bar-dip', 4, ...t[2], 90, replacements.dip), rx('pike-push-up', 3, ...t[3], 90),
    rx('plank-to-push-up', 3, ...t[4], 60, { perSide: true }),
  ], true, week === 8 ? 'Keep Week 7 ranges. Reduce one set from the first three movements only when recovery calls for it.' : undefined,
  week === 8 ? 'שמרו על טווחי שבוע 7. הפחיתו סט אחד משלושת התרגילים הראשונים רק אם ההתאוששות מחייבת זאת.' : undefined);
};
const lower = (week: number) => {
  const t = lowerTargets[week];
  return section('main-work', 'main_work', 'Lower body and core', 'פלג גוף תחתון וליבה', [
    rx('bodyweight-squat', 4, ...t[0], 75), rx('reverse-lunge', 4, ...t[1], 75, { perSide: true }),
    rx('glute-bridge', 3, ...t[2], 60), rx('calf-raise', 4, ...t[3], 60),
    rx('hanging-leg-raise', 3, ...t[4], 75, replacements.legRaise), rx('russian-twist', 3, ...t[5], 60, { perSide: true }),
  ]);
};
const skillPractice = (week: number, variant: 'a' | 'b') => section(
  'skill-practice', 'skill_practice', 'Optional Skill practice', 'תרגול מיומנות אופציונלי',
  variant === 'a'
    ? [rx('wall-handstand', 3, 20, 20, 90, replacements.handstand), rx('tuck-l-sit', 3, 8, 10, 90)]
    : [rx('wall-handstand', 3, 20, 30, 90, replacements.handstand), rx('tuck-l-sit', 3, 10, 15, 90)],
  false,
  `Optional practice for Week ${week}. Results enter exercise and Program history but never pass a formal Skill assessment.`,
  `תרגול אופציונלי לשבוע ${week}. התוצאות נשמרות בהיסטוריית התרגיל והתוכנית, אך אינן עוברות הערכת מיומנות רשמית.`,
);
const phase2Week = (week: number): ManagedProgramWeek => ({
  key: `week-${week}`, nameEn: `Week ${week}`, nameHe: `שבוע ${week}`, order: week - 1,
  phaseKey: 'strength-split', advancementPolicy: 'required_complete',
  workouts: [
    day('upper-a', 'Upper A', 'פלג גוף עליון A', 0, [warmup(), upper(week), skillPractice(week, 'a'), cooldown()], 1),
    day('lower-a', 'Lower A', 'פלג גוף תחתון A', 1, [warmup(), lower(week), cooldown()], 2),
    day('upper-b', 'Upper B', 'פלג גוף עליון B', 2, [warmup(), upper(week), skillPractice(week, 'b'), cooldown()], 4),
    day('lower-b', 'Lower B', 'פלג גוף תחתון B', 3, [warmup(), lower(week), cooldown()], 5),
  ],
});

const advancedUpperTargets: Record<number, readonly (readonly [number, number])[]> = {
  9: [[8, 10], [5, 8], [8, 10], [3, 5], [8, 8]], 10: [[10, 12], [6, 9], [8, 12], [4, 6], [10, 10]],
  11: [[10, 15], [8, 10], [10, 15], [5, 8], [10, 10]], 12: [[10, 15], [8, 10], [10, 15], [5, 8], [10, 10]],
};
const advancedLowerTargets: Record<number, readonly (readonly [number, number])[]> = {
  9: [[4, 6], [8, 10], [12, 15], [20, 25], [8, 10], [5, 8]], 10: [[5, 8], [10, 12], [15, 18], [25, 25], [10, 12], [6, 10]],
  11: [[6, 10], [10, 15], [15, 20], [25, 30], [10, 15], [8, 12]], 12: [[6, 10], [10, 15], [15, 20], [25, 30], [10, 15], [8, 12]],
};
const advancedUpper = (week: number) => {
  const t = advancedUpperTargets[week];
  return section('main-work', 'main_work', 'Advanced beginner upper body', 'פלג גוף עליון למתחילים מתקדמים', [
    rx('decline-push-up', 4, ...t[0], 90), rx('pull-up', 4, ...t[1], 90, replacements.pull),
    rx('parallel-bar-dip', 4, ...t[2], 90, replacements.dip), rx('archer-push-up', 3, ...t[3], 90, { perSide: true }),
    rx('plank-to-push-up', 3, ...t[4], 60, { perSide: true }),
  ], true, week === 12 ? 'Performance and consolidation: controlled form, an easier replacement, or one fewer compound set is valid.' : undefined,
  week === 12 ? 'שבוע ביצוע וגיבוש: טכניקה מבוקרת, חלופה קלה יותר או סט מורכב אחד פחות הם בחירה תקפה.' : undefined);
};
const advancedLower = (week: number) => {
  const t = advancedLowerTargets[week];
  return section('main-work', 'main_work', 'Advanced beginner lower body and core', 'פלג גוף תחתון וליבה למתחילים מתקדמים', [
    rx('assisted-pistol-squat', 4, ...t[0], 90, { ...replacements.pistol, perSide: true }),
    rx('bulgarian-split-squat', 4, ...t[1], 90, { perSide: true }), rx('single-leg-glute-bridge', 3, ...t[2], 60, { perSide: true }),
    rx('calf-raise', 3, ...t[3], 60), rx('hanging-leg-raise', 3, ...t[4], 75, replacements.legRaise),
    rx('bent-knee-windshield-wiper', 3, ...t[5], 75, { ...replacements.wiper, perSide: true }),
  ]);
};
const phase3Skill = (kind: 'handstand' | 'l-sit' | 'muscle-up') => section(
  `skill-${kind}`, 'skill_practice', 'Optional Skill practice', 'תרגול מיומנות אופציונלי',
  kind === 'handstand' ? [rx('wall-handstand', 3, 20, 30, 90, replacements.handstand)]
    : kind === 'l-sit' ? [rx('tuck-l-sit', 3, 10, 20, 90)]
      : [rx('jumping-muscle-up', 3, 3, 5, 120, { replacementKeys: ['band-assisted-muscle-up'], replacementCountsForCompletion: true, equipmentNote: 'Use only a stable suitable bar and assistance you can control.' })],
  false,
  'Optional practice only. It contributes to exercise history, never to formal Skill unlocks or assessments.',
  'תרגול אופציונלי בלבד. הוא תורם להיסטוריית התרגיל, אך לעולם לא לפתיחת שלבים או להערכות מיומנות רשמיות.',
);
const optionalRecovery = (week: number) => day('optional-recovery', 'Optional Skill and mobility', 'מיומנות ותנועתיות אופציונליות', 4, [
  warmup(), phase3Skill(week % 2 ? 'handstand' : 'l-sit'),
  section('mobility', 'custom', 'Light mobility', 'תנועתיות קלה', [rx('deep-squat-mobility', 1, 30, 45, 0), rx('cat-cow', 1, 6, 8, 0)], false),
  cooldown(),
], 6, false);
const phase3Week = (week: number): ManagedProgramWeek => ({
  key: `week-${week}`, nameEn: `Week ${week}`, nameHe: `שבוע ${week}`, order: week - 1,
  phaseKey: 'advanced-beginner', advancementPolicy: 'required_complete',
  workouts: [
    day('upper-a', 'Upper A', 'פלג גוף עליון A', 0, [warmup(), advancedUpper(week), phase3Skill('handstand'), cooldown()], 1),
    day('lower-a', 'Lower A', 'פלג גוף תחתון A', 1, [warmup(), advancedLower(week), phase3Skill('l-sit'), cooldown()], 2),
    day('upper-b', 'Upper B', 'פלג גוף עליון B', 2, [warmup(), advancedUpper(week), phase3Skill('muscle-up'), cooldown()], 4),
    day('lower-b', 'Lower B', 'פלג גוף תחתון B', 3, [warmup(), advancedLower(week), cooldown()], 5),
    optionalRecovery(week),
  ],
});

export const beginnerCalisthenics12Week: ManagedProgramDefinition = {
  schemaVersion: 1,
  key: 'beginner-calisthenics-12-week', version: 1,
  nameEn: '12-Week Beginner Calisthenics', nameHe: 'תוכנית קליסטניקס למתחילים – 12 שבועות',
  shortDescriptionEn: 'A progressive introduction to whole-body strength, sustainable training rhythm, and optional Skill practice.',
  shortDescriptionHe: 'מבוא הדרגתי לכוח לכל הגוף, לשגרת אימונים יציבה ולתרגול מיומנויות אופציונלי.',
  descriptionEn: 'Build movement confidence over three phases: full-body foundations, an upper/lower strength split, and advanced-beginner practice. Progress quality repetitions before difficulty, stay short of forced failure, and choose an easier compatible movement whenever control is lost.',
  descriptionHe: 'בנו ביטחון בתנועה לאורך שלושה שלבים: יסודות לכל הגוף, חלוקת כוח לפלג גוף עליון ותחתון, ותרגול למתחילים מתקדמים. התקדמו קודם בחזרות איכותיות ורק אחר כך בדרגת הקושי, הימנעו מכשל כפוי ובחרו חלופה קלה ומתאימה כאשר השליטה נפגעת.',
  difficulty: 'beginner', goals: ['strength', 'endurance', 'hypertrophy', 'skill'], durationWeeks: 12,
  sessionsPerWeek: 4, estimatedMinutesMin: 35, estimatedMinutesMax: 70,
  equipment: ['Floor space', 'Stable pull-up bar or safe inverted-row setup', 'Optional parallel bars', 'Optional bench', 'Optional resistance band', 'Optional stable wall'],
  tags: ['beginner', 'full-body', 'upper-lower', 'skill-introduction'],
  targetAudienceEn: 'Beginners who can train three to four days per week and want a controlled introduction to calisthenics.',
  targetAudienceHe: 'מתחילים שיכולים להתאמן שלושה עד ארבעה ימים בשבוע ורוצים היכרות מבוקרת עם קליסטניקס.',
  prerequisitesEn: 'Use secure equipment and a pain-free range. Seek qualified medical guidance when health, injury, dizziness, or balance concerns make exercise uncertain.',
  prerequisitesHe: 'השתמשו בציוד יציב ובטווח תנועה שאינו מכאיב. כאשר מצב רפואי, פציעה, סחרחורת או בעיית שיווי משקל מעוררים ספק, פנו לייעוץ רפואי מוסמך.',
  icon: 'dumbbell', featured: true, sortOrder: 10,
  phases: [
    { key: 'foundation', nameEn: 'Foundation', nameHe: 'יסודות', order: 0, descriptionEn: 'Weeks 1–4 · three flexible full-body sessions each week.', descriptionHe: 'שבועות 1–4 · שלושה אימוני גוף מלא גמישים בכל שבוע.' },
    { key: 'strength-split', nameEn: 'Strength Split and Skill Introduction', nameHe: 'חלוקת כוח ומבוא למיומנויות', order: 1, descriptionEn: 'Weeks 5–8 · four upper/lower sessions with optional Skill practice twice weekly.', descriptionHe: 'שבועות 5–8 · ארבעה אימוני פלג גוף עליון/תחתון עם תרגול מיומנות אופציונלי פעמיים בשבוע.' },
    { key: 'advanced-beginner', nameEn: 'Advanced Beginner Strength and Skill Practice', nameHe: 'כוח ותרגול מיומנויות למתחילים מתקדמים', order: 2, descriptionEn: 'Weeks 9–12 · four required sessions and one optional light Skill or mobility day.', descriptionHe: 'שבועות 9–12 · ארבעה אימונים נדרשים ויום קל אופציונלי למיומנות או תנועתיות.' },
  ],
  weeks: [1, 2, 3, 4].map(phase1Week).concat([5, 6, 7, 8].map(phase2Week), [9, 10, 11, 12].map(phase3Week)),
};
