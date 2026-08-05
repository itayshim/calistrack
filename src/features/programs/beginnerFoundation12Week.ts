import type {
  ManagedProgramDefinition,
  ManagedProgramMilestone,
  ManagedProgramPrescription,
  ManagedProgramSection,
  ManagedProgramWeek,
  ManagedProgressionMetric,
} from './managedProgram';

type RxOptions = Partial<ManagedProgramPrescription> & {
  metric?: ManagedProgressionMetric;
  next?: string;
  regress?: string;
};

const rx = (
  key: string,
  sets: number,
  min: number,
  max: number,
  restSeconds: number,
  options: RxOptions = {},
): Omit<ManagedProgramPrescription, 'key' | 'order' | 'required'> => {
  const { metric: metricOverride, next, regress, ...extra } = options;
  const metric = metricOverride ?? 'reps';
  return {
    exerciseKey: key,
    sets,
    targetMin: min,
    targetMax: max,
    restSeconds,
    progression: 'range-based',
    rirMin: metric === 'duration' ? undefined : 1,
    rirMax: metric === 'duration' ? undefined : 2,
    progressionRule: {
      key: `${key}-${metric}-progression`,
      metric,
      strategy: next ? 'variation' : 'range',
      minimumAcrossAllSets: min,
      maximumAcrossAllSets: max,
      consecutiveSuccesses: 2,
      requireCompletedSets: true,
      requireTechniqueQuality: true,
      targetRirMin: metric === 'duration' ? undefined : 1,
      targetRirMax: metric === 'duration' ? undefined : 2,
      nextExerciseKey: next,
      regressionExerciseKey: regress,
      failedExposureThreshold: 2,
      guidanceEn: next
        ? `Complete every set at the top target with clean technique twice before considering ${next}.`
        : 'Complete every set at the top of the range with clean technique twice before increasing one variable.',
      guidanceHe: next
        ? `השלימו את כל הסטים ביעד העליון ובטכניקה נקייה פעמיים לפני מעבר ל-${next}.`
        : 'השלימו את כל הסטים בקצה העליון של הטווח ובטכניקה נקייה פעמיים לפני העלאת משתנה אחד.',
    },
    completionNoteEn: 'Stop the set when the prescribed position or controlled repetition quality is lost.',
    completionNoteHe: 'סיימו את הסט כאשר תנוחת הגוף או איכות החזרה המבוקרת נפגעת.',
    regressionNoteEn: regress ? `If the minimum is missed twice, use ${regress} without forcing failure.` : 'Repeat the prescription when the minimum is missed; do not force failure.',
    regressionNoteHe: regress ? `אם יעד המינימום הוחמץ פעמיים, עברו ל-${regress} בלי לכפות כשל.` : 'אם יעד המינימום הוחמץ, חזרו על המרשם בלי לכפות כשל.',
    replacementCountsForCompletion: true,
    ...extra,
  };
};

const section = (
  key: string,
  kind: ManagedProgramSection['kind'],
  nameEn: string,
  nameHe: string,
  items: ReturnType<typeof rx>[],
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
    ...item,
    key: `${key}-${item.exerciseKey}-${order + 1}`,
    order,
    required: requiredForSuccess,
  })),
});

const warmup = (focus: 'inversion' | 'pull' | 'mixed') => section(
  'warm-up', 'warm_up', 'Optional preparation', 'הכנה אופציונלית',
  focus === 'inversion'
    ? [rx('jumping-jacks', 1, 20, 20, 0), rx('wrist-rolls', 1, 10, 10, 0, { perSide: true }), rx('elbow-circles', 1, 10, 10, 0), rx('arm-circles', 1, 10, 10, 0), rx('scapular-push-up', 1, 8, 10, 0)]
    : focus === 'pull'
      ? [rx('jumping-jacks', 1, 20, 20, 0), rx('arm-circles', 1, 10, 10, 0), rx('scapular-pull-up', 1, 6, 8, 0), rx('active-bar-hang', 1, 10, 15, 0, { metric: 'duration' })]
      : [rx('jumping-jacks', 1, 20, 20, 0), rx('wrist-rolls', 1, 10, 10, 0), rx('arm-circles', 1, 10, 10, 0), rx('hip-mobility', 1, 20, 30, 0, { metric: 'duration' }), rx('ankle-mobility', 1, 20, 30, 0, { metric: 'duration' })],
  false,
  'Use Done or Skip. Prepare for the session without fatigue; skip the entire section if already warm.',
  'השתמשו ב״בוצע״ או ״דילוג״. התכוננו ללא עייפות; אפשר לדלג על כל החלק אם כבר התחממתם.',
);

