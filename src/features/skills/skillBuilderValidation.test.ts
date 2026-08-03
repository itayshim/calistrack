import { describe, expect, it } from 'vitest';
import { createInitialData } from '../../data/seed';
import { frontLeverSkill } from './frontLever';
import { validateSkillContent } from './skillEngine';
import { getSkillDefinition, installManagedSkillDefinitions } from './registry';

describe('generic Skill Builder validation and resolution', () => {
  const exercises = createInitialData().exercises;
  it('blocks invalid keys, translations, levels, and exact missing references', () => {
    const definition = structuredClone(frontLeverSkill);
    definition.key = 'Bad key';
    definition.nameHe = '';
    definition.levels[0].work[0].exerciseKey = 'missing-exercise';
    const result = validateSkillContent(definition, exercises);
    expect(result.valid).toBe(false);
    expect(result.blockingErrors.map((issue) => issue.code)).toEqual(expect.arrayContaining(['invalid_skill_key', 'missing_skill_translation', 'missing_exercise']));
  });
  it('rejects a measurement-incompatible explicit replacement', () => {
    const definition = structuredClone(frontLeverSkill);
    definition.metadata = { replacements: [{ exerciseKey: 'pull-up', replacementExerciseKey: 'tuck-front-lever', requireSameMeasurementType: true, targetMode: 'same' }] };
    expect(validateSkillContent(definition, exercises).blockingErrors.some((issue) => issue.code === 'replacement_measurement_mismatch')).toBe(true);
  });
  it('merges managed definitions without shadowing built-ins', () => {
    const managed = structuredClone(frontLeverSkill);
    managed.key = 'managed-skill'; managed.nameEn = 'Managed Skill';
    installManagedSkillDefinitions([structuredClone(frontLeverSkill), managed]);
    expect(getSkillDefinition('front-lever')).toBe(frontLeverSkill);
    expect(getSkillDefinition('managed-skill')?.nameEn).toBe('Managed Skill');
  });
});
