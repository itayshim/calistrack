import type { SkillDefinition, SkillPrescription } from './skillEngine';
import { createSkillAssessment, createSkillWorkout, validateSkillContent } from './skillEngine';
import type { Exercise } from '../../types';

export const HANDSTAND_PUSH_UP_SKILL_KEY = 'handstand-push-up' as const;
export const HANDSTAND_PUSH_UP_TEMPLATE_VERSION = 1;
const reps = (exerciseKey: string, sets: number, target: number, role: string): SkillPrescription => ({ exerciseKey, sets, target, measurementType: 'reps', role, restSeconds: 90 });
const hold = (exerciseKey: string, sets: number, target: number, role: string): SkillPrescription => ({ exerciseKey, sets, target, measurementType: 'duration', role, restSeconds: 90 });
const level = (key: string, number: number, nameEn: string, nameHe: string, work: SkillPrescription[], assessmentTarget: number) => ({ key, number, nameEn, nameHe, work, assessment: { exerciseKey: work[0].exerciseKey, target: assessmentTarget, measurementType: 'reps' as const, techniqueRequired: true }, performance: { exerciseKey: work[0].exerciseKey, metric: 'reps' as const } });

export const handstandPushUpSkill: SkillDefinition = {
  key: HANDSTAND_PUSH_UP_SKILL_KEY, templateVersion: HANDSTAND_PUSH_UP_TEMPLATE_VERSION,
  nameEn: 'Handstand Push-Up', nameHe: 'שכיבת סמיכה בעמידת ידיים',
  descriptionEn: 'Build inverted pressing strength through five structured, technique-focused progressions.',
  descriptionHe: 'בניית כוח דחיפה הפוך דרך חמישה שלבים מובנים עם דגש על שליטה וטכניקה.',
  techniquePromptEn: 'How was your technique on the main Handstand Push-Up progression?',
  techniquePromptHe: 'איך הייתה הטכניקה בתרגיל המרכזי של שכיבת הסמיכה בעמידת ידיים?',
  warmup: [
    { exerciseKey: 'jumping-jacks', guidanceEn: '20 reps', guidanceHe: '20 חזרות' },
    { exerciseKey: 'wrist-rolls', guidanceEn: '10 each side', guidanceHe: '10 לכל צד' },
    { exerciseKey: 'elbow-circles', guidanceEn: '10 each side and direction', guidanceHe: '10 לכל צד ולכל כיוון' },
    { exerciseKey: 'arm-circles', guidanceEn: '10 each side and direction', guidanceHe: '10 לכל צד ולכל כיוון' },
    { exerciseKey: 'downward-dog', guidanceEn: '20 seconds', guidanceHe: '20 שניות', durationSeconds: 20 },
  ],
  levels: [
    level('pike-push-up', 1, 'Pike Push-Up', 'שכיבת סמיכה פייק', [reps('pike-push-up',3,4,'primary-progression-strength'), reps('hindu-push-up',3,6,'pushing-strength-accessory'), hold('headstand',3,10,'inversion-control'), hold('wall-handstand',3,10,'handstand-control')], 10),
    level('advanced-pike-push-up', 2, 'Advanced Pike Push-Up', 'שכיבת סמיכה פייק מתקדמת', [reps('advanced-pike-push-up',3,3,'primary-progression-strength'), hold('wall-handstand',3,15,'handstand-control'), reps('pike-push-up',3,10,'secondary-progression-strength'), hold('headstand',3,15,'inversion-control')], 10),
    level('wall-handstand-push-up', 3, 'Wall Handstand Push-Up', 'שכיבת סמיכה בעמידת ידיים על קיר', [reps('wall-handstand-push-up',3,3,'primary-progression-strength'), hold('handstand',3,10,'handstand-control'), reps('advanced-pike-push-up',3,4,'secondary-progression-strength'), hold('frog-stand',3,12,'balance-accessory')], 6),
    level('negative-handstand-push-up', 4, 'Negative Handstand Push-Up', 'שכיבת סמיכה שלילית בעמידת ידיים', [reps('negative-handstand-push-up',3,3,'primary-progression-strength'), reps('wall-handstand-push-up',3,5,'secondary-progression-strength'), hold('handstand',3,20,'handstand-control'), reps('advanced-pike-push-up',3,10,'pushing-strength-accessory')], 6),
    level('handstand-push-up', 5, 'Handstand Push-Up', 'שכיבת סמיכה בעמידת ידיים', [reps('handstand-push-up',3,2,'primary-progression-strength'), reps('wall-handstand-push-up',3,6,'secondary-progression-strength'), hold('handstand',3,30,'handstand-control'), reps('advanced-pike-push-up',3,12,'pushing-strength-accessory')], 5),
  ],
};

export const createHandstandPushUpWorkout = (levelKey: string, exercises: Exercise[], includeWarmup: boolean, programId = 'skill-training', preview = false) => createSkillWorkout(handstandPushUpSkill, levelKey, exercises, includeWarmup, programId, preview);
export const createHandstandPushUpAssessment = (levelKey: string, exercises: Exercise[]) => createSkillAssessment(handstandPushUpSkill, levelKey, exercises);
export const validateHandstandPushUpContent = (exercises: Exercise[], levelKey?: string) => validateSkillContent(handstandPushUpSkill, exercises, levelKey);
