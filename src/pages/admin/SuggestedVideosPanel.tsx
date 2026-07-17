import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { getAdminSession, supabaseRequest } from '../../services/supabase';
import { searchSuggestedVideos, type SuggestedVideo } from '../../services/youtubeSuggestions';
import { youtubeEmbedUrl } from '../../utils/youtube';

export function SuggestedVideosPanel({
  exerciseId,
  exerciseName,
  sortOrder,
  onSelected,
}: {
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  onSelected: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuggestedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const search = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      setResults(await searchSuggestedVideos(query));
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(code.includes('quota') || code.includes('429') ? t('youtubeQuotaExceeded')
        : code.includes('unauthorized') || code.includes('forbidden') ? t('youtubeUnauthorized')
          : code.includes('missing_api_key') ? t('youtubeKeyMissing') : t('youtubeUnavailable'));
    } finally { setLoading(false); }
  };
  const select = async (video: SuggestedVideo) => {
    const session = getAdminSession();
    if (!session || !exerciseId) return setError(t('youtubeUnauthorized'));
    await supabaseRequest('/rest/v1/exercise_media', {
      method: 'POST',
      body: JSON.stringify({
        exercise_id: exerciseId, media_type: 'youtube', provider: 'youtube',
        title: video.title, external_url: video.url, sort_order: sortOrder,
        is_primary: false, is_published: false, created_by: session.userId,
      }),
    }, session.accessToken);
    setPreview(video.videoId);
    await onSelected();
  };
  return (
    <>
      <button type="button" className="btn-secondary w-full sm:w-auto" disabled={!exerciseId} onClick={() => {
        setQuery((current) => current || `${exerciseName} tutorial proper form calisthenics`);
        setOpen(true);
      }}>{t('findSuggestedVideos')}</button>
      {open && <section className="surface-subtle rounded-3xl p-4" aria-label={t('suggestedVideos')}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{t('suggestedVideos')}</h3><button type="button" className="icon-button h-10 w-10" aria-label={t('close')} onClick={() => setOpen(false)}>×</button></div>
        <label className="mt-4 block"><span className="label normal-case">{t('searchQuery')}</span><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button type="button" className="btn-primary mt-3 w-full sm:w-auto" disabled={loading || query.trim().length < 3} onClick={search}>{loading ? t('loading') : t('searchYoutube')}</button>
        <p className="mt-4 rounded-2xl bg-orange-500/10 p-3 text-sm font-semibold text-orange-700 dark:text-orange-200">{t('reviewVideoWarning')}</p>
        {error && <p role="alert" className="mt-3 text-red-500">{error}</p>}
        {!loading && !error && results.length === 0 && <p className="mt-3 text-slate-500">{t('noSuitableVideos')}</p>}
        {preview && <div className="mt-4 aspect-video overflow-hidden rounded-2xl"><iframe className="h-full w-full" src={youtubeEmbedUrl(preview).replace('youtube.com', 'youtube-nocookie.com')} title={t('youtubePreview')} allowFullScreen /></div>}
        <div className="mt-4 grid gap-3">{results.map((video) => <article key={video.videoId} className="surface-panel grid gap-3 rounded-2xl p-3 sm:grid-cols-[9rem_1fr]">
          {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="aspect-video w-full rounded-xl object-cover" />}
          <div className="min-w-0"><strong dir="auto" className="block break-words">{video.title}</strong><p dir="auto" className="text-sm text-slate-500">{video.channelTitle}</p><p className="text-xs text-slate-500"><bdi>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : ''}{video.duration ? ` · ${video.duration}` : ''}</bdi></p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-10 px-3" onClick={() => setPreview(video.videoId)}>{t('preview')}</button><button type="button" className="btn-primary min-h-10 px-3" onClick={() => select(video)}>{t('selectVideo')}</button></div></div>
        </article>)}</div>
      </section>}
    </>
  );
}
