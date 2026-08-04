import type { Exercise } from '../../types';
import { frontLeverSkill } from './frontLever';
import { handstandPushUpSkill } from './handstandPushUp';
import { handstandSkill } from './handstand';
import { createSkillAssessment, createSkillWorkout, validateSkillContent } from './skillEngine';
import type { SkillDefinition } from './skillEngine';
import type { ManagedSkillRecord } from '../../services/skillDefinitions';

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
export const installManagedSkillRecords = (records: ManagedSkillRecord[]) => {
  const effective = new Map(builtInSkills.map((skill) => [skill.key, skill]));
  const custom = new Map<string, SkillDefinition>();
  records.forEach((record) => {
    if (record.status !== 'published' || record.definition.key !== record.stableKey) return;
    if (effective.has(record.stableKey)) {
      if (record.source === 'builtin_override' && record.builtinKey === record.stableKey) {
        effective.set(record.stableKey, record.definition);
      }
      return;
    }
    if (record.source === 'admin-created' && !custom.has(record.stableKey)) custom.set(record.stableKey, record.definition);
  });
  skillRegistry.splice(0, skillRegistry.length, ...builtInSkills.map((skill) => effective.get(skill.key)!), ...custom.values());
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    skillRegistry.forEach((skill) => console.info('[content_resolution]', { kind: 'skill', key: skill.key, state: builtInSkills.some((item) => item.key === skill.key) ? (skill === builtInSkills.find((item) => item.key === skill.key) ? 'builtin' : 'managed_override') : 'backend_custom' }));
  }
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
