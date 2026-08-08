import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608080001_managed_program_lifecycle_contract.sql?raw';

describe('Managed Program lifecycle SQL contract', () => {
  it('keeps the UUID/text RPC contract and explicit domain targets', () => {
    expect(sql).toContain('p_program_id uuid');
    expect(sql).toContain('p_status text');
    expect(sql).toContain("p_status not in ('unpublished', 'archived')");
    expect(sql).toContain("errcode = '22023'");
  });

  it('permits only valid state transitions and mutable sources', () => {
    expect(sql).toContain("current_source not in ('admin-created', 'builtin_override')");
    expect(sql).toContain("p_status = 'unpublished' and current_status <> 'published'");
    expect(sql).toContain("current_status not in ('draft', 'published', 'unpublished')");
    expect(sql).toContain('for update');
  });

  it('retains the authenticated grant after replacing the function', () => {
    expect(sql).toContain('revoke all on function public.set_managed_program_lifecycle(uuid, text) from public');
    expect(sql).toContain('grant execute on function public.set_managed_program_lifecycle(uuid, text) to authenticated');
  });

  it('does not rewrite immutable versions, enrollments, or workout history', () => {
    expect(sql).not.toContain('update public.managed_program_versions');
    expect(sql).not.toContain('managed_program_enrollments');
    expect(sql).not.toContain('workout_sessions');
    expect(sql).not.toMatch(/delete\s+from/i);
  });
});
