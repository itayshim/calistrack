import { describe, expect, it } from 'vitest';
import { deriveExerciseTaxonomy } from './exerciseTaxonomy';
import migration from '../../supabase/migrations/202607180001_exercise_taxonomy.sql?raw';

describe('global exercise taxonomy', () => {
  it('merges catalogue and stored taxonomy values without normalized duplicates', () => {
    const result = deriveExerciseTaxonomy(
      [{
        category: 'pull',
        movement_family: 'Pull-Up',
        muscles: ['lat', 'biceps'],
        keywords: ['Vertical Pull'],
      }],
      [
        { kind: 'category', value: 'Full Body' },
        { kind: 'category', value: 'full_body' },
        { kind: 'movement_family', value: 'Ring Support' },
      ],
    );
    expect(result.categories).toContain('full-body');
    expect(result.categories.filter((value) => value === 'full-body')).toHaveLength(1);
    expect(result.movementFamilies).toContain('Ring-Support');
    expect(result.muscles).toContain('lats');
    expect(result.keywords).toContain('vertical pull');
  });

  it('keeps frontend category creation aligned with an admin-protected database validator', () => {
    expect(migration).toContain("kind in ('category','movement_family','muscle','keyword')");
    expect(migration).toContain('validate_exercise_category_taxonomy');
    expect(migration).toContain('public.is_admin()');
    expect(migration).toContain("where stable_key = 'l-sit-pull-up'");
    expect(migration).toContain("set category = 'pull', movement_family = 'Pull-Up'");
  });
});
