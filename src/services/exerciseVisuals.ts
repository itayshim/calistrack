import { useSyncExternalStore } from 'react';
import type { Exercise, ExerciseVisualAsset } from '../types';
import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';

export const EXERCISE_VISUAL_LIMITS = {
  'image/svg+xml': 200 * 1024,
  'image/webp': 300 * 1024,
  'image/png': 500 * 1024,
} as const;
export type ExerciseVisualMime = keyof typeof EXERCISE_VISUAL_LIMITS;

interface VisualRow {
  stable_key: string;
  storage_path: string;
  mime_type: ExerciseVisualMime;
  file_size_bytes: number;
  width?: number | null;
  height?: number | null;
  view_box?: string | null;
  updated_at?: string;
}

const listeners = new Set<() => void>();
let visuals = new Map<string, ExerciseVisualAsset>();
let revision = 0;
const storageBase = () => {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/storage/v1/object/public/exercise-visuals/` : '/storage/v1/object/public/exercise-visuals/';
};
const notify = () => { revision += 1; listeners.forEach((listener) => listener()); };
const toAsset = (row: VisualRow): ExerciseVisualAsset => ({
  stableKey: row.stable_key,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  format: row.mime_type === 'image/svg+xml' ? 'svg' : row.mime_type === 'image/webp' ? 'webp' : 'png',
  fileSizeBytes: row.file_size_bytes,
  width: row.width ?? undefined,
  height: row.height ?? undefined,
  viewBox: row.view_box ?? undefined,
  updatedAt: row.updated_at,
});

export function installExerciseVisuals(items: ExerciseVisualAsset[]) {
  visuals = new Map(items.map((item) => [item.stableKey, item]));
  notify();
}
export function subscribeExerciseVisuals(listener: () => void) {
  listeners.add(listener); return () => listeners.delete(listener);
}
export const getExerciseVisualRevision = () => revision;
export const useExerciseVisualRegistry = () => useSyncExternalStore(subscribeExerciseVisuals, getExerciseVisualRevision);

export async function loadPublishedExerciseVisuals(): Promise<ExerciseVisualAsset[]> {
  if (!supabaseConfigured) return [];
  const rows = await supabaseRequest<VisualRow[]>('/rest/v1/exercise_visuals?select=stable_key,storage_path,mime_type,file_size_bytes,width,height,view_box,updated_at');
  return rows.map(toAsset);
}

export interface ResolvedExerciseVisual {
  src?: string;
  source: 'explicit' | 'fallback';
  type: ExerciseVisualAsset['format'] | 'fallback';
  isFallback: boolean;
  asset?: ExerciseVisualAsset;
}
export function getExerciseVisual(exercise?: Pick<Exercise, 'stableKey' | 'id'>): ResolvedExerciseVisual {
  const stableKey = exercise?.stableKey ?? exercise?.id.replace(/^builtin-/, '');
  const asset = stableKey ? visuals.get(stableKey) : undefined;
  const base = storageBase();
  return asset
    ? { src: `${base}${asset.storagePath.split('/').map(encodeURIComponent).join('/')}`, source: 'explicit', type: asset.format, isFallback: false, asset }
    : { source: 'fallback', type: 'fallback', isFallback: true };
}

export function validateExerciseVisualFile(file: Pick<File, 'type' | 'size'>) {
  const limit = EXERCISE_VISUAL_LIMITS[file.type as ExerciseVisualMime];
  if (!limit) throw new Error('invalid_visual_mime');
  if (file.size > limit) throw new Error('visual_too_large');
}
export function validateExerciseVisualSvg(source: string) {
  const unsafe = /<\s*(script|foreignObject|iframe|object|embed|use)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']?\s*(?:https?:|data:|javascript:)/i;
  if (!/^\s*<svg\b/i.test(source) || unsafe.test(source)) throw new Error('unsafe_visual_svg');
}

export async function saveExerciseVisual(stableKey: string, file: File, metadata: { width?: number; height?: number; viewBox?: string } = {}) {
  validateExerciseVisualFile(file);
  if (file.type === 'image/svg+xml') validateExerciseVisualSvg(await file.text());
  const session = getAdminSession();
  if (!session) throw new Error('not_admin');
  const extension = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/webp' ? 'webp' : 'png';
  const storagePath = `visuals/${stableKey}/visual.${extension}`;
  const previousPath = visuals.get(stableKey)?.storagePath;
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/storage/v1/object/exercise-visuals/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''), Authorization: `Bearer ${session.accessToken}`, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file,
  });
  if (!response.ok) throw new Error('visual_upload_failed');
  const rows = await supabaseRequest<VisualRow[]>('/rest/v1/rpc/admin_set_exercise_visual', {
    method: 'POST',
    body: JSON.stringify({ p_stable_key: stableKey, p_storage_path: storagePath, p_mime_type: file.type, p_file_size_bytes: file.size, p_width: metadata.width ?? null, p_height: metadata.height ?? null, p_view_box: metadata.viewBox ?? null }),
  }, session.accessToken);
  const row = rows[0];
  if (!row) throw new Error('visual_upload_failed');
  const asset = toAsset(row);
  if (previousPath && previousPath !== storagePath) await deleteVisualObject(previousPath, session.accessToken).catch(() => undefined);
  visuals.set(stableKey, asset); notify(); return asset;
}

export async function removeExerciseVisual(stableKey: string) {
  const session = getAdminSession();
  if (!session) throw new Error('not_admin');
  const knownPath = visuals.get(stableKey)?.storagePath;
  const removedPath = await supabaseRequest<string | null>('/rest/v1/rpc/admin_remove_exercise_visual', { method: 'POST', body: JSON.stringify({ p_stable_key: stableKey }) }, session.accessToken);
  const storagePath = removedPath ?? knownPath;
  if (storagePath) await deleteVisualObject(storagePath, session.accessToken).catch(() => undefined);
  visuals.delete(stableKey); notify();
}

async function deleteVisualObject(storagePath: string, accessToken: string) {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!base) return;
  await fetch(`${base}/storage/v1/object/exercise-visuals/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'DELETE', headers: { apikey: String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''), Authorization: `Bearer ${accessToken}` },
  });
}

export function clearExerciseVisualsForTests() { visuals.clear(); revision = 0; }