const cooldown = (focus: 'upper' | 'lower') => section(
  'cool-down', 'cool_down', 'Optional recovery', 'שחרור אופציונלי',
  focus === 'upper'
    ? [rx('downward-dog', 1, 20, 30, 0, { metric: 'duration' }), rx('wrist-warm-up', 1, 20, 30, 0, { metric: 'duration' }), rx('cat-cow', 1, 6, 8, 0)]
    : [rx('hip-mobility', 1, 30, 45, 0, { metric: 'duration' }), rx('ankle-mobility', 1, 30, 45, 0, { metric: 'duration' }), rx('cat-cow', 1, 6, 8, 0)],
  false,
  'Return to calm breathing. Use a comfortable range and stop any movement that causes pain.',
  'חזרו לנשימה רגועה. עבדו בטווח נוח והפסיקו כל תנועה שגורמת לכאב.',
);

const skill = (_key: string, items: ReturnType<typeof rx>[], goalEn: string, goalHe: string) =>
  section('skill-practice', 'skill_practice', goalEn, goalHe, items.map((item) => ({
    ...item,
    role: 'skill',
    rirMin: undefined,
    rirMax: undefined,
  })), true, 'Quality first. Stop before line, balance, or joint position degrades. This practice does not pass a formal Skill assessment.', 'איכות לפני הכול. עצרו לפני שקו הגוף, שיווי המשקל או מנח המפרקים נפגעים. התרגול אינו עובר הערכת מיומנות רשמית.');

const pushReplacements = ['pause-push-up', 'diamond-push-up', 'decline-push-up'];
const pullReplacements = ['chin-up', 'band-assisted-pull-up', 'australian-row'];
const dipReplacements = ['assisted-dip', 'bench-dip', 'push-up'];
const legReplacements = ['reverse-lunge', 'split-squat', 'bodyweight-squat'];

const workout = (
  key: string,
  nameEn: string,
  nameHe: string,
  order: number,
  focus: 'inversion' | 'pull' | 'mixed',
  sections: ManagedProgramSection[],
  goalEn: string,
  goalHe: string,
) => ({
  key, nameEn, nameHe, order, suggestedWeekday: [1, 3, 6][order], minimumRestHours: 36,
  flexible: true, repeatable: true, required: true, estimatedMinutes: 65,
  goalEn, goalHe,
  skillFocusEn: sections.find((item) => item.kind === 'skill_practice')?.nameEn,
  skillFocusHe: sections.find((item) => item.kind === 'skill_practice')?.nameHe,
  strengthFocusEn: nameEn,
  strengthFocusHe: nameHe,
  recoveryEn: 'Leave at least one recovery day after two consecutive training days. Repeat the week when control is inconsistent.',
  recoveryHe: 'השאירו לפחות יום התאוששות אחרי שני ימי אימון רצופים. חזרו על השבוע כאשר השליטה אינה עקבית.',
  equipment: ['floor-space', 'pull-up-bar', 'parallel-bars-or-stable-support', 'stable-wall'],
  sections: [warmup(focus), ...sections, cooldown(order === 1 ? 'lower' : 'upper')].map((item, index) => ({ ...item, order: index })),
});

