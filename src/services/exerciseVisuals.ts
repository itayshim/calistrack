import { useSyncExternalStore } from 'react';
import type { Exercise, ExerciseVisualAsset } from '../types';
import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';
import { pilotExerciseVisuals } from '../assets/exercise-visuals/pilot';

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
const builtInVisuals = new Map(pilotExerciseVisuals.map((item) => [item.stableKey, item]));
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
  source: 'uploaded' | 'built-in' | 'fallback';
  type: ExerciseVisualAsset['format'] | 'fallback';
  isFallback: boolean;
  asset?: ExerciseVisualAsset;
}
export function getExerciseVisual(exercise?: Pick<Exercise, 'stableKey' | 'id'>): ResolvedExerciseVisual {
  const stableKey = exercise?.stableKey ?? exercise?.id.replace(/^builtin-/, '');
  const uploaded = stableKey ? visuals.get(stableKey) : undefined;
  const asset = uploaded ?? (stableKey ? builtInVisuals.get(stableKey) : undefined);
  const base = storageBase();
  return asset
    ? { src: asset.src ?? `${base}${asset.storagePath?.split('/').map(encodeURIComponent).join('/')}`, source: uploaded ? 'uploaded' : 'built-in', type: asset.format, isFallback: false, asset }
    : { source: 'fallback', type: 'fallback', isFallback: true };
}

export function validateExerciseVisualFile(file: Pick<File, 'type' | 'size'>) {
  const limit = EXERCISE_VISUAL_LIMITS[file.type as ExerciseVisualMime];
  if (!limit) throw new Error('invalid_visual_mime');
  if (file.size > limit) throw new Error('visual_too_large');
}

const SAFE_SVG_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'clipPath', 'mask', 'symbol', 'use', 'title', 'desc', 'metadata',
  'linearGradient', 'radialGradient', 'stop', 'pattern',
]);
const BLOCKED_SVG_ELEMENTS = new Set([
  'script', 'foreignObject', 'iframe', 'object', 'embed', 'image', 'audio', 'video', 'a',
  'animate', 'animateMotion', 'animateTransform', 'set', 'cursor',
]);
const SAFE_SVG_ATTRIBUTES = new Set([
  'id', 'class', 'version', 'baseProfile', 'viewBox', 'preserveAspectRatio',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height',
  'd', 'points', 'pathLength', 'transform',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'stroke-dashoffset', 'opacity', 'color', 'display', 'visibility',
  'paint-order',
  'clip-path', 'clip-rule', 'mask', 'mask-type',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform',
  'spreadMethod', 'patternUnits', 'patternContentUnits', 'patternTransform',
  'href', 'style', 'role', 'aria-label', 'aria-hidden', 'focusable', 'tabindex',
]);
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

function isSafeLocalReference(value: string) {
  return /^#[A-Za-z_][\w:.-]*$/.test(value.trim());
}

function hasUnsafeCss(value: string) {
  if (/@import|expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding/i.test(value)) return true;
  const urls = value.match(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi) ?? [];
  return urls.some((entry) => {
    const match = /url\s*\(\s*(['"]?)(.*?)\1\s*\)/i.exec(entry);
    return !match || !isSafeLocalReference(match[2]);
  });
}

function isMetadataDescendant(element: Element) {
  for (let current = element.parentElement; current; current = current.parentElement) {
    if (current.namespaceURI === SVG_NAMESPACE && current.localName === 'metadata') return true;
  }
  return false;
}

export function validateExerciseVisualSvg(source: string) {
  if (/<!DOCTYPE/i.test(source)) throw new Error('unsafe_visual_svg');
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('unsafe_visual_svg');
  const root = document.documentElement;
  if ((root.namespaceURI && root.namespaceURI !== SVG_NAMESPACE) || root.localName !== 'svg') throw new Error('unsafe_visual_svg');

  for (const element of Array.from(document.getElementsByTagName('*'))) {
    const inMetadata = isMetadataDescendant(element);
    if (BLOCKED_SVG_ELEMENTS.has(element.localName)) throw new Error('unsafe_visual_svg');
    if ((!element.namespaceURI || element.namespaceURI === SVG_NAMESPACE) && !SAFE_SVG_ELEMENTS.has(element.localName)) throw new Error('unsafe_visual_svg');
    if (element.namespaceURI && element.namespaceURI !== SVG_NAMESPACE && !inMetadata) throw new Error('unsafe_visual_svg');

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName;
      const qualifiedName = attribute.name;
      const value = attribute.value.trim();
      if (/^on/i.test(name)) throw new Error('unsafe_visual_svg');
      if (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/') {
        if (![SVG_NAMESPACE, XLINK_NAMESPACE].includes(value) && !inMetadata) throw new Error('unsafe_visual_svg');
        continue;
      }
      if (inMetadata) continue;
      if (attribute.namespaceURI && ![XLINK_NAMESPACE, XML_NAMESPACE].includes(attribute.namespaceURI)) throw new Error('unsafe_visual_svg');
      if (!SAFE_SVG_ATTRIBUTES.has(name) && !qualifiedName.startsWith('aria-') && !qualifiedName.startsWith('data-')) throw new Error('unsafe_visual_svg');
      if (name === 'href') {
        if (element.localName !== 'use' || !isSafeLocalReference(value)) throw new Error('unsafe_visual_svg');
      }
      if ((name === 'style' || name === 'fill' || name === 'stroke' || name === 'clip-path' || name === 'mask') && hasUnsafeCss(value)) {
        throw new Error('unsafe_visual_svg');
      }
      if (/^(?:https?:|data:|javascript:|vbscript:|file:|blob:|\/\/)/i.test(value)) throw new Error('unsafe_visual_svg');
    }
  }
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
