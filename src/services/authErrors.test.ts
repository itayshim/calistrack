import { describe, expect, it } from 'vitest';
import { authErrorMessage, getAuthErrorKey } from './authErrors';
import { SupabaseApiError } from './supabase';

describe('administrator authentication errors', () => {
  it.each([
    ['invalid_credentials', 400, 'authInvalidCredentials'],
    ['email_not_confirmed', 400, 'authEmailNotConfirmed'],
    ['too_many_requests', 429, 'authTooManyRequests'],
    ['network_error', 0, 'authNetwork'],
    ['not_admin', 403, 'authNotAdmin'],
  ] as const)('maps %s to a safe translation key', (code, status, key) => {
    expect(getAuthErrorKey(new SupabaseApiError(code, status))).toBe(key);
  });

  it('never returns the raw Supabase response', () => {
    const raw =
      '{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}';
    const message = authErrorMessage(
      new SupabaseApiError('invalid_credentials', 400),
      () => 'Incorrect email or password.',
    );
    expect(message).toBe('Incorrect email or password.');
    expect(message).not.toContain(raw);
    expect(message).not.toContain('invalid_credentials');
  });
});
