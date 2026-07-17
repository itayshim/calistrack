import { describe, expect, it, vi } from 'vitest';
import type { ExerciseMedia } from '../types';
import {
  addPublishedYouTubeMedia,
  chooseYouTubeDuplicateKeeper,
  findDuplicateYouTubeMedia,
} from './adminExerciseMedia';
import { translations } from '../locales/translations';

const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('./supabase', () => ({
  getAdminSession: () => ({ accessToken: 'admin-token', userId: 'admin-1' }),
  supabaseRequest: api.request,
}));

const existing: ExerciseMedia = {
  id: 'media-1',
  exerciseId: 'exercise-1',
  mediaType: 'youtube',
  provider: 'youtube',
  externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  sortOrder: 0,
  isPrimary: true,
  isPublished: true,
};

describe('administrator YouTube media integrity', () => {
  it.each([
    'https://youtu.be/dQw4w9WgXcQ?t=4',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=shared',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
  ])('recognizes equivalent URLs as duplicates: %s', (url) => {
    expect(findDuplicateYouTubeMedia([existing], url)?.id).toBe('media-1');
  });

  it('uses the atomic database function and reports a published insertion', async () => {
    api.request.mockResolvedValueOnce([{
      media_id: 'new-media',
      was_added: true,
      is_primary: true,
    }]);
    await expect(addPublishedYouTubeMedia({
      exerciseId: 'exercise-1',
      title: 'Demo',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      sortOrder: 0,
    })).resolves.toEqual({ status: 'added', mediaId: 'new-media', isPrimary: true });
    expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/rpc/admin_add_youtube_media',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"p_video_id":"dQw4w9WgXcQ"'),
      }),
      'admin-token',
    );
  });

  it('treats a database conflict as a duplicate', async () => {
    api.request.mockResolvedValueOnce([{
      media_id: 'existing-media',
      was_added: false,
      is_primary: true,
    }]);
    await expect(addPublishedYouTubeMedia({
      exerciseId: 'exercise-1',
      title: 'Demo',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      sortOrder: 1,
    })).resolves.toEqual({ status: 'duplicate' });
  });

  it('keeps primary, then published, then oldest during cleanup', () => {
    expect(chooseYouTubeDuplicateKeeper([
      { id: 'old-draft', isPrimary: false, isPublished: false, createdAt: '2025-01-01' },
      { id: 'published', isPrimary: false, isPublished: true, createdAt: '2025-02-01' },
      { id: 'primary', isPrimary: true, isPublished: false, createdAt: '2025-03-01' },
    ])?.id).toBe('primary');
  });

  it('provides the requested English and Hebrew confirmation and success copy', () => {
    expect(translations.en.addAnotherVideoTitle).toBe('Add another demonstration video?');
    expect(translations.en.videoAddedAndPublished).toBe('Video added and published.');
    expect(translations.he.addAnotherVideoTitle).toBe('להוסיף סרטון הדגמה נוסף?');
    expect(translations.he.youtubeVideoAlreadyAdded).toBe('הסרטון הזה כבר נוסף לתרגיל.');
    expect(translations.he.videoAddedAndPublished).toBe('הסרטון נוסף ופורסם.');
  });
});
