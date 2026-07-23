import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useI18n } from '../../hooks/useI18n';
import {
  addPublishedYouTubeMedia,
  findDuplicateYouTubeMedia,
} from '../../services/adminExerciseMedia';
import { searchSuggestedVideos, type SuggestedVideo } from '../../services/youtubeSuggestions';
import { useAppStore } from '../../store/useAppStore';
import type { ExerciseMedia } from '../../types';
import { youtubeEmbedUrl } from '../../utils/youtube';

export function SuggestedVideosPanel({
  exerciseId,
  exerciseName,
  sortOrder,
  existingMedia,
  onSelected,
  resolveExerciseId,
}: {
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  existingMedia: ExerciseMedia[];
  onSelected: (mediaId: string) => Promise<void>;
  resolveExerciseId?: () => Promise<string>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuggestedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [addingVideoId, setAddingVideoId] = useState('');
  const [pendingVideo, setPendingVideo] = useState<SuggestedVideo | null>(null);
  const [resolvedExerciseId, setResolvedExerciseId] = useState(exerciseId);
  const [preparing, setPreparing] = useState(false);

  const search = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchSuggestedVideos(query));
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(code.includes('quota') || code.includes('429') ? t('youtubeQuotaExceeded')
        : code.includes('unauthorized') || code.includes('forbidden') ? t('youtubeUnauthorized')
          : code.includes('missing_api_key') ? t('youtubeKeyMissing') : t('youtubeUnavailable'));
    } finally {
      setLoading(false);
    }
  };

  const add = async (video: SuggestedVideo) => {
    const targetExerciseId = resolvedExerciseId || exerciseId;
    if (addingVideoId || !targetExerciseId) return;
    setAddingVideoId(video.videoId);
    setError('');
    try {
      const result = await addPublishedYouTubeMedia({
        exerciseId: targetExerciseId,
        title: video.title,
        url: video.url,
        sortOrder,
      });
      if (result.status === 'duplicate') {
        setError(t('youtubeVideoAlreadyAdded'));
        return;
      }
      await onSelected(result.mediaId);
      useAppStore.getState().setToast(t('videoAddedAndPublished'));
      setOpen(false);
      setPreview('');
      setResults([]);
    } catch {
      setError(t('unableToSave'));
    } finally {
      setAddingVideoId('');
      setPendingVideo(null);
    }
  };

  const select = (video: SuggestedVideo) => {
    if (findDuplicateYouTubeMedia(existingMedia, video.url)) {
      setError(t('youtubeVideoAlreadyAdded'));
      return;
    }
    if (existingMedia.length > 0) {
      setPendingVideo(video);
      return;
    }
    void add(video);
  };

  return (
    <>
      <button
        type="button"
        className="btn-secondary w-full sm:w-auto"
        disabled={preparing || (!exerciseId && !resolveExerciseId)}
        onClick={async () => {
          if (preparing) return;
          setError('');
          setPreparing(true);
          try {
            const targetExerciseId =
              exerciseId || resolvedExerciseId || (await resolveExerciseId?.()) || '';
            if (!targetExerciseId) {
              setError(t('saveExerciseBeforeSuggestions'));
              return;
            }
            setResolvedExerciseId(targetExerciseId);
            setQuery((current) => current || `${exerciseName} tutorial proper form calisthenics`);
            setOpen(true);
          } catch {
            setError(t('unableToPrepareExerciseMedia'));
          } finally {
            setPreparing(false);
          }
        }}
      >
        {preparing ? t('preparingExerciseMedia') : t('findSuggestedVideos')}
      </button>
      {!exerciseId && !resolveExerciseId && (
        <p className="mt-2 text-sm text-slate-500">{t('saveExerciseBeforeSuggestions')}</p>
      )}
      {!open && error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
      {open && (
        <section className="surface-subtle rounded-3xl p-4" aria-label={t('suggestedVideos')}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">{t('suggestedVideos')}</h3>
            <button type="button" className="icon-button h-10 w-10" aria-label={t('close')} onClick={() => setOpen(false)}>×</button>
          </div>
          <label className="mt-4 block">
            <span className="label normal-case">{t('searchQuery')}</span>
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="button" className="btn-primary mt-3 w-full sm:w-auto" disabled={loading || query.trim().length < 3} onClick={search}>
            {loading ? t('loading') : t('searchYoutube')}
          </button>
          <p className="mt-4 rounded-2xl bg-orange-500/10 p-3 text-sm font-semibold text-orange-700 dark:text-orange-200">{t('reviewVideoWarning')}</p>
          {error && <p role="alert" className="mt-3 text-red-500">{error}</p>}
          {!loading && !error && results.length === 0 && <p className="mt-3 text-slate-500">{t('noSuitableVideos')}</p>}
          {preview && (
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl">
              <iframe className="h-full w-full" src={youtubeEmbedUrl(preview)} title={t('youtubePreview')} allowFullScreen />
            </div>
          )}
          <div className="mt-4 grid gap-3">
            {results.map((video) => (
              <article key={video.videoId} className="surface-panel grid gap-3 rounded-2xl p-3 sm:grid-cols-[9rem_1fr]">
                {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="aspect-video w-full rounded-xl object-cover" />}
                <div className="min-w-0">
                  <strong dir="auto" className="block break-words">{video.title}</strong>
                  <p dir="auto" className="text-sm text-slate-500">{video.channelTitle}</p>
                  <p className="text-xs text-slate-500">
                    <bdi>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : ''}{video.duration ? ` · ${video.duration}` : ''}</bdi>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary min-h-10 px-3" onClick={() => setPreview(video.videoId)}>{t('preview')}</button>
                    <button type="button" className="btn-primary min-h-10 px-3" disabled={Boolean(addingVideoId)} onClick={() => select(video)}>
                      {addingVideoId === video.videoId ? t('addingVideo') : t('selectVideo')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <ConfirmDialog
        open={pendingVideo !== null}
        title={t('addAnotherVideoTitle')}
        description={t('addAnotherVideoBody')}
        confirmLabel={t('addVideo')}
        cancelLabel={t('cancel')}
        onClose={() => setPendingVideo(null)}
        onConfirm={() => {
          if (pendingVideo) void add(pendingVideo);
        }}
      />
    </>
  );
}
