import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608080003_exercise_visuals.sql?raw';
describe('Exercise Visual migration contract', () => {
  it('keeps visuals separate from demonstration media and keyed by stable identity', () => {
    expect(sql).toContain('create table public.exercise_visuals');
    expect(sql).toContain('stable_key text primary key');
    expect(sql).not.toContain('alter table public.exercise_media add');
  });
  it('enforces Admin writes, public reads, safe paths and format limits', () => {
    expect(sql).toContain("public.is_admin()");
    expect(sql).toContain("bucket_id = 'exercise-visuals'");
    expect(sql).toContain("image/svg+xml");
    expect(sql).toContain('file_size_bytes <= 204800');
    expect(sql).toContain('security definer');
  });
  it('does not grant direct table mutation to normal clients', () => {
    expect(sql).toContain('grant select on public.exercise_visuals to anon, authenticated');
    expect(sql).not.toMatch(/grant (insert|update|delete).*exercise_visuals/i);
  });
});
