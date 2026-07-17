import type { Exercise, ExerciseMedia } from '../types';
import { supabaseConfigured, supabaseRequest } from './supabase';

const MEDIA_CACHE_TTL_MS = 30_000;
const INVALIDATION_EVENT = 'calistrack:exercise-media-invalidated';

interface CanonicalExerciseRow {
  id: string;
  stable_key: string;
}

interface MediaRow {
  id: string;
  exercise_id: string;
  media_type: ExerciseMedia['mediaType'];
  provider: ExerciseMedia['provider'];
  title?: string | null;
  description?: string | null;
  external_url?: string | null;
  storage_path?: string | null;
  thumbnail_url?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
  is_published?: boolean | null;
}

interface CacheEntry {
  expiresAt: number;
  media: ExerciseMedia[];
}

export interface ExerciseMediaIdentity {
  canonicalExerciseId?: string;
  stableKey?: string;
}

const cache = new Map<string, CacheEntry>();

const cacheKey = (identity: ExerciseMediaIdentity) =>
  identity.canonicalExerciseId ?? identity.stableKey ?? '';

function toMedia(row: MediaRow): ExerciseMedia {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    mediaType: row.media_type,
    provider: row.provider,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    externalUrl: row.external_url ?? undefined,
    storagePath: row.storage_path ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    sortOrder: row.sort_order ?? 0,
    isPrimary: row.is_primary === true,
    isPublished: row.is_published === true,
  };
}

const orderMedia = (items: ExerciseMedia[]) =>
  items
    .filter((item) => item.isPublished)
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
    );

async function resolveCanonicalExercise(identity: ExerciseMediaIdentity) {
  if (identity.canonicalExerciseId) {
    return {
      id: identity.canonicalExerciseId,
      stable_key: identity.stableKey ?? '',
    };
  }
  if (!identity.stableKey) return null;
  const rows = await supabaseRequest<CanonicalExerciseRow[]>(
    `/rest/v1/global_exercises?stable_key=eq.${encodeURIComponent(identity.stableKey)}&is_published=eq.true&select=id,stable_key&limit=1`,
  );
  return rows[0] ?? null;
}

export async function loadPublishedExerciseMedia(
  exercise: Exercise,
  options: { force?: boolean } = {},
): Promise<ExerciseMedia[]> {
  const identity = {
    canonicalExerciseId: exercise.canonicalExerciseId,
    stableKey: exercise.stableKey,
  };
  const key = cacheKey(identity);
  const cached = key ? cache.get(key) : undefined;
  if (!options.force && cached && cached.expiresAt > Date.now()) return cached.media;
  if (!supabaseConfigured || (!identity.canonicalExerciseId && !identity.stableKey)) {
    return orderMedia(exercise.media ?? []);
  }

  const canonical = await resolveCanonicalExercise(identity);
  if (!canonical) return [];
  const rows = await supabaseRequest<MediaRow[]>(
    `/rest/v1/exercise_media?exercise_id=eq.${encodeURIComponent(canonical.id)}&is_published=eq.true&select=*&order=is_primary.desc,sort_order.asc`,
  );
  const media = orderMedia(rows.map(toMedia));
  cache.set(canonical.id, { media, expiresAt: Date.now() + MEDIA_CACHE_TTL_MS });
  if (canonical.stable_key) {
    cache.set(canonical.stable_key, { media, expiresAt: Date.now() + MEDIA_CACHE_TTL_MS });
  }

  if (import.meta.env.DEV) {
    console.debug('[CalisTrack media]', {
      resolvedExerciseId: canonical.id,
      publishedMediaCount: media.length,
      mediaTypes: media.map((item) => item.mediaType),
    });
  }
  return media;
}

export function invalidatePublishedExerciseMedia(identity: ExerciseMediaIdentity) {
  if (identity.canonicalExerciseId) cache.delete(identity.canonicalExerciseId);
  if (identity.stableKey) cache.delete(identity.stableKey);
  window.dispatchEvent(new CustomEvent(INVALIDATION_EVENT, { detail: identity }));
}

export function subscribeToExerciseMediaInvalidation(
  listener: (identity: ExerciseMediaIdentity) => void,
) {
  const handler = (event: Event) =>
    listener((event as CustomEvent<ExerciseMediaIdentity>).detail);
  window.addEventListener(INVALIDATION_EVENT, handler);
  return () => window.removeEventListener(INVALIDATION_EVENT, handler);
}

export function clearExerciseMediaCacheForTests() {
  cache.clear();
}