const phaseFor = (week: number) => week <= 4 ? 'base-control' : week <= 8 ? 'skill-strength' : 'integration-consolidation';
const phaseScale = (week: number) => week <= 4 ? week - 1 : week <= 8 ? week - 5 : week - 9;
const range = (baseMin: number, baseMax: number, week: number, step = 1): [number, number] => {
  const offset = phaseScale(week) * step;
  if (week === 4 || week === 8 || week === 12) return [baseMin + Math.max(0, offset - step), baseMax + Math.max(0, offset - step)];
  return [baseMin + offset, baseMax + offset];
};

const createWeek = (week: number): ManagedProgramWeek => {
  const phase = phaseFor(week);
  const [pushMin, pushMax] = range(week <= 4 ? 15 : 10, week <= 4 ? 20 : 15, week, 1);
  const [pullMin, pullMax] = range(week <= 4 ? 7 : 6, week <= 4 ? 10 : 9, week, 1);
  const [dipMin, dipMax] = range(week <= 4 ? 8 : 7, week <= 4 ? 12 : 10, week, 1);
  const phaseOne = week <= 4;
  const phaseThree = week >= 9;
  const handstandKey = week <= 2 ? 'pike-hold' : week <= 6 ? 'wall-handstand' : 'chest-to-wall-handstand';
  const handstandRange: [number, number] = week <= 2 ? [20, 30] : week <= 6 ? [20, 35] : [25, 45];
  const lSitKey = week <= 4 ? 'foot-supported-l-sit' : 'tuck-l-sit';
  const pullSkillKey = week <= 4 ? 'arch-active-hang' : week <= 8 ? 'chest-to-bar-pull-up' : 'jumping-muscle-up';
  const pullSkillMetric: ManagedProgressionMetric = 'reps';
  const pushKey = phaseThree ? 'decline-push-up' : 'push-up';
  const lowerKey = phaseOne ? 'bulgarian-split-squat' : 'assisted-pistol-squat';
  const coreKey = week <= 4 ? 'hollow-body-hold' : 'hanging-leg-raise';
  const coreMetric: ManagedProgressionMetric = week <= 4 ? 'duration' : 'reps';
  const dayA = workout('day-a', 'Inversion and push strength', 'היפוך וכוח דחיפה', 0, 'inversion', [
    skill('handstand-foundation', [rx(handstandKey, 3, ...handstandRange, 75, { metric: 'duration', next: handstandKey === 'pike-hold' ? 'wall-handstand' : handstandKey === 'wall-handstand' ? 'chest-to-wall-handstand' : undefined, regress: handstandKey === 'pike-hold' ? undefined : 'pike-hold', techniqueCue: 'Stack the body only as far as you can exit safely.', techniqueCueHe: 'יישרו את הגוף רק עד הטווח שממנו אפשר לצאת בבטחה.', milestoneKeys: ['overhead-support'] })], 'Handstand foundation', 'יסודות עמידת ידיים'),
    section('main-work', 'main_work', 'Push and pull strength', 'כוח דחיפה ומשיכה', [
      rx(pushKey, 3, pushMin, pushMax, 120, { role: 'primary_strength', replacementKeys: pushReplacements, next: phaseThree ? 'weighted-push-up' : 'decline-push-up', regress: 'pause-push-up', tempo: '3-1-1', milestoneKeys: ['push-volume'] }),
      rx('pull-up', 3, pullMin, pullMax, 150, { role: 'primary_strength', replacementKeys: pullReplacements, next: 'weighted-pull-up', regress: 'band-assisted-pull-up', milestoneKeys: ['pulling-volume'] }),
      rx('parallel-bar-dip', 3, dipMin, dipMax, 120, { role: 'secondary_strength', replacementKeys: dipReplacements, next: 'weighted-dip', regress: 'assisted-dip', milestoneKeys: ['dip-strength'] }),
      rx(lowerKey, 3, phaseOne ? 8 : 5, phaseOne ? 12 : 8, 120, { role: 'secondary_strength', perSide: true, replacementKeys: legReplacements, next: phaseOne ? 'assisted-pistol-squat' : 'pistol-squat', regress: 'reverse-lunge', milestoneKeys: ['unilateral-legs'] }),
      rx(coreKey, 3, week <= 4 ? 20 : 8, week <= 4 ? 35 : 12, 75, { metric: coreMetric, role: 'core', replacementKeys: coreMetric === 'reps' ? ['hanging-knee-raise', 'leg-raise'] : undefined, next: coreMetric === 'duration' ? undefined : 'toes-to-bar', milestoneKeys: ['trunk-control'] }),
    ]),
  ], 'Practice inversion while fresh, then build submaximal push and pull strength.', 'תרגלו היפוך כשאתם רעננים, ואז בנו כוח דחיפה ומשיכה תת־מרבי.');
  const dayB = workout('day-b', 'Compression and unilateral strength', 'דחיסה וכוח חד־צדדי', 1, 'mixed', [
    skill('compression-foundation', [rx(lSitKey, 3, week <= 4 ? 8 : 10, week <= 4 ? 15 : 20, 75, { metric: 'duration', next: lSitKey === 'foot-supported-l-sit' ? 'tuck-l-sit' : 'one-leg-l-sit', regress: lSitKey === 'tuck-l-sit' ? 'foot-supported-l-sit' : undefined, milestoneKeys: ['l-sit-compression'], techniqueCue: 'Press tall and end the hold before the shoulders collapse.', techniqueCueHe: 'דחפו את הגוף גבוה וסיימו לפני שהכתפיים קורסות.' })], 'L-Sit compression', 'דחיסה לאל־סיט'),
    section('main-work', 'main_work', 'Legs, horizontal push, and trunk', 'רגליים, דחיפה אופקית וליבה', [
      rx(lowerKey, 3, phaseOne ? 9 : 6, phaseOne ? 12 : 10, 120, { perSide: true, role: 'primary_strength', replacementKeys: legReplacements, next: phaseOne ? 'assisted-pistol-squat' : 'pistol-squat', regress: 'reverse-lunge', milestoneKeys: ['unilateral-legs'] }),
      rx('single-leg-glute-bridge', 3, 10 + phaseScale(week), 15 + phaseScale(week), 75, { perSide: true, role: 'accessory', replacementKeys: ['glute-bridge'] }),
      rx('pike-push-up', 3, phaseOne ? 6 : 8, phaseOne ? 10 : 12, 120, { role: 'secondary_strength', next: 'advanced-pike-push-up', regress: 'push-up', milestoneKeys: ['overhead-support'] }),
      rx('chin-up', 3, Math.max(5, pullMin - 1), Math.max(7, pullMax - 1), 150, { role: 'primary_strength', replacementKeys: pullReplacements, next: 'weighted-chin-up', regress: 'assisted-chin-up' }),
      rx('hanging-knee-raise', 3, 8 + phaseScale(week), 12 + phaseScale(week), 75, { role: 'core', replacementKeys: ['lying-leg-raise', 'leg-raise'], next: 'hanging-leg-raise', regress: 'lying-leg-raise', milestoneKeys: ['l-sit-compression'] }),
      rx('single-leg-calf-raise', 3, 12, 18, 60, { perSide: true, role: 'accessory', replacementKeys: ['calf-raise'] }),
    ]),
  ], 'Build unilateral leg capacity and compression without exhausting the shoulders.', 'בנו יכולת חד־צדדית ברגליים ודחיסה בלי להתיש את הכתפיים.');
  const dayC = workout('day-c', 'Pulling skill and integrated strength', 'מיומנות משיכה וכוח משולב', 2, 'pull', [
    skill('pulling-skill', [
      rx(pullSkillKey, phaseThree ? 4 : 3, phaseThree ? 3 : 5, phaseThree ? 5 : 8, phaseThree ? 120 : 90, { metric: pullSkillMetric, next: phaseThree ? 'band-assisted-muscle-up' : week <= 4 ? 'chest-to-bar-pull-up' : 'jumping-muscle-up', regress: week <= 4 ? 'scapular-pull-up' : 'arch-active-hang', milestoneKeys: ['scapular-control', 'explosive-readiness'], techniqueCue: phaseThree ? 'Use a stable bar and controlled assistance; never chase height with a painful shoulder path.' : 'Move the shoulder blades deliberately without swinging.', techniqueCueHe: phaseThree ? 'השתמשו במוט יציב ובעזרה נשלטת; אל תרדפו אחרי גובה במסלול כתף כואב.' : 'הניעו את השכמות במכוון וללא נדנוד.' }),
      rx('planche-lean', 3, week <= 4 ? 8 : 12, week <= 4 ? 15 : 25, 90, { metric: 'duration', next: 'tuck-planche', milestoneKeys: ['straight-arm-control'], techniqueCue: 'Keep elbows straight and lean only through a pain-free wrist range.', techniqueCueHe: 'שמרו מרפקים ישרים והישענו רק בטווח שורש כף יד שאינו כואב.' }),
    ], 'Straight-arm and pulling preparation', 'הכנת יד ישרה ומשיכה'),
    section('main-work', 'main_work', 'Integrated full-body strength', 'כוח משולב לכל הגוף', [
      rx('pull-up', 3, pullMin, pullMax, 150, { role: 'primary_strength', replacementKeys: pullReplacements, next: 'weighted-pull-up', regress: 'band-assisted-pull-up' }),
      rx('parallel-bar-dip', 3, dipMin, dipMax, 120, { role: 'primary_strength', replacementKeys: dipReplacements, next: 'weighted-dip', regress: 'assisted-dip' }),
      rx(phaseThree ? 'pause-push-up' : 'push-up', 3, Math.max(10, pushMin - 3), Math.max(15, pushMax - 3), 105, { role: 'secondary_strength', replacementKeys: pushReplacements, next: phaseThree ? 'weighted-push-up' : 'decline-push-up', regress: 'push-up' }),
      rx('bulgarian-split-squat', 3, 10, 14, 120, { perSide: true, role: 'primary_strength', replacementKeys: legReplacements, next: 'assisted-pistol-squat', regress: 'reverse-lunge' }),
      rx('hollow-body-hold', 3, 25, 40, 75, { metric: 'duration', role: 'core', milestoneKeys: ['trunk-control'] }),
    ]),
  ], 'Practice straight-arm and explosive foundations before controlled full-body strength.', 'תרגלו יסודות יד ישרה וכוח מתפרץ לפני כוח משולב ומבוקר.');
  return {
    key: `week-${week}`,
    nameEn: `Week ${week}`,
    nameHe: `שבוע ${week}`,
    order: week - 1,
    phaseKey: phase,
    advancementPolicy: 'required_complete',
    goalEn: week % 4 === 0 ? 'Consolidate quality, review readiness, and avoid forced progression.' : 'Build one repeatable step while preserving technique and recovery.',
    goalHe: week % 4 === 0 ? 'גבשו איכות, בדקו מוכנות והימנעו מהתקדמות כפויה.' : 'בנו צעד אחד שניתן לחזור עליו תוך שמירה על טכניקה והתאוששות.',
    rationaleEn: week % 4 === 0 ? 'This is a consolidation week. Match clean work rather than making every exercise harder.' : 'Progress is earned by logged performance, not by the calendar alone.',
    rationaleHe: week % 4 === 0 ? 'זהו שבוע גיבוש. התאימו עבודה נקייה במקום להקשות כל תרגיל.' : 'התקדמות נקבעת לפי ביצועים מתועדים, לא לפי לוח השנה בלבד.',
    workouts: [dayA, dayB, dayC],
  };
};

