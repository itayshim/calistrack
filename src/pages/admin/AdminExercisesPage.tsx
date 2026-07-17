import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminSession, supabaseRequest } from '../../services/supabase';

interface AdminExercise {
  id: string;
  stable_key: string;
  movement_family: string;
  is_published: boolean;
  exercise_translations: Array<{ locale: string; name: string; description?: string; instructions: string[] }>;
  exercise_media: Array<{ id: string; is_published: boolean }>;
}

export function AdminExercisesPage() {
  const [items, setItems] = useState<AdminExercise[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [missing, setMissing] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => {
    const token = getAdminSession()?.accessToken;
    if (!token) return;
    supabaseRequest<AdminExercise[]>('/rest/v1/global_exercises?select=*,exercise_translations(*),exercise_media(*)', {}, token)
      .then(setItems)
      .catch((reason: Error) => setError(reason.message));
  }, []);
  const visible = useMemo(() => items.filter((item) => {
    const names = item.exercise_translations.map((translation) => translation.name).join(' ');
    const hasHe = item.exercise_translations.some((translation) => translation.locale === 'he' && translation.description && translation.instructions.length);
    const hasVideo = item.exercise_media.length > 0;
    return `${item.stable_key} ${names}`.toLowerCase().includes(query.toLowerCase())
      && (status === 'all' || (status === 'published') === item.is_published)
      && (missing === 'all' || (missing === 'video' ? !hasVideo : !hasHe));
  }), [items, missing, query, status]);
  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-black">Shared exercises</h1>
      <div className="my-5 grid gap-2 sm:grid-cols-3">
        <input aria-label="Search shared exercises" className="field" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Publication filter" className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Published and drafts</option><option value="published">Published</option><option value="draft">Drafts</option></select>
        <select aria-label="Missing content filter" className="field" value={missing} onChange={(event) => setMissing(event.target.value)}><option value="all">All content</option><option value="video">Missing video</option><option value="hebrew">Missing Hebrew</option></select>
      </div>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((item) => {
          const en = item.exercise_translations.find((translation) => translation.locale === 'en');
          const he = item.exercise_translations.find((translation) => translation.locale === 'he');
          return <Link key={item.id} to={`/admin/exercises/${item.id}`} className="card">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-black">{en?.name ?? item.stable_key}</h2><p dir="rtl" className="text-slate-400">{he?.name ?? 'Missing Hebrew name'}</p></div><span className="chip">{item.is_published ? 'Published' : 'Draft'}</span></div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="chip">{item.movement_family}</span><span className="chip">{item.exercise_media.length ? 'Has media' : 'Missing video'}</span><span className="chip">{he?.description ? 'Hebrew complete' : 'Missing Hebrew'}</span></div>
          </Link>;
        })}
      </div>
    </main>
  );
}
