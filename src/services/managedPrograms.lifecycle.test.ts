import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseRequest } = vi.hoisted(() => ({ supabaseRequest: vi.fn() }));
vi.mock('./supabase', () => ({
  getAdminSession: () => ({ accessToken: 'admin-token' }),
  supabaseConfigured: true,
  supabaseRequest,
}));

import { setManagedProgramLifecycle } from './managedPrograms';

describe('setManagedProgramLifecycle RPC', () => {
  beforeEach(() => supabaseRequest.mockReset().mockResolvedValue(undefined));

  it('sends the exact UUID and lifecycle payload expected by PostgreSQL', async () => {
    await setManagedProgramLifecycle({
      id: '4b40f413-0c98-4a56-956f-c06c6e327e70',
      source: 'builtin_override',
      status: 'published',
    }, 'unpublished');

    expect(supabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/rpc/set_managed_program_lifecycle',
      {
        method: 'POST',
        body: JSON.stringify({
          p_program_id: '4b40f413-0c98-4a56-956f-c06c6e327e70',
          p_status: 'unpublished',
        }),
      },
      'admin-token',
    );
  });

  it('never sends a request for a source-code built-in', async () => {
    await expect(setManagedProgramLifecycle({
      id: 'builtin:beginner-calisthenics-12-week',
      source: 'built-in',
      status: 'published',
    }, 'unpublished')).rejects.toMatchObject({ code: 'immutable_builtin' });
    expect(supabaseRequest).not.toHaveBeenCalled();
  });
});
