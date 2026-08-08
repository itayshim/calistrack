import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseRequest } = vi.hoisted(() => ({ supabaseRequest: vi.fn() }));
vi.mock('./supabase', () => ({
  getAdminSession: () => ({ accessToken: 'admin-token' }),
  supabaseConfigured: true,
  supabaseRequest,
}));

import {
  BuiltInContentAvailabilityError,
  loadBuiltInContentStates,
  setBuiltInContentAvailability,
  setBuiltInProgramAvailability,
} from './builtinContentAvailability';

describe('built-in content availability service', () => {
  beforeEach(() => supabaseRequest.mockReset().mockResolvedValue({}));

  it('uses a stable key RPC contract and never sends a synthetic UUID', async () => {
    await setBuiltInProgramAvailability('beginner-foundation-12-week', 'unpublished');
    expect(supabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/rpc/set_builtin_content_availability',
      {
        method: 'POST',
        body: JSON.stringify({
          p_content_type: 'managed_program',
          p_builtin_key: 'beginner-foundation-12-week',
          p_availability: 'unpublished',
        }),
      },
      'admin-token',
    );
    expect(JSON.parse(supabaseRequest.mock.calls[0][1].body).p_builtin_key).not.toContain('builtin:');
  });

  it('supports explicit republish and archive values', async () => {
    await setBuiltInProgramAvailability('beginner-foundation-12-week', 'published');
    await setBuiltInProgramAvailability('beginner-foundation-12-week', 'archived');
    expect(supabaseRequest).toHaveBeenCalledTimes(2);
  });

  it('loads and maps the persisted public state overlay', async () => {
    supabaseRequest.mockResolvedValueOnce([{
      content_type: 'managed_program', builtin_key: 'beginner-foundation-12-week',
      availability: 'unpublished', updated_at: '2026-08-08T00:00:00Z',
    }]);
    await expect(loadBuiltInContentStates('managed_program')).resolves.toEqual([{
      contentType: 'managed_program', builtinKey: 'beginner-foundation-12-week',
      availability: 'unpublished', updatedAt: '2026-08-08T00:00:00Z',
    }]);
  });

  it('rejects malformed keys and lifecycle values before a request', async () => {
    await expect(setBuiltInContentAvailability(
      'managed_program',
      'builtin:fake',
      'published',
    )).rejects.toEqual(new BuiltInContentAvailabilityError('invalid_builtin_key'));
    await expect(setBuiltInContentAvailability(
      'managed_program',
      'valid-key',
      'draft' as never,
    )).rejects.toEqual(new BuiltInContentAvailabilityError('invalid_availability'));
    expect(supabaseRequest).not.toHaveBeenCalled();
  });
});
