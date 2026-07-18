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
export type AdminAuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'SESSION_EXPIRED';
type AdminAuthListener = (event: AdminAuthEvent, session: AuthSession | null) => void;
const adminAuthListeners = new Set<AdminAuthListener>();
const protectedRequestAborters = new Set<() => void>();
const abortProtectedRequests = () => {
  protectedRequestAborters.forEach((abort) => abort());
  protectedRequestAborters.clear();
};

function emitAdminAuth(event: AdminAuthEvent, session: AuthSession | null) {
  adminAuthListeners.forEach((listener) => listener(event, session));
}

export function onAdminAuthStateChange(listener: AdminAuthListener) {
  adminAuthListeners.add(listener);
  return () => adminAuthListeners.delete(listener);
}

export function invalidateAdminSession(expectedAccessToken?: string) {
  if (expectedAccessToken) {
    const current = getAdminSession();
    if (current && current.accessToken !== expectedAccessToken) return;
  }
  abortProtectedRequests();
  sessionStorage.removeItem(SESSION_KEY);
  emitAdminAuth('SESSION_EXPIRED', null);
}

export function getAdminSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt > Date.now()) return session;
    sessionStorage.removeItem(SESSION_KEY);
    queueMicrotask(() => emitAdminAuth('SESSION_EXPIRED', null));
    return null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
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
  const controller = accessToken ? new AbortController() : null;
  const abort = controller ? () => controller.abort() : null;
  if (abort) protectedRequestAborters.add(abort);
  try {
    response = await fetch(`${url}${path}`, {
      ...init,
      signal: init.signal ?? controller?.signal,
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
  } finally {
    if (abort) protectedRequestAborters.delete(abort);
  }
  if (!response.ok) {
    let code = response.status === 429 ? 'too_many_requests' : 'unknown_error';
    try {
      const body = (await response.json()) as { error_code?: string; code?: string | number };
      code = body.error_code ?? (typeof body.code === 'string' ? body.code : code);
    } catch {
      // Keep the safe generic code. Raw server responses never reach the UI.
    }
    if (accessToken && (response.status === 401 || response.status === 403)) {
      invalidateAdminSession(accessToken);
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
  emitAdminAuth('SIGNED_IN', session);
  return session;
}

export function signOutAdmin() {
  abortProtectedRequests();
  sessionStorage.removeItem(SESSION_KEY);
  emitAdminAuth('SIGNED_OUT', null);
}

export async function refreshAdminSession(): Promise<AuthSession> {
  const current = getAdminSession();
  if (!current?.refreshToken) {
    invalidateAdminSession();
    throw new SupabaseApiError('session_expired', 401);
  }
  try {
    const result = await request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: { id: string };
    }>('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: current.refreshToken }),
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
    emitAdminAuth('TOKEN_REFRESHED', session);
    return session;
  } catch (error) {
    invalidateAdminSession();
    throw error;
  }
}

export function monitorAdminSession() {
  let timer: number | undefined;
  let stopped = false;
  const schedule = () => {
    window.clearTimeout(timer);
    const session = getAdminSession();
    if (!session || stopped) return;
    const refreshIn = Math.max(0, session.expiresAt - Date.now() - 60_000);
    timer = window.setTimeout(() => {
      void refreshAdminSession().then(schedule).catch(() => undefined);
    }, refreshIn);
  };
  const check = () => {
    const session = getAdminSession();
    if (!session) return;
    if (session.expiresAt - Date.now() <= 60_000) {
      void refreshAdminSession().then(schedule).catch(() => undefined);
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') check();
  };
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', onVisibility);
  schedule();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export const supabaseRequest = request;
export async function supabaseFunctionRequest<T>(
  functionName: string,
  body: unknown,
  accessToken: string,
): Promise<T> {
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  let response: Response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  protectedRequestAborters.add(abort);
  try {
    response = await fetch(`${url}/functions/v1/${functionName}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SupabaseApiError('network_error', 0);
  } finally {
    protectedRequestAborters.delete(abort);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { code?: string };
    if (response.status === 401 || response.status === 403) invalidateAdminSession(accessToken);
    throw new SupabaseApiError(payload.code ?? 'unknown_error', response.status);
  }
  return response.json() as Promise<T>;
}
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
    const abort = () => xhr.abort();
    protectedRequestAborters.add(abort);
    xhr.open('POST', `${url}/storage/v1/object/exercise-media/${path}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${session.accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      protectedRequestAborters.delete(abort);
      reject(new Error('Upload was interrupted'));
    };
    xhr.onabort = () => {
      protectedRequestAborters.delete(abort);
      reject(new Error('Upload was interrupted'));
    };
    xhr.onload = () => {
      protectedRequestAborters.delete(abort);
      if (xhr.status >= 200 && xhr.status < 300) resolve(path);
      else {
        if (xhr.status === 401 || xhr.status === 403) invalidateAdminSession(session.accessToken);
        reject(new Error('Upload failed'));
      }
    };
    xhr.send(file);
  });
}

export async function deleteExerciseMediaFile(storagePath: string): Promise<void> {
  const session = getAdminSession();
  if (!url || !anonKey || !session) throw new SupabaseApiError('not_admin', 403);
  const controller = new AbortController();
  const abort = () => controller.abort();
  protectedRequestAborters.add(abort);
  let response: Response;
  try {
    response = await fetch(
      `${url}/storage/v1/object/exercise-media/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'DELETE',
        headers: { apikey: anonKey, Authorization: `Bearer ${session.accessToken}` },
        signal: controller.signal,
      },
    );
  } finally {
    protectedRequestAborters.delete(abort);
  }
  if (!response.ok && response.status !== 404) {
    if (response.status === 401 || response.status === 403) invalidateAdminSession(session.accessToken);
    throw new SupabaseApiError('media_delete_failed', response.status);
  }
}
