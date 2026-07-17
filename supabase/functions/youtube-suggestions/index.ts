import { corsHeaders } from 'npm:@supabase/supabase-js@^2/cors';

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const env = (name: string) => Deno.env.get(name) ?? '';
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
  if (request.method !== 'POST') return reply({ code: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('Authorization') ?? '';
  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const youtubeKey = env('YOUTUBE_DATA_API_KEY');
  if (!authorization.startsWith('Bearer ') || !supabaseUrl || !serviceKey)
    return reply({ code: 'unauthorized' }, 401);
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: serviceKey },
  });
  if (!userResponse.ok) return reply({ code: 'unauthorized' }, 401);
  const user = await userResponse.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=id`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
  );
  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  if (!profiles.length) return reply({ code: 'forbidden' }, 403);
  if (!youtubeKey) return reply({ code: 'missing_api_key' }, 503);

  const payload = await request.json().catch(() => ({}));
  const query = typeof payload.query === 'string' ? payload.query.trim() : '';
  if (query.length < 3 || query.length > 160) return reply({ code: 'invalid_query' }, 400);
  const normalizedQuery = normalize(query);
  const cacheHeaders = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const cachedResponse = await fetch(
    `${supabaseUrl}/rest/v1/youtube_suggestion_cache?normalized_query=eq.${encodeURIComponent(normalizedQuery)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=results&limit=1`,
    { headers: cacheHeaders },
  );
  const cached = cachedResponse.ok ? await cachedResponse.json() : [];
  if (cached[0]?.results) return reply({ results: cached[0].results, cached: true });

  try {
    const search = new URL('https://www.googleapis.com/youtube/v3/search');
    search.search = new URLSearchParams({
      part: 'snippet', q: query, type: 'video', maxResults: '8',
      videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'moderate', key: youtubeKey,
    }).toString();
    const searchResponse = await fetch(search);
    if (searchResponse.status === 403 || searchResponse.status === 429)
      return reply({ code: 'quota_exceeded' }, 429);
    if (!searchResponse.ok) return reply({ code: 'youtube_unavailable' }, 502);
    const searchBody = await searchResponse.json();
    const ids = searchBody.items.map((item: { id?: { videoId?: string } }) => item.id?.videoId).filter(Boolean);
    if (!ids.length) return reply({ results: [] });
    const details = new URL('https://www.googleapis.com/youtube/v3/videos');
    details.search = new URLSearchParams({
      part: 'snippet,contentDetails,status', id: ids.join(','), key: youtubeKey,
    }).toString();
    const detailResponse = await fetch(details);
    if (!detailResponse.ok) return reply({ code: 'youtube_unavailable' }, 502);
    const detailBody = await detailResponse.json();
    const results = detailBody.items
      .filter((item: { status?: { embeddable?: boolean; privacyStatus?: string }; snippet?: { liveBroadcastContent?: string } }) =>
        item.status?.embeddable === true &&
        item.status?.privacyStatus === 'public' &&
        item.snippet?.liveBroadcastContent === 'none')
      .slice(0, 8)
      .map((item: { id: string; snippet: Record<string, unknown>; contentDetails?: { duration?: string } }) => ({
        videoId: item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: (item.snippet.thumbnails as { medium?: { url?: string }; default?: { url?: string } })?.medium?.url ??
          (item.snippet.thumbnails as { default?: { url?: string } })?.default?.url,
        duration: item.contentDetails?.duration,
      }));
    await fetch(`${supabaseUrl}/rest/v1/youtube_suggestion_cache?on_conflict=normalized_query`, {
      method: 'POST',
      headers: { ...cacheHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        normalized_query: normalizedQuery,
        results,
        expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      }),
    });
    return reply({ results, cached: false });
  } catch {
    return reply({ code: 'youtube_unavailable' }, 502);
  }
  } catch {
    return reply({ code: 'unexpected_error' }, 500);
  }
});
