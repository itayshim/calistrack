import type { Exercise } from '../../types';
import type { SkillDefinition, SkillLevelDefinition, SkillPrescription, SkillWarmupPrescription } from './skillEngine';
import { createSkillAssessment, createSkillWorkout, evaluateSkillSession, resolveSkillExercise, skillSessionDetails, validateSkillContent } from './skillEngine';

export const FRONT_LEVER_SKILL_KEY = 'front-lever' as const;
export const FRONT_LEVER_TEMPLATE_VERSION = 2;
const hold = (exerciseKey: string, sets: number, target: number, role = 'primary-skill'): SkillPrescription => ({ exerciseKey, sets, target, measurementType: 'duration', role, restSeconds: 90 });
const reps = (exerciseKey: string, sets: number, target: number, role: string): SkillPrescription => ({ exerciseKey, sets, target, measurementType: 'reps', role, restSeconds: 90 });
const level = (key: string, number: number, nameEn: string, nameHe: string, assessmentSeconds: number, work: SkillPrescription[], sideMode?: 'left-right'): SkillLevelDefinition & { assessmentSeconds: number } => ({ key, number, nameEn, nameHe, assessmentSeconds, work, assessment: { exerciseKey: work[0].exerciseKey, target: assessmentSeconds, measurementType: 'duration', techniqueRequired: true }, performance: { exerciseKey: work[0].exerciseKey, metric: work[0].measurementType, sideMode } });

export const frontLeverLevels = [
  level('tuck',1,'Tuck Front Lever','פרונט לבר טאק',20,[hold('tuck-front-lever',3,6),reps('tuck-front-lever-raise',3,5,'secondary-skill'),reps('pull-up',3,6,'pulling-strength'),reps('leg-raise',3,10,'core-strength')]),
  level('advanced-tuck',2,'Advanced Tuck','טאק מתקדם',20,[hold('advanced-tuck-front-lever',3,8),hold('tuck-front-lever',3,20,'secondary-skill'),reps('tuck-front-lever-raise',3,6,'pulling-strength'),reps('toes-to-bar',3,10,'core-strength')]),
  level('one-leg',3,'One-Leg Front Lever','פרונט לבר רגל אחת',15,[hold('one-leg-front-lever',3,8),hold('advanced-tuck-front-lever',3,10,'secondary-skill'),reps('advanced-tuck-front-lever-raise',3,3,'pulling-strength'),reps('toes-to-bar',3,10,'core-strength')],'left-right'),
  level('half',4,'Half Front Lever','חצי פרונט לבר',15,[hold('half-front-lever',3,8),hold('advanced-tuck-front-lever',3,15,'secondary-skill'),reps('ice-cream-maker',3,5,'pulling-strength'),reps('toes-to-bar',3,10,'core-strength')]),
  level('straddle',5,'Straddle Front Lever','פרונט לבר סטראדל',15,[hold('straddle-front-lever',3,5),hold('one-leg-front-lever',3,15,'secondary-skill'),reps('ice-cream-maker',3,8,'pulling-strength'),reps('dragon-flag',1,6,'core-strength')]),
  level('full',6,'Full Front Lever','פרונט לבר מלא',12,[hold('front-lever',3,3),hold('straddle-front-lever',3,10,'secondary-skill'),reps('ice-cream-maker',3,5,'pulling-strength'),reps('dragon-flag',1,8,'core-strength')]),
];
export const frontLeverWarmup: SkillWarmupPrescription[] = [
  { exerciseKey:'jumping-jacks',guidanceEn:'20 reps',guidanceHe:'20 חזרות' }, { exerciseKey:'wrist-rolls',guidanceEn:'10 each side',guidanceHe:'10 לכל צד' }, { exerciseKey:'elbow-circles',guidanceEn:'10 each direction',guidanceHe:'10 לכל כיוון' }, { exerciseKey:'arm-circles',guidanceEn:'10 each direction',guidanceHe:'10 לכל כיוון' }, { exerciseKey:'arch-active-hang',guidanceEn:'4 reps',guidanceHe:'4 חזרות' }, { exerciseKey:'active-bar-hang',guidanceEn:'15–20 seconds',guidanceHe:'15–20 שניות' },
];
export const frontLeverSkill: SkillDefinition = { key: FRONT_LEVER_SKILL_KEY, templateVersion: FRONT_LEVER_TEMPLATE_VERSION, nameEn:'Front Lever', nameHe:'פרונט לבר', descriptionEn:'Build straight-arm pulling strength through six focused progressions.', descriptionHe:'בניית כוח משיכה בידיים ישרות דרך שישה שלבים ממוקדים.', techniquePromptEn:'How was your technique on the main Front Lever progression?', techniquePromptHe:'איך הייתה הטכניקה בתרגיל המרכזי של הפרונט לבר?', levels: frontLeverLevels, warmup: frontLeverWarmup };

export const createFrontLeverWorkout = (levelKey:string, exercises:Exercise[], includeWarmup:boolean, programId='skill-training', preview=false) => createSkillWorkout(frontLeverSkill,levelKey,exercises,includeWarmup,programId,preview);
export const createFrontLeverAssessment = (levelKey:string, exercises:Exercise[]) => createSkillAssessment(frontLeverSkill,levelKey,exercises);
export const validateFrontLeverContent = (exercises:Exercise[], levelKey?:string) => validateSkillContent(frontLeverSkill,exercises,levelKey);
export const nextFrontLeverLevel = (levelKey:string) => frontLeverLevels[frontLeverLevels.findIndex((item)=>item.key===levelKey)+1];
export { evaluateSkillSession, resolveSkillExercise, skillSessionDetails };
export type { SkillValidationIssue, SkillValidationResult } from './skillEngine';
export type FrontLeverPrescription = SkillPrescription;
export type FrontLeverWarmupPrescription = SkillWarmupPrescription;
export type FrontLeverLevel = (typeof frontLeverLevels)[number];