const milestones: ManagedProgramMilestone[] = [
  ['pulling-volume','Pulling volume','נפח משיכה','Complete three clean sets of 10 Pull-Ups.','השלימו שלושה סטים נקיים של 10 עליות מתח.','base-control',['pull-up'],'reps',10,3],
  ['dip-strength','Dip strength','כוח מקבילים','Complete three clean sets of 12 Parallel Bar Dips.','השלימו שלושה סטים נקיים של 12 מקבילים.','base-control',['parallel-bar-dip'],'reps',12,3],
  ['push-volume','Push volume','נפח דחיפה','Complete three controlled sets of 20 Push-Ups.','השלימו שלושה סטים מבוקרים של 20 שכיבות סמיכה.','base-control',['push-up'],'reps',20,3],
  ['scapular-control','Scapular control','שליטת שכמות','Complete controlled pulling-preparation work without swinging.','השלימו עבודת הכנה למשיכה ללא נדנוד.','base-control',['scapular-pull-up','arch-active-hang'],'reps',10,1],
  ['trunk-control','Trunk control','שליטת ליבה','Hold a clean Hollow Body position for 40 seconds.','החזיקו הולו בודי נקי במשך 40 שניות.','base-control',['hollow-body-hold'],'duration',40,1],
  ['overhead-support','Overhead support','תמיכה מעל הראש','Accumulate a controlled 40-second inverted support hold.','צברו החזקת תמיכה הפוכה מבוקרת של 40 שניות.','skill-strength',['wall-handstand','chest-to-wall-handstand'],'duration',40,1],
  ['l-sit-compression','L-Sit compression','דחיסה לאל־סיט','Hold a Tuck L-Sit for 20 controlled seconds.','החזיקו טאק אל־סיט מבוקר במשך 20 שניות.','skill-strength',['tuck-l-sit'],'duration',20,1],
  ['unilateral-legs','Unilateral legs','רגליים חד־צדדיות','Complete three sets of eight controlled Assisted Pistol Squats per side.','השלימו שלושה סטים של שמונה פיסטול סקוואט מסייעים לכל צד.','skill-strength',['assisted-pistol-squat'],'reps',8,3],
  ['straight-arm-control','Straight-arm control','שליטת יד ישרה','Hold a pain-free Planche Lean for 20 seconds.','החזיקו פלנץ׳ לין ללא כאב במשך 20 שניות.','integration-consolidation',['planche-lean'],'duration',20,1],
  ['explosive-readiness','Explosive pull readiness','מוכנות למשיכה מתפרצת','Complete five controlled assisted transition repetitions.','השלימו חמש חזרות מעבר מסייעות ומבוקרות.','integration-consolidation',['jumping-muscle-up','band-assisted-muscle-up'],'reps',5,1],
].map(([key,nameEn,nameHe,descriptionEn,descriptionHe,phaseKey,exerciseKeys,metric,threshold,setsRequired]) => ({
  key: key as string, nameEn: nameEn as string, nameHe: nameHe as string,
  descriptionEn: descriptionEn as string, descriptionHe: descriptionHe as string,
  phaseKey: phaseKey as string, exerciseKeys: exerciseKeys as string[], metric: metric as ManagedProgressionMetric,
  threshold: threshold as number, setsRequired: setsRequired as number,
  userExplanationEn: descriptionEn as string, userExplanationHe: descriptionHe as string,
}));

