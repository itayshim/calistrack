import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtInExercises } from '../data/exercises';

const api = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  supabaseRequest: api.request,
}));

import {
  clearExerciseMediaCacheForTests,
  invalidatePublishedExerciseMedia,
  loadPublishedExerciseMedia,
} from './exerciseMedia';

const incline = builtInExercises.find(
  (exercise) => exercise.stableKey === 'incline-push-up',
)!;

const youtubeRow = {
  id: 'media-youtube',
  exercise_id: 'canonical-incline',
  media_type: 'youtube',
  provider: 'youtube',
  title: 'Incline demonstration',
  external_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  sort_order: 2,
  is_primary: false,
  is_published: true,
};

describe('published exercise media retrieval', () => {
  beforeEach(() => {
    clearExerciseMediaCacheForTests();
    api.request.mockReset();
  });

  it('resolves a built-in enriched exercise by stable key and returns published YouTube media', async () => {
    api.request
      .mockResolvedValueOnce([
        { id: 'canonical-incline', stable_key: 'incline-push-up' },
      ])
      .mockResolvedValueOnce([youtubeRow]);

    const media = await loadPublishedExerciseMedia(incline);

    expect(api.request.mock.calls[0][0]).toContain(
      'stable_key=eq.incline-push-up',
    );
    expect(api.request.mock.calls[1][0]).toContain(
      'exercise_id=eq.canonical-incline',
    );
    expect(media).toEqual([
      expect.objectContaining({
        mediaType: 'youtube',
        isPublished: true,
      }),
    ]);
  });

  it('uses a canonical ID directly and does not require a primary item', async () => {
    api.request.mockResolvedValueOnce([youtubeRow]);
    const media = await loadPublishedExerciseMedia({
      ...incline,
      canonicalExerciseId: 'canonical-incline',
    });
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(api.request.mock.calls[0][0]).toContain(
      'exercise_id=eq.canonical-incline',
    );
    expect(media).toHaveLength(1);
  });

  it('orders primary media first and keeps unpublished media hidden', async () => {
    api.request.mockResolvedValueOnce([
      youtubeRow,
      { ...youtubeRow, id: 'draft', is_published: false, sort_order: -1 },
      { ...youtubeRow, id: 'primary', is_primary: true, sort_order: 9 },
    ]);
    const media = await loadPublishedExerciseMedia({
      ...incline,
      canonicalExerciseId: 'canonical-incline',
    });
    expect(media.map((item) => item.id)).toEqual(['primary', 'media-youtube']);
  });

  it('invalidates stale media after an administrator publishes a change', async () => {
    api.request
      .mockResolvedValueOnce([youtubeRow])
      .mockResolvedValueOnce([{ ...youtubeRow, id: 'newly-published' }]);
    const exercise = {
      ...incline,
      canonicalExerciseId: 'canonical-incline',
    };
    expect((await loadPublishedExerciseMedia(exercise))[0].id).toBe('media-youtube');
    expect((await loadPublishedExerciseMedia(exercise))[0].id).toBe('media-youtube');
    expect(api.request).toHaveBeenCalledTimes(1);

    invalidatePublishedExerciseMedia({
      canonicalExerciseId: 'canonical-incline',
      stableKey: 'incline-push-up',
    });

    expect((await loadPublishedExerciseMedia(exercise))[0].id).toBe(
      'newly-published',
    );
    expect(api.request).toHaveBeenCalledTimes(2);
  });
});
