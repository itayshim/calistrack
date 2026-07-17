import { SupabaseApiError } from './supabase';

export type AuthErrorKey =
  | 'authInvalidCredentials'
  | 'authEmailNotConfirmed'
  | 'authTooManyRequests'
  | 'authNetwork'
  | 'authNotAdmin'
  | 'authUnknown';

export function getAuthErrorKey(error: unknown): AuthErrorKey {
  if (!(error instanceof SupabaseApiError)) return 'authUnknown';
  if (error.status === 429 || error.code === 'too_many_requests') return 'authTooManyRequests';
  switch (error.code) {
    case 'invalid_credentials':
      return 'authInvalidCredentials';
    case 'email_not_confirmed':
      return 'authEmailNotConfirmed';
    case 'network_error':
      return 'authNetwork';
    case 'not_admin':
      return 'authNotAdmin';
    default:
      return 'authUnknown';
  }
}

export function authErrorMessage(
  error: unknown,
  translate: (key: AuthErrorKey) => string,
): string {
  const key = getAuthErrorKey(error);
  if (import.meta.env.DEV) {
    const details =
      error instanceof SupabaseApiError
        ? { code: error.code, status: error.status }
        : { type: error instanceof Error ? error.name : typeof error };
    console.warn('[admin-auth] Sign-in failed', details);
  }
  return translate(key);
}
