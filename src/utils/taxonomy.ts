export type TaxonomyKind = 'category' | 'movement_family' | 'muscle' | 'keyword';

export const DEFAULT_CATEGORIES = [
  'push',
  'pull',
  'legs',
  'core',
  'skill',
  'mobility',
  'cardio',
  'full-body',
];

export const DEFAULT_MOVEMENT_FAMILIES = [
  'Pull-Up',
  'Chin-Up',
  'Push-Up',
  'Dips',
  'Squat',
  'L-Sit',
  'Front Lever',
  'Back Lever',
  'Planche',
  'Handstand',
  'Muscle-Up',
  'Human Flag',
  'Mobility',
];

export const DEFAULT_MUSCLES = [
  'lats',
  'upper back',
  'biceps',
  'triceps',
  'chest',
  'shoulders',
  'forearms',
  'core',
  'hip flexors',
  'glutes',
  'quadriceps',
  'hamstrings',
  'calves',
];

const muscleAliases: Record<string, string> = {
  lat: 'lats',
  lats: 'lats',
  quad: 'quadriceps',
  quads: 'quadriceps',
  hamstring: 'hamstrings',
  calf: 'calves',
};

export function normalizeTaxonomyValue(value: string, kind: TaxonomyKind): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (kind === 'category') {
    return trimmed
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (kind === 'movement_family') {
    return trimmed
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('-');
  }
  const lower = trimmed.toLowerCase();
  if (kind === 'muscle') return muscleAliases[lower] ?? lower;
  return lower;
}

export function taxonomyIdentity(value: string, kind: TaxonomyKind): string {
  return normalizeTaxonomyValue(value, kind).toLocaleLowerCase().replace(/[\s_-]+/g, '');
}

export function uniqueTaxonomyValues(values: string[], kind: TaxonomyKind): string[] {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    const normalized = normalizeTaxonomyValue(value, kind);
    const identity = taxonomyIdentity(normalized, kind);
    if (!normalized || seen.has(identity)) return result;
    seen.add(identity);
    result.push(normalized);
    return result;
  }, []);
}

export function suggestedCategory(movementFamily: string): string | null {
  const family = taxonomyIdentity(movementFamily, 'movement_family');
  if (['pullup', 'chinup', 'row'].includes(family)) return 'pull';
  if (['pushup', 'dips'].includes(family)) return 'push';
  if (['squat', 'lunge', 'calfraise', 'nordiccurl', 'glutebridge'].includes(family)) return 'legs';
  if (family === 'lsit') return 'core';
  if (['frontlever', 'backlever'].includes(family)) return 'pull';
  if (['planche', 'handstand', 'humanflag', 'muscleup'].includes(family)) return 'skill';
  if (family === 'mobility') return 'mobility';
  return null;
}

export function keywordSuggestions(category: string, movementFamily: string): string[] {
  const suggestions = [
    category,
    normalizeTaxonomyValue(movementFamily, 'keyword'),
    'calisthenics',
    'bodyweight',
  ];
  if (category === 'pull') suggestions.push('vertical pull', 'bar');
  if (category === 'push') suggestions.push('upper body');
  if (category === 'skill') suggestions.push('skill');
  return uniqueTaxonomyValues(suggestions, 'keyword');
}
