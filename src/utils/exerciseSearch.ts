import type { Exercise } from '../types';

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (letter) => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[letter] ?? letter)
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '')
    .replace(/(push|pull)ups$/g, '$1up')
    .replace(/dips$/g, 'dip');
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
}

export function exerciseSearchScore(exercise: Exercise, query: string): number {
  const q = normalizeSearchText(query);
  const order = exercise.progressionOrder ?? 0;
  if (!q) return 1_000 - order;
  const name = normalizeSearchText(exercise.nameEn);
  const aliases = [...(exercise.aliases ?? []), ...(exercise.aliasesHe ?? [])].map(normalizeSearchText);
  const family = normalizeSearchText(exercise.movementFamily ?? '');
  const direct = [name, normalizeSearchText(exercise.nameHe), ...aliases];
  if (name === q) return 10_000;
  if (aliases.includes(q)) return 9_500;
  if (name.startsWith(q)) return 9_000 - name.length;
  if (direct.some((value) => value.includes(q))) return 8_000 - name.length;
  if (family === q) return 7_000 - order;
  const metadata = [
    exercise.category,
    ...(exercise.keywords ?? []),
    ...(exercise.keywordsHe ?? []),
    ...exercise.muscles,
    exercise.movementFamily ?? '',
  ].map(normalizeSearchText);
  if (metadata.some((value) => value === q)) return 6_500 - order;
  if (metadata.some((value) => value.includes(q) || q.includes(value))) return 6_000 - order;
  const words = [name, ...aliases, ...metadata];
  const closest = Math.min(...words.map((value) => editDistance(value, q)));
  return closest <= Math.max(1, Math.floor(q.length / 4)) ? 4_000 - closest * 100 : -1;
}

export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  return exercises
    .map((exercise) => ({ exercise, score: exerciseSearchScore(exercise, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || (a.exercise.progressionOrder ?? 0) - (b.exercise.progressionOrder ?? 0) || a.exercise.nameEn.localeCompare(b.exercise.nameEn))
    .map(({ exercise }) => exercise);
}
