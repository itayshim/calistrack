import { ExternalLink, PlayCircle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../hooks/useI18n';
import { getSupabasePublicUrl } from '../services/supabase';
import {
  loadPublishedExerciseMedia,
  subscribeToExerciseMediaInvalidation,
} from '../services/exerciseMedia';
import type { Exercise, ExerciseMedia } from '../types';
import {
  getExerciseInstructions,
  getExerciseMistakes,
  getExerciseName,
  hasExerciseDemonstration,
} from '../utils/exerciseLocalization';
import { parseYouTubeVideoId, youtubeEmbedUrl } from '../utils/youtube';

export function ExerciseDemonstrationButton({
  exercise,
  className = '',
}: {
  exercise: Exercise;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!hasExerciseDemonstration(exercise)) return null;

  return (
    <>
      <button
        type="button"
        className={`btn-secondary ${className}`}
        onClick={() => setOpen(true)}
      >
        <PlayCircle size={19} />
        {t('howToPerform')}
      </button>
      {open && (
        <ExerciseDemonstrationSheet exercise={exercise} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ExerciseDemonstrationSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const initialMedia = useMemo(
    () =>
      (exercise.media ?? [])
        .filter((item) => item.isPublished)
        .sort(
          (a, b) =>
            Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
        ),
    [exercise.media],
  );
  const [media, setMedia] = useState(initialMedia);
  const [mediaState, setMediaState] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(media[0]?.id);
  const instructions = getExerciseInstructions(exercise, language);
  const mistakes = getExerciseMistakes(exercise, language);
  const selected = media.find((item) => item.id === selectedId) ?? media[0];

  useEffect(() => {
    let active = true;
    const refresh = async (force = false) => {
      setMediaState('loading');
      try {
        const next = await loadPublishedExerciseMedia(exercise, { force });
        if (!active) return;
        setMedia(next);
        setSelectedId(next[0]?.id);
        setMediaState('loaded');
      } catch {
        if (active) setMediaState('error');
      }
    };
    void refresh();
    const unsubscribe = subscribeToExerciseMediaInvalidation((identity) => {
      const matches =
        (identity.canonicalExerciseId &&
          identity.canonicalExerciseId === exercise.canonicalExerciseId) ||
        (identity.stableKey && identity.stableKey === exercise.stableKey);
      if (matches) void refresh(true);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [exercise]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-demonstration-title"
        className="modal-surface max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-2xl sm:rounded-[2rem] sm:p-7"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t('demonstration')}</p>
            <h2 id="exercise-demonstration-title" className="mt-1 text-3xl font-black">
              {getExerciseName(exercise, language)}
            </h2>
          </div>
          <button type="button" className="icon-button shrink-0" aria-label={t('dismiss')} onClick={onClose}>
            <X />
          </button>
        </header>

        {mediaState === 'loading' && !selected && (
          <p className="surface-subtle mt-5 rounded-2xl p-4" role="status">
            {t('loadingDemonstrationMedia')}
          </p>
        )}
        {mediaState === 'error' && !selected && (
          <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-red-700 dark:text-red-200" role="alert">
            {t('demonstrationMediaLoadFailed')}
          </p>
        )}
        {mediaState === 'loaded' && !selected && (
          <p className="surface-subtle mt-5 rounded-2xl p-4">
            {t('noPublishedDemonstrationMedia')}
          </p>
        )}
        {selected && <div className="mt-5"><MediaItem item={selected} exercise={exercise} /></div>}
        {media.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {media.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={selected?.id === item.id}
                onClick={() => setSelectedId(item.id)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-black ${
                  selected?.id === item.id
                    ? 'bg-brand text-ink'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/[.07] dark:text-slate-300'
                }`}
              >
                {item.title || `${t('media')} ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        {!!instructions.length && (
          <section className="mt-6">
            <h3 className="text-xl font-black">{t('howToPerform')}</h3>
            <ol className="mt-3 space-y-3">
              {instructions.map((instruction, index) => (
                <li key={`${index}-${instruction}`} className="surface-subtle flex gap-3 rounded-2xl p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-ink">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 font-semibold">{instruction}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!mistakes.length && (
          <section className="mt-6">
            <h3 className="text-xl font-black">{t('watchOutFor')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {mistakes.map((mistake) => <li key={mistake}>• {mistake}</li>)}
            </ul>
          </section>
        )}
      </section>
    </div>,
    document.body,
  );
}

function MediaItem({ item, exercise }: { item: ExerciseMedia; exercise: Exercise }) {
  const { language, t } = useI18n();
  const accessibleName = item.title || `${getExerciseName(exercise, language)} ${t('demonstration')}`;
  const videoId = item.externalUrl ? parseYouTubeVideoId(item.externalUrl) : null;
  if (item.mediaType === 'youtube') {
    if (import.meta.env.DEV) {
      console.debug('[CalisTrack media]', {
        mediaType: 'youtube',
        youtubeParsingSucceeded: Boolean(videoId),
      });
    }
    if (videoId)
      return (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            className="h-full w-full"
            src={youtubeEmbedUrl(videoId)}
            title={accessibleName}
            loading="lazy"
            allowFullScreen
          />
        </div>
      );
    return (
      <div className="surface-subtle rounded-2xl p-4">
        <p className="font-bold">{t('invalidYoutubeMedia')}</p>
        {item.externalUrl && (
          <a
            className="btn-secondary mt-3 w-full"
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} />
            {t('openVideo')}
          </a>
        )}
      </div>
    );
  }
  if (item.mediaType === 'uploaded_video' && item.storagePath)
    return (
      <video
        className="aspect-video w-full rounded-2xl bg-black"
        controls
        preload="metadata"
        src={getSupabasePublicUrl(item.storagePath)}
        aria-label={accessibleName}
      />
    );
  if (item.mediaType === 'image' && item.storagePath)
    return (
      <img
        className="max-h-[55vh] w-full rounded-2xl object-contain"
        src={getSupabasePublicUrl(item.storagePath)}
        alt={accessibleName}
      />
    );
  if (item.mediaType === 'external_link' && item.externalUrl)
    return (
      <a className="btn-secondary w-full" href={item.externalUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={18} />
        {item.title || t('openExternalMedia')}
      </a>
    );
  return item.description ? <p className="surface-subtle rounded-2xl p-4">{item.description}</p> : null;
}
