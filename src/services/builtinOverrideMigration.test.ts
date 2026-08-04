import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608040002_builtin_content_overrides.sql?raw';

describe('built-in content override backend contract', () => {
  it('adds explicit override identity and one override per built-in key', () => {
    expect(sql).toContain("'builtin_override'");
    expect(sql).toContain('based_on_builtin_hash');
    expect(sql).toContain('skills_one_builtin_override');
    expect(sql).toContain('managed_programs_one_builtin_override');
  });
  it('keeps mutations administrator-only and makes override keys immutable', () => {
    expect(sql).toContain('if not public.is_admin()');
    expect(sql).toContain('built-in override key is immutable');
    expect(sql).toContain("source in ('admin-created','builtin_override')");
  });
});