export const beginnerFoundation12Week: ManagedProgramDefinition = {
  schemaVersion: 1,
  key: 'beginner-foundation-12-week',
  version: 1,
  nameEn: '12-Week Beginner Foundation',
  nameHe: 'תוכנית יסודות למתחילים – 12 שבועות',
  shortDescriptionEn: 'A performance-led foundation for strong beginners pursuing Handstand, L-Sit, Muscle-Up, Front Lever, and Planche.',
  shortDescriptionHe: 'בסיס מונחה־ביצועים למתחילים חזקים בדרך לעמידת ידיים, אל־סיט, מאסל־אפ, פרונט לבר ופלנץ׳.',
  descriptionEn: 'Three purposeful sessions each week combine early Skill practice, submaximal strength, unilateral legs, and trunk control. Calendar weeks organize exposure; logged set quality decides whether to progress, maintain, or regress.',
  descriptionHe: 'שלושה אימונים מכוונים בכל שבוע משלבים תרגול מיומנות מוקדם, כוח תת־מרבי, רגליים חד־צדדיות ושליטת ליבה. השבועות מארגנים את החשיפה; איכות הסטים המתועדת קובעת אם להתקדם, לשמר או להקל.',
  difficulty: 'beginner', goals: ['strength','hypertrophy','endurance','skill'], durationWeeks: 12, sessionsPerWeek: 3,
  estimatedMinutesMin: 60, estimatedMinutesMax: 75,
  equipment: ['Floor space','Stable pull-up bar','Parallel bars or stable support','Stable wall','Optional resistance band','Optional load for readiness-gated weighted work'],
  tags: ['performance-based','three-days','skill-foundation','strength','hypertrophy'],
  targetAudienceEn: 'Beginners to advanced calisthenics Skills who already have a useful base of Push-Ups, Pull-Ups, Dips, and bodyweight training.',
  targetAudienceHe: 'מתחילים במיומנויות קליסטניקס מתקדמות שכבר מחזיקים בסיס שימושי בשכיבות סמיכה, מתח, מקבילים ואימוני משקל גוף.',
  prerequisitesEn: 'Use secure equipment and a safe inversion area. Technique takes priority over repetitions. Pain is a reason to stop or replace—not a progression signal. Weighted work is optional and readiness-gated.',
  prerequisitesHe: 'השתמשו בציוד יציב ובסביבה בטוחה להיפוכים. טכניקה קודמת לחזרות. כאב הוא סיבה לעצור או להחליף—לא סימן להתקדמות. עבודה עם משקל היא אופציונלית ומותנית במוכנות.',
  progressionPhilosophyEn: 'Start inside the range. Reach the top across every set with clean technique and about 1–2 RIR on two exposures before changing one variable. Repeat or regress when minimums are repeatedly missed. Never add load because a week number changed.',
  progressionPhilosophyHe: 'התחילו בתוך הטווח. הגיעו לקצה העליון בכל הסטים, בטכניקה נקייה וכ־1–2 חזרות ברזרבה בשתי חשיפות לפני שינוי משתנה אחד. חזרו או הקלו כאשר יעד המינימום מוחמץ שוב ושוב. אין להוסיף משקל רק בגלל שמספר השבוע השתנה.',
  recoveryGuidanceEn: 'Train on any three suitably spaced days. Avoid making every set a failure test; repeat a week whenever recovery or control is inconsistent.',
  recoveryGuidanceHe: 'התאמנו בכל שלושה ימים עם מרווח התאוששות מתאים. אל תהפכו כל סט למבחן כשל; חזרו על שבוע כאשר ההתאוששות או השליטה אינן עקביות.',
  featured: true, sortOrder: 5, icon: 'foundation',
  phases: [
    { key:'base-control', nameEn:'Base Control', nameHe:'שליטה בסיסית', order:0, descriptionEn:'Weeks 1–4 establish submaximal strength, scapular control, straight-arm tolerance, Handstand and L-Sit foundations, and unilateral leg baselines.', descriptionHe:'שבועות 1–4 מבססים כוח תת־מרבי, שליטת שכמות, סבילות יד ישרה, יסודות עמידת ידיים ואל־סיט ובסיס חד־צדדי לרגליים.' },
    { key:'skill-strength', nameEn:'Skill and Strength', nameHe:'מיומנות וכוח', order:1, descriptionEn:'Weeks 5–8 raise technical complexity and unilateral demand while introducing controlled explosive-pull preparation.', descriptionHe:'שבועות 5–8 מעלים את המורכבות הטכנית והעומס החד־צדדי ומציגים הכנה מבוקרת למשיכה מתפרצת.' },
    { key:'integration-consolidation', nameEn:'Integration and Consolidation', nameHe:'שילוב וגיבוש', order:2, descriptionEn:'Weeks 9–12 integrate specific Skill preparation, readiness-gated harder variations, and a final review rather than a forced peak.', descriptionHe:'שבועות 9–12 משלבים הכנה ייעודית למיומנויות, וריאציות קשות לפי מוכנות וסקירה מסכמת במקום שיא כפוי.' },
  ],
  weeks: Array.from({ length: 12 }, (_, index) => createWeek(index + 1)),
  milestones,
};
