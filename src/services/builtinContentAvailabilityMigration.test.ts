import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608080002_builtin_content_availability.sql?raw';

describe('built-in availability database contract', () => {
  it('persists generic stable-key availability without a fake Program UUID', () => {
    expect(sql).toContain('create table public.builtin_content_states');
    expect(sql).toContain('primary key (content_type, builtin_key)');
    expect(sql).toContain("content_type in ('managed_program', 'skill')");
    expect(sql).toContain("availability in ('published', 'unpublished', 'archived')");
    expect(sql).not.toContain('builtin_id uuid');
  });

  it('keeps writes Admin-only and public reads limited to state metadata', () => {
    expect(sql).toContain('if not public.is_admin()');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('grant select on public.builtin_content_states to anon, authenticated');
    expect(sql).toContain('revoke insert, update, delete');
    expect(sql).toContain('grant execute on function public.set_builtin_content_availability');
  });

  it('hides published overrides when their built-in identity is unavailable while retaining owner access', () => {
    expect(sql).toContain("state.availability <> 'published'");
    expect(sql).toContain('public.owns_managed_program_enrollment(id)');
    expect(sql).toContain('public.owns_managed_program_enrollment(program_id, version)');
  });

  it('does not mutate versions, enrollments, sessions, or source definitions', () => {
    expect(sql).not.toMatch(/update public\.managed_program_versions/i);
    expect(sql).not.toMatch(/delete\s+from/i);
    expect(sql).not.toContain('workout_sessions');
  });
});
