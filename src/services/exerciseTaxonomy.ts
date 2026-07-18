import { builtInExercises } from '../data/exercises';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_MOVEMENT_FAMILIES,
  DEFAULT_MUSCLES,
  normalizeTaxonomyValue,
  type TaxonomyKind,
  uniqueTaxonomyValues,
} from '../utils/taxonomy';
import { getAdminSession, supabaseRequest } from './supabase';

export interface ExerciseTaxonomy {
  categories: string[];
  movementFamilies: string[];
  muscles: string[];
  keywords: string[];
}

interface GlobalTaxonomyRow {
  movement_family: string;
  category: string;
  muscles: string[];
  keywords: string[];
}

interface StoredTaxonomyRow {
  kind: TaxonomyKind;
  value: string;
}

export function deriveExerciseTaxonomy(
  rows: GlobalTaxonomyRow[] = [],
  stored: StoredTaxonomyRow[] = [],
): ExerciseTaxonomy {
  const storedFor = (kind: TaxonomyKind) =>
    stored.filter((item) => item.kind === kind).map((item) => item.value);
  return {
    categories: uniqueTaxonomyValues([
      ...DEFAULT_CATEGORIES,
      ...builtInExercises.map((exercise) => exercise.category),
      ...rows.map((row) => row.category),
      ...storedFor('category'),
    ], 'category').sort(),
    movementFamilies: uniqueTaxonomyValues([
      ...DEFAULT_MOVEMENT_FAMILIES,
      ...builtInExercises.map((exercise) => exercise.movementFamily ?? ''),
      ...rows.map((row) => row.movement_family),
      ...storedFor('movement_family'),
    ], 'movement_family').sort(),
    muscles: uniqueTaxonomyValues([
      ...DEFAULT_MUSCLES,
      ...builtInExercises.flatMap((exercise) => exercise.muscles),
      ...rows.flatMap((row) => row.muscles ?? []),
      ...storedFor('muscle'),
    ], 'muscle').sort(),
    keywords: uniqueTaxonomyValues([
      ...builtInExercises.flatMap((exercise) => exercise.keywords ?? []),
      ...rows.flatMap((row) => row.keywords ?? []),
      ...storedFor('keyword'),
    ], 'keyword').sort(),
  };
}

export async function loadExerciseTaxonomy(): Promise<ExerciseTaxonomy> {
  const token = getAdminSession()?.accessToken;
  const [rows, stored] = await Promise.all([
    supabaseRequest<GlobalTaxonomyRow[]>(
      '/rest/v1/global_exercises?select=movement_family,category,muscles,keywords',
      {},
      token,
    ).catch(() => []),
    supabaseRequest<StoredTaxonomyRow[]>(
      '/rest/v1/exercise_taxonomy_values?select=kind,value',
      {},
      token,
    ).catch(() => []),
  ]);
  return deriveExerciseTaxonomy(rows, stored);
}

export async function createExerciseTaxonomyValue(
  kind: TaxonomyKind,
  rawValue: string,
): Promise<string> {
  const session = getAdminSession();
  if (!session) throw new Error('not_admin');
  const value = normalizeTaxonomyValue(rawValue, kind);
  if (!value) throw new Error('invalid_taxonomy_value');
  await supabaseRequest('/rest/v1/exercise_taxonomy_values?on_conflict=kind,normalized_value', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      kind,
      value,
      normalized_value: value.toLowerCase().replace(/[\s_-]+/g, ''),
      created_by: session.userId,
    }),
  }, session.accessToken);
  return value;
}
