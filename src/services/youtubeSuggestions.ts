import { getAdminSession, supabaseFunctionRequest } from './supabase';

export interface SuggestedVideo {
  videoId: string;
  url: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  duration?: string;
}

export async function searchSuggestedVideos(query: string): Promise<SuggestedVideo[]> {
  const session = getAdminSession();
  if (!session) throw new Error('unauthorized');
  const response = await supabaseFunctionRequest<{ results: SuggestedVideo[] }>(
    'youtube-suggestions',
    { query },
    session.accessToken,
  );
  return response.results;
}
