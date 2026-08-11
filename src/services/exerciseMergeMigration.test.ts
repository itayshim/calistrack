import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/202608120001_exercise_merges.sql?raw';

describe('Exercise merge SQL contract', () => {
  it('provides immutable audit and active canonical redirect records', () => {
    expect(sql).toContain('create table public.exercise_merge_audits');
    expect(sql).toContain('create table public.exercise_merge_redirects');
    expect(sql).toContain('source_exercise_id uuid');
    expect(sql).toContain('source_stable_key text');
    expect(sql).toContain('source_runtime_id text');
    expect(sql).toContain('target_runtime_id text');
    expect(sql).toContain('exercise_merge_one_active_source');
  });

  it('keeps preview stable and mutation Admin-only', () => {
    expect(sql).toContain('function public.exercise_merge_preview');
    expect(sql).toContain('stable security definer');
    expect(sql).toContain('function public.merge_exercises');
    expect(sql.match(/if not public\.is_admin\(\)/g)).toHaveLength(2);
    expect(sql).toContain("message='administrator_required'");
  });

  it('blocks self, measurement, family and cyclic merges', () => {
    expect(sql).toContain('"self_merge"');
    expect(sql).toContain('"measurement_mismatch"');
    expect(sql).toContain('"movement_family_mismatch"');
    expect(sql).toContain('"merge_cycle"');
    expect(sql).toContain('with recursive chain');
  });

  it('retires without deleting source, history, immutable definitions, media, or visuals', () => {
    expect(sql).toContain('set is_published=false');
    expect(sql).not.toMatch(/delete\s+from\s+public\.global_exercises/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.exercise_media/i);
    expect(sql).not.toMatch(/update\s+public\.managed_program_versions/i);
    expect(sql).not.toMatch(/update\s+public\.skill_versions/i);
    expect(sql).not.toMatch(/delete\s+from\s+storage\.objects/i);
  });
});
