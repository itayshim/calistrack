import { describe, expect, it } from 'vitest';
import { parseYouTubeVideoId, youtubeEmbedUrl } from './youtube';

describe('YouTube media', () => {
  const id = 'dQw4w9WgXcQ';
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&feature=shared&t=20`,
  ])('parses %s', (url) => expect(parseYouTubeVideoId(url)).toBe(id));
  it('rejects invalid URLs and uses a privacy-conscious non-autoplay embed', () => {
    expect(parseYouTubeVideoId('not youtube')).toBeNull();
    expect(youtubeEmbedUrl(id)).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
    expect(youtubeEmbedUrl(id)).not.toContain('autoplay');
  });
});
