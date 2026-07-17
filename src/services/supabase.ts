const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);
export const MEDIA_UPLOAD_LIMIT_BYTES =
  Number(import.meta.env.VITE_MEDIA_UPLOAD_LIMIT_MB ?? 50) * 1024 * 1024;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

export class SupabaseApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'SupabaseApiError';
  }
}

const SESSION_KEY = 'calistrack.admin.session';

export function getAdminSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  let response: Response;
  try {
    response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken ?? anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...init.headers,
      },
    });
  } catch {
    throw new SupabaseApiError('network_error', 0);
  }
  if (!response.ok) {
    let code = response.status === 429 ? 'too_many_requests' : 'unknown_error';
    try {
      const body = (await response.json()) as { error_code?: string; code?: string | number };
      code = body.error_code ?? (typeof body.code === 'string' ? body.code : code);
    } catch {
      // Keep the safe generic code. Raw server responses never reach the UI.
    }
    throw new SupabaseApiError(code, response.status);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function signInAdmin(email: string, password: string): Promise<AuthSession> {
  const result = await request<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string };
  }>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const profile = await request<Array<{ role: string }>>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(result.user.id)}&select=role`,
    {},
    result.access_token,
  );
  if (profile[0]?.role !== 'admin') throw new SupabaseApiError('not_admin', 403);
  const session = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + result.expires_in * 1000,
    userId: result.user.id,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOutAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
}

export const supabaseRequest = request;
export const getSupabasePublicUrl = (path: string) =>
  url ? `${url}/storage/v1/object/public/exercise-media/${path}` : '';

export function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function uploadExerciseMedia(
  exerciseId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const session = getAdminSession();
  if (!url || !anonKey || !session) return Promise.reject(new Error('Administrator session required'));
  if (!['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Unsupported file type'));
  }
  if (file.size > MEDIA_UPLOAD_LIMIT_BYTES) return Promise.reject(new Error('File exceeds the upload limit'));
  const path = `exercises/${exerciseId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${url}/storage/v1/object/exercise-media/${path}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${session.accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Upload was interrupted'));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(path) : reject(new Error(xhr.responseText || 'Upload failed'));
    xhr.send(file);
  });
}

export async function deleteExerciseMediaFile(storagePath: string): Promise<void> {
  const session = getAdminSession();
  if (!url || !anonKey || !session) throw new SupabaseApiError('not_admin', 403);
  const response = await fetch(
    `${url}/storage/v1/object/exercise-media/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'DELETE',
      headers: { apikey: anonKey, Authorization: `Bearer ${session.accessToken}` },
    },
  );
  if (!response.ok && response.status !== 404) throw new SupabaseApiError('media_delete_failed', response.status);
}
