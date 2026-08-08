import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ request: vi.fn(), session: { accessToken: 'admin-token' } as { accessToken: string } | null }));
vi.mock('./supabase', () => ({
  getAdminSession: () => api.session,
  supabaseConfigured: true,
  supabaseRequest: api.request,
}));
import { clearExerciseVisualsForTests, getExerciseVisual, installExerciseVisuals, removeExerciseVisual, saveExerciseVisual } from './exerciseVisuals';

describe('Exercise Visual administrator lifecycle', () => {
  beforeEach(() => { api.request.mockReset(); api.session = { accessToken: 'admin-token' }; clearExerciseVisualsForTests(); vi.restoreAllMocks(); });
  it('uploads and replaces through the stable-key RPC contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
    api.request.mockResolvedValue([{ stable_key: 'push-up', storage_path: 'visuals/push-up/visual.webp', mime_type: 'image/webp', file_size_bytes: 10 }]);
    await saveExerciseVisual('push-up', new File(['visual'], 'push.webp', { type: 'image/webp' }));
    expect(api.request).toHaveBeenCalledWith('/rest/v1/rpc/admin_set_exercise_visual', expect.objectContaining({ body: expect.stringContaining('"p_stable_key":"push-up"') }), 'admin-token');
    expect(getExerciseVisual({ id: 'other-id', stableKey: 'push-up' }).source).toBe('uploaded');
  });
  it('removes metadata and its dedicated object without touching demo media', async () => {
    installExerciseVisuals([{ stableKey: 'pull-up', storagePath: 'visuals/pull-up/visual.png', mimeType: 'image/png', format: 'png', fileSizeBytes: 10 }]);
    api.request.mockResolvedValue(undefined);
    await removeExerciseVisual('pull-up');
    expect(api.request).toHaveBeenCalledWith('/rest/v1/rpc/admin_remove_exercise_visual', expect.objectContaining({ body: '{"p_stable_key":"pull-up"}' }), 'admin-token');
    expect(getExerciseVisual({ id: 'builtin-pull-up', stableKey: 'pull-up' }).source).toBe('built-in');
  });
  it('rejects a non-Admin client before upload or database mutation', async () => {
    api.session = null;
    await expect(saveExerciseVisual('handstand', new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toThrow('not_admin');
    expect(api.request).not.toHaveBeenCalled();
  });
});
