import { afterEach, describe, expect, it } from 'vitest';
import { frontLeverSkill } from './skills/frontLever';
import { builtInSkillRegistry, getSkillDefinition, installManagedSkillRecords } from './skills/registry';
import { beginnerCalisthenics12Week } from './programs/beginnerCalisthenics12Week';
import { getManagedProgram, installManagedPrograms } from '../services/managedPrograms';
import type { ManagedSkillRecord } from '../services/skillDefinitions';
import type { ManagedProgramRecord } from '../services/managedPrograms';

const now = '2026-08-04T00:00:00.000Z';
const skillOverride = (status: ManagedSkillRecord['status'] = 'published'): ManagedSkillRecord => ({
  id: 'skill-override', stableKey: frontLeverSkill.key, source: 'builtin_override', status,
  draftVersion: 2, publishedVersion: status === 'published' ? 2 : null,
  definition: { ...structuredClone(frontLeverSkill), nameEn: 'Managed Front Lever' }, validation: null,
  updatedAt: now, builtinKey: frontLeverSkill.key, basedOnBuiltinHash: 'hash',
});
const programOverride = (status: ManagedProgramRecord['status'] = 'published'): ManagedProgramRecord => ({
  id: 'program-override', stableKey: beginnerCalisthenics12Week.key, source: 'builtin_override', status,
  draftVersion: 2, publishedVersion: status === 'published' ? 2 : null,
  definition: { ...structuredClone(beginnerCalisthenics12Week), version: 2, nameEn: 'Managed Beginner Program' }, validation: null,
  updatedAt: now, builtinKey: beginnerCalisthenics12Week.key, basedOnBuiltinHash: 'hash',
});

describe('built-in managed override resolution', () => {
  afterEach(() => { installManagedSkillRecords([]); installManagedPrograms([]); });
  it('uses one published Skill override without mutating the source definition', () => {
    const original = structuredClone(frontLeverSkill);
    installManagedSkillRecords([skillOverride()]);
    expect(getSkillDefinition(frontLeverSkill.key)?.nameEn).toBe('Managed Front Lever');
    expect(builtInSkillRegistry.filter((item) => item.key === frontLeverSkill.key)).toHaveLength(1);
    expect(frontLeverSkill).toEqual(original);
  });
  it('rejects accidental Skill shadowing and falls back for archived overrides', () => {
    installManagedSkillRecords([{ ...skillOverride(), source: 'admin-created' }]);
    expect(getSkillDefinition(frontLeverSkill.key)).toBe(frontLeverSkill);
    installManagedSkillRecords([skillOverride('archived')]);
    expect(getSkillDefinition(frontLeverSkill.key)).toBe(frontLeverSkill);
  });
  it('uses one published Program override and restores the built-in fallback when archived', () => {
    installManagedPrograms([programOverride()]);
    expect(getManagedProgram(beginnerCalisthenics12Week.key)?.definition.nameEn).toBe('Managed Beginner Program');
    installManagedPrograms([programOverride('archived')]);
    expect(getManagedProgram(beginnerCalisthenics12Week.key)?.definition).toBe(beginnerCalisthenics12Week);
  });
  it('falls back to the built-in Program while an override is unpublished', () => {
    installManagedPrograms([programOverride('unpublished')]);
    expect(getManagedProgram(beginnerCalisthenics12Week.key)?.definition).toBe(beginnerCalisthenics12Week);
  });
  it('does not permit custom backend content to shadow a built-in Program key', () => {
    installManagedPrograms([{ ...programOverride(), source: 'admin-created', builtinKey: undefined }]);
    expect(getManagedProgram(beginnerCalisthenics12Week.key)?.definition).toBe(beginnerCalisthenics12Week);
  });
});
