import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ fn: vi.fn(), session: vi.fn() }));
vi.mock('./supabase', () => ({
  getAdminSession: api.session,
  supabaseFunctionRequest: api.fn,
}));

import { searchSuggestedVideos } from './youtubeSuggestions';

describe('administrator YouTube suggestions', () => {
  beforeEach(() => { api.fn.mockReset(); api.session.mockReset(); });

  it('rejects anonymous users before calling the protected endpoint', async () => {
    api.session.mockReturnValue(null);
    await expect(searchSuggestedVideos('Incline Push-Up tutorial')).rejects.toThrow('unauthorized');
    expect(api.fn).not.toHaveBeenCalled();
  });

  it('calls the protected function with the administrator token', async () => {
    api.session.mockReturnValue({ accessToken: 'admin-token' });
    api.fn.mockResolvedValue({ results: [{ videoId: 'abc', url: 'https://www.youtube.com/watch?v=abc', title: 'Form', channelTitle: 'Coach' }] });
    await expect(searchSuggestedVideos('Incline Push-Up tutorial')).resolves.toHaveLength(1);
    expect(api.fn).toHaveBeenCalledWith('youtube-suggestions', { query: 'Incline Push-Up tutorial' }, 'admin-token');
  });

  it('contains no client-side YouTube API key', () => {
    expect(import.meta.env.VITE_YOUTUBE_API_KEY).toBeUndefined();
  });
});
