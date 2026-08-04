import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608040001_managed_program_builder.sql?raw';
describe('managed Program backend contract', () => {
  it('creates separate versioned Program and enrollment tables with RLS', () => {
    expect(sql).toContain('create table public.managed_programs');
    expect(sql).toContain('create table public.managed_program_versions');
    expect(sql).toContain('create table public.managed_program_enrollments');
    expect(sql.match(/enable row level security/g)).toHaveLength(3);
  });
  it('makes published versions immutable through one draft/published indexes and draft-only update policy', () => {
    expect(sql).toContain('managed_program_one_draft');
    expect(sql).toContain('managed_program_one_published');
    expect(sql).toContain("lifecycle='draft'");
    expect(sql).toContain('published stable key is immutable');
  });
  it('keeps the current publication visible while a newer draft is edited', () =>
    expect(sql).toContain(
      "status=case when published_version is null then 'draft' else status end",
    ));
  it('keeps an enrolled historical version readable after archive', () =>
    expect(sql).toContain('public.owns_managed_program_enrollment(program_id,version)'));
  it('limits catalogue reads to published content and enrollment reads to owners', () => {
    expect(sql).toContain("status='published' or public.is_admin()");
    expect(sql).toContain('user_id=auth.uid()');
  });
  it('gates publishing on stored validation', () =>
    expect(sql).toContain('managed program has blocking validation errors'));
});
