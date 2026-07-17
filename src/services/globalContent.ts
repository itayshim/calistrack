import { builtInExercises } from '../data/exercises';
import type { Exercise, ExerciseMedia } from '../types';
import { supabaseConfigured, supabaseRequest } from './supabase';

const CACHE_KEY = 'calistrack.global-content.v1';

export interface GlobalContentResult {
  exercises: Exercise[];
  stale: boolean;
}

interface GlobalRow {
  id: string;
  stable_key: string;
  movement_family: string;
  category: Exercise['category'];
  difficulty: Exercise['difficulty'];
  measurement_type: Exercise['measurementType'];
  muscles: string[];
  aliases: string[];
  keywords: string[];
  is_published: boolean;
  exercise_translations: Array<{
    locale: 'en' | 'he';
    name: string;
    description: string;
    instructions: string[];
    common_mistakes: string[];
    aliases: string[];
    keywords: string[];
  }>;
  exercise_media: Array<Record<string, unknown>>;
}

function toMedia(row: Record<string, unknown>): ExerciseMedia {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    mediaType: row.media_type as ExerciseMedia['mediaType'],
    provider: row.provider as ExerciseMedia['provider'],
    title: typeof row.title === 'string' ? row.title : undefined,
    description: typeof row.description === 'string' ? row.description : undefined,
    externalUrl: typeof row.external_url === 'string' ? row.external_url : undefined,
    storagePath: typeof row.storage_path === 'string' ? row.storage_path : undefined,
    thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : undefined,
    mimeType: typeof row.mime_type === 'string' ? row.mime_type : undefined,
    fileSizeBytes: typeof row.file_size_bytes === 'number' ? row.file_size_bytes : undefined,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    isPrimary: row.is_primary === true,
    isPublished: row.is_published === true,
  };
}

function toExercise(row: GlobalRow): Exercise {
  const en = row.exercise_translations.find((item) => item.locale === 'en');
  const he = row.exercise_translations.find((item) => item.locale === 'he');
  return {
    id: `builtin-${row.stable_key}`,
    stableKey: row.stable_key,
    source: 'global',
    nameEn: en?.name ?? row.stable_key,
    nameHe: he?.name ?? en?.name ?? row.stable_key,
    movementFamily: row.movement_family,
    category: row.category,
    difficulty: row.difficulty,
    measurementType: row.measurement_type,
    muscles: row.muscles ?? [],
    aliases: [...(row.aliases ?? []), ...(en?.aliases ?? [])],
    aliasesHe: he?.aliases ?? [],
    keywords: [...(row.keywords ?? []), ...(en?.keywords ?? [])],
    keywordsHe: he?.keywords ?? [],
    description: en?.description ?? '',
    descriptionHe: he?.description,
    instructions: en?.instructions ?? [],
    instructionsHe: he?.instructions,
    commonMistakes: en?.common_mistakes ?? [],
    commonMistakesHe: he?.common_mistakes,
    media: (row.exercise_media ?? []).map(toMedia).sort((a, b) => a.sortOrder - b.sortOrder),
    isCustom: false,
  };
}

export function mergeExerciseSources(global: Exercise[], local: Exercise[]): Exercise[] {
  const personal = local.filter((exercise) => exercise.isCustom);
  const merged = new Map(builtInExercises.map((exercise) => [exercise.stableKey ?? exercise.id, exercise]));
  global.forEach((exercise) => merged.set(exercise.stableKey ?? exercise.id, exercise));
  return [...merged.values(), ...personal.map((exercise) => ({ ...exercise, source: 'personal' as const }))];
}

export async function loadGlobalContent(local: Exercise[]): Promise<GlobalContentResult> {
  if (supabaseConfigured) {
    try {
      const rows = await supabaseRequest<GlobalRow[]>(
        '/rest/v1/global_exercises?is_published=eq.true&select=*,exercise_translations(*),exercise_media(*)&exercise_media.is_published=eq.true',
      );
      const global = rows.map(toExercise);
      localStorage.setItem(CACHE_KEY, JSON.stringify(global));
      return { exercises: mergeExerciseSources(global, local), stale: false };
    } catch {
      // Cached published data is safe for anonymous fallback.
    }
  }
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as Exercise[];
    return { exercises: mergeExerciseSources(cached, local), stale: cached.length > 0 };
  } catch {
    return { exercises: mergeExerciseSources([], local), stale: false };
  }
}
