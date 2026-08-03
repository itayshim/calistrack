import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608030001_skill_builder.sql?raw';
describe('Skill Builder migration', () => {
  it('protects drafts and publishes immutable version snapshots through admin RPCs', () => {
    expect(sql).toContain('public.is_admin()');
    expect(sql).toContain("lifecycle = 'published'");
    expect(sql).toContain('published stable key is immutable');
    expect(sql).toContain('skill has blocking validation errors');
  });
});
