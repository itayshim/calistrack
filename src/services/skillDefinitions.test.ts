import { describe, expect, it } from 'vitest';
import { frontLeverSkill } from '../features/skills/frontLever';
import { exportSkillDocument, importSkillDocument, SKILL_DOCUMENT_SCHEMA_VERSION } from './skillDefinitions';

describe('managed Skill documents', () => {
  it('exports a versioned definition without user data', () => {
    const value = JSON.parse(exportSkillDocument(frontLeverSkill));
    expect(value.schemaVersion).toBe(SKILL_DOCUMENT_SCHEMA_VERSION);
    expect(value.definition.key).toBe('front-lever');
    expect(value.progress).toBeUndefined();
  });
  it('imports only the supported declarative schema', () => {
    expect(importSkillDocument(exportSkillDocument(frontLeverSkill)).key).toBe('front-lever');
    expect(() => importSkillDocument('{"schemaVersion":99,"definition":{}}')).toThrow('invalid_skill_import');
  });
});
