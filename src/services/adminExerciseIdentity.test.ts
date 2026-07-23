import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtInExercises } from '../data/exercises';
import { ensureBuiltInExerciseIdentity } from './adminExerciseIdentity';

const api = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('./supabase', () => ({
  getAdminSession: () => ({
    accessToken: 'admin-token',
    userId: 'admin-user',
  }),
  supabaseRequest: api.request,
}));

describe('built-in exercise media identity', () => {
  beforeEach(() => api.request.mockReset());

  it('reuses a global stable-key identity instead of creating a duplicate', async () => {
    api.request.mockResolvedValueOnce([
      { id: 'global-push-up', stable_key: 'push-up', is_published: true },
    ]);
    const pushUp = builtInExercises.find((exercise) => exercise.nameEn === 'Push-Up')!;

    await expect(ensureBuiltInExerciseIdentity(pushUp)).resolves.toEqual({
      id: 'global-push-up',
      stableKey: 'push-up',
      isPublished: true,
      created: false,
    });
    expect(api.request).not.toHaveBeenCalledWith(
      '/rest/v1/global_exercises',
      expect.objectContaining({ method: 'POST' }),
      'admin-token',
    );
    expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_translations?on_conflict=exercise_id,locale',
      expect.objectContaining({ method: 'POST' }),
      'admin-token',
    );
  });

  it('creates one public backing row and translations for an unpersisted built-in', async () => {
    api.request
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const pushUp = builtInExercises.find((exercise) => exercise.nameEn === 'Push-Up')!;

    const identity = await ensureBuiltInExerciseIdentity(pushUp);

    expect(identity).toMatchObject({
      stableKey: 'push-up',
      isPublished: true,
      created: true,
    });
    const exerciseInsert = api.request.mock.calls.find(
      ([path, options]) =>
        path === '/rest/v1/global_exercises' && options?.method === 'POST',
    );
    expect(JSON.parse(exerciseInsert?.[1].body as string)).toMatchObject({
      stable_key: 'push-up',
      movement_family: 'Push-Up',
      category: 'push',
      is_published: true,
    });
    const translationInsert = api.request.mock.calls.find(([path]) =>
      String(path).startsWith('/rest/v1/exercise_translations?on_conflict='));
    expect(JSON.parse(translationInsert?.[1].body as string)[0]).toMatchObject({
      exercise_id: identity.id,
      locale: 'en',
      name: 'Push-Up',
    });
  });

  it('resolves a concurrent stable-key insert without creating a second identity', async () => {
    api.request
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('unique_violation'))
      .mockResolvedValueOnce([
        { id: 'concurrent-push-up', stable_key: 'push-up', is_published: true },
      ]);
    const pushUp = builtInExercises.find((exercise) => exercise.nameEn === 'Push-Up')!;

    await expect(ensureBuiltInExerciseIdentity(pushUp)).resolves.toMatchObject({
      id: 'concurrent-push-up',
      created: false,
    });
  });
});
