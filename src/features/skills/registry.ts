import type { Exercise } from '../../types';
import { frontLeverSkill } from './frontLever';
import { handstandPushUpSkill } from './handstandPushUp';
import { handstandSkill } from './handstand';
import { createSkillAssessment, createSkillWorkout, validateSkillContent } from './skillEngine';
import type { SkillDefinition } from './skillEngine';

const builtInSkills: SkillDefinition[] = [frontLeverSkill, handstandPushUpSkill, handstandSkill];
export const builtInSkillRegistry: readonly SkillDefinition[] = builtInSkills;
const managedSkills: SkillDefinition[] = [];
export const skillRegistry: SkillDefinition[] = [...builtInSkills];
export const installManagedSkillDefinitions = (definitions: SkillDefinition[]) => {
  managedSkills.splice(
    0,
    managedSkills.length,
    ...definitions.filter(
      (candidate) => !builtInSkills.some((builtIn) => builtIn.key === candidate.key),
    ),
  );
  skillRegistry.splice(0, skillRegistry.length, ...builtInSkills, ...managedSkills);
};
export const getSkillDefinition = (skillKey: string) =>
  skillRegistry.find((skill) => skill.key === skillKey);
export const getDefaultSkillProgress = (skillKey: string) => {
  const skill = getSkillDefinition(skillKey);
  if (!skill) throw new Error(`Unknown skill: ${skillKey}`);
  const first = skill.levels[0].key;
  return {
    skillKey,
    activeLevelKey: first,
    unlockedLevelKeys: [first],
    masteredLevelKeys: [],
    completedWorkoutSessionIds: [],
    assessments: [],
  };
};
export const getNextSkillLevel = (skillKey: string, levelKey: string) => {
  const levels = getSkillDefinition(skillKey)?.levels ?? [];
  return levels[levels.findIndex((level) => level.key === levelKey) + 1];
};
export const createRegisteredSkillWorkout = (
  skillKey: string,
  levelKey: string,
  exercises: Exercise[],
  includeWarmup: boolean,
  programId = 'skill-training',
  preview = false,
) => {
  const skill = getSkillDefinition(skillKey);
  if (!skill) throw new Error(`Unknown skill: ${skillKey}`);
  return createSkillWorkout(skill, levelKey, exercises, includeWarmup, programId, preview);
};
export const createRegisteredSkillAssessment = (
  skillKey: string,
  levelKey: string,
  exercises: Exercise[],
) => {
  const skill = getSkillDefinition(skillKey);
  if (!skill) throw new Error(`Unknown skill: ${skillKey}`);
  return createSkillAssessment(skill, levelKey, exercises);
};
export const validateRegisteredSkill = (
  skillKey: string,
  exercises: Exercise[],
  levelKey?: string,
) => {
  const skill = getSkillDefinition(skillKey);
  if (!skill)
    return {
      valid: false,
      warnings: [],
      blockingErrors: [{ code: 'unknown_skill', message: `Unknown skill ${skillKey}.` }],
    };
  return validateSkillContent(skill, exercises, levelKey);
};
