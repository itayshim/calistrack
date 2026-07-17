import type { ExerciseMedia } from '../types';
import { parseYouTubeVideoId } from '../utils/youtube';
import { getAdminSession, supabaseRequest } from './supabase';

export interface AddYouTubeMediaInput {
  exerciseId: string;
  title: string;
  url: string;
  sortOrder: number;
}

interface AddYouTubeMediaRow {
  media_id: string;
  was_added: boolean;
  is_primary: boolean;
}

export type AddYouTubeMediaResult =
  | { status: 'duplicate' }
  | { status: 'added'; mediaId: string; isPrimary: boolean };

export function findDuplicateYouTubeMedia(
  media: ExerciseMedia[],
  url: string,
): ExerciseMedia | undefined {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) return undefined;
  return media.find(
    (item) =>
      item.mediaType === 'youtube' &&
      item.externalUrl &&
      parseYouTubeVideoId(item.externalUrl) === videoId,
  );
}

export async function addPublishedYouTubeMedia(
  input: AddYouTubeMediaInput,
): Promise<AddYouTubeMediaResult> {
  const session = getAdminSession();
  const videoId = parseYouTubeVideoId(input.url);
  if (!session || !videoId) throw new Error('invalid_youtube_media');

  const rows = await supabaseRequest<AddYouTubeMediaRow[]>(
    '/rest/v1/rpc/admin_add_youtube_media',
    {
      method: 'POST',
      body: JSON.stringify({
        p_exercise_id: input.exerciseId,
        p_video_id: videoId,
        p_title: input.title,
        p_sort_order: input.sortOrder,
      }),
    },
    session.accessToken,
  );
  const result = rows[0];
  if (!result?.was_added) return { status: 'duplicate' };
  return {
    status: 'added',
    mediaId: result.media_id,
    isPrimary: result.is_primary,
  };
}

export interface CleanupCandidate {
  id: string;
  isPrimary: boolean;
  isPublished: boolean;
  createdAt: string;
}

export function chooseYouTubeDuplicateKeeper(
  candidates: CleanupCandidate[],
): CleanupCandidate | undefined {
  return [...candidates].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      Number(b.isPublished) - Number(a.isPublished) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];
}
