import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInAdmin, supabaseFunctionRequest } from './supabase';

describe('Supabase administrator authentication', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('authenticates before checking the profile role and stores an admin session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }));
    await expect(signInAdmin('admin@example.com', 'password')).resolves.toMatchObject({ userId: 'user-1' });
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/v1/token');
    expect(fetchMock.mock.calls[1][0]).toContain('/rest/v1/profiles');
  });

  it('denies an authenticated user without the admin role', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'user' }]), { status: 200 }));
    await expect(signInAdmin('user@example.com', 'password')).rejects.toMatchObject({
      code: 'not_admin',
      status: 403,
    });
    expect(sessionStorage.getItem('calistrack.admin.session')).toBeNull();
  });
});

describe('Edge Function invocation headers', () => {
  it('does not leak REST-only Prefer or unexplained pcret headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    await supabaseFunctionRequest('youtube-suggestions', { query: 'pull-up' }, 'token');
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Prefer).toBeUndefined();
    expect(headers.pcret).toBeUndefined();
    expect(headers.Authorization).toBe('Bearer token');
    fetchMock.mockRestore();
  });
});
