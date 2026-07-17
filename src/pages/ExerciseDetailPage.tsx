import { ArrowLeft, CheckCircle2, Dumbbell, Lightbulb, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Badge, IconTile } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
import { getSupabasePublicUrl } from '../services/supabase';
import { parseYouTubeVideoId, youtubeEmbedUrl } from '../utils/youtube';
export function ExerciseDetailPage() {
  const { id } = useParams(),
    exercise = useAppStore((s) => s.exercises.find((e) => e.id === id)),
    { language, t } = useI18n(),
    [showMedia, setShowMedia] = useState(false);
  if (!exercise) return <div className="card">This exercise is no longer available.</div>;
  return (
    <article className="mx-auto max-w-3xl">
      <Link
        to="/exercises"
        className="mb-7 inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Exercise library
      </Link>
      <section className="relative overflow-hidden rounded-4xl bg-brand p-7 text-ink shadow-glow sm:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[32px] border-ink/[.06]" />
        <Badge>
          {exercise.category.toUpperCase()} · {exercise.difficulty.toUpperCase()}
        </Badge>
        <div className="mt-12 grid h-20 w-20 place-items-center rounded-3xl bg-ink text-brand">
          <Dumbbell size={36} />
        </div>
        <h1 className="relative mt-6 text-5xl font-black leading-none tracking-[-.06em] sm:text-6xl">
          {language === 'he' ? exercise.nameHe : exercise.nameEn}
        </h1>
        <p className="relative mt-4 max-w-xl text-lg font-semibold opacity-70">
          {language === 'he' ? exercise.descriptionHe ?? exercise.description : exercise.description}
        </p>
      </section>
      <div className="mt-6 grid gap-5">
        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <IconTile>
              <Lightbulb />
            </IconTile>
            <h2 className="text-2xl font-black">How to perform it</h2>
          </div>
          <ol className="space-y-4">
            {(language === 'he' ? exercise.instructionsHe ?? exercise.instructions : exercise.instructions).map((instruction, index) => (
              <li key={instruction} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-ink">
                  {index + 1}
                </span>
                <p className="pt-1 font-semibold text-slate-300">{instruction}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <IconTile tone="orange">
              <TriangleAlert />
            </IconTile>
            <h2 className="text-2xl font-black">Watch out for</h2>
          </div>
          <ul className="space-y-3">
            {(language === 'he' ? exercise.commonMistakesHe ?? exercise.commonMistakes : exercise.commonMistakes).map((mistake) => (
              <li
                key={mistake}
                className="flex items-center gap-3 rounded-2xl bg-orange-500/[.07] p-4 font-semibold text-slate-300"
              >
                <CheckCircle2 size={19} className="text-orange-300" />
                {mistake}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {!!exercise.media?.filter((item) => item.isPublished).length && (
        <section className="card mt-5">
          <h2 className="text-2xl font-black">{t('demonstration')}</h2>
          <button className="btn-primary mt-4" aria-pressed={showMedia} onClick={() => setShowMedia((value) => !value)}>
            {showMedia ? t('hideDemonstration') : t('showDemonstration')}
          </button>
          {showMedia && <div className="mt-4 space-y-4">
            {exercise.media.filter((item) => item.isPublished).map((item) => {
              const videoId = item.externalUrl ? parseYouTubeVideoId(item.externalUrl) : null;
              if (item.mediaType === 'youtube' && videoId) return <div key={item.id} className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe loading="lazy" className="h-full w-full" src={youtubeEmbedUrl(videoId)} title={item.title ?? `${exercise.nameEn} demonstration`} allowFullScreen /></div>;
              if (item.mediaType === 'external_link' && item.externalUrl) return <a key={item.id} className="btn-secondary" href={item.externalUrl} target="_blank" rel="noreferrer">{item.title ?? item.externalUrl}</a>;
              if (item.mediaType === 'image' && item.storagePath) return <img key={item.id} className="w-full rounded-2xl object-cover" loading="lazy" src={getSupabasePublicUrl(item.storagePath)} alt={item.title ?? exercise.nameEn} />;
              if (item.mediaType === 'uploaded_video' && item.storagePath) return <video key={item.id} className="aspect-video w-full rounded-2xl bg-black" controls preload="metadata" src={getSupabasePublicUrl(item.storagePath)} aria-label={item.title ?? `${exercise.nameEn} demonstration`} />;
              return null;
            })}
          </div>}
        </section>
      )}
    </article>
  );
}
