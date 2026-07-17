import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { getAdminSession, supabaseRequest } from '../../services/supabase';
import { builtInExercises } from '../../data/exercises';

interface AdminExercise {
  id: string;
  stable_key: string;
  movement_family: string;
  category: string;
  difficulty: string;
  is_published: boolean;
  updated_at?: string;
  source?: 'built-in' | 'global';
  exercise_translations: Array<{ locale: string; name: string; description?: string; instructions: string[] }>;
  exercise_media: Array<{ id: string; is_published: boolean }>;
}

export function AdminExercisesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminExercise[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [missing, setMissing] = useState('all');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => {
    const token = getAdminSession()?.accessToken;
    if (!token) return;
    supabaseRequest<AdminExercise[]>('/rest/v1/global_exercises?select=*,exercise_translations(*),exercise_media(*)', {}, token)
      .then((globalItems) => {
        const byKey = new Map<string, AdminExercise>(
          globalItems.map((item) => [item.stable_key, { ...item, source: 'global' as const }]),
        );
        builtInExercises.forEach((exercise) => {
          const key = exercise.stableKey ?? exercise.id.replace(/^builtin-/, '');
          if (!byKey.has(key)) byKey.set(key, {
            id: `builtin:${key}`,
            stable_key: key,
            movement_family: exercise.movementFamily ?? exercise.category,
            category: exercise.category,
            difficulty: exercise.difficulty,
            is_published: false,
            source: 'built-in',
            exercise_translations: [
              { locale: 'en', name: exercise.nameEn, description: exercise.description, instructions: exercise.instructions },
              { locale: 'he', name: exercise.nameHe, description: exercise.descriptionHe, instructions: exercise.instructionsHe ?? [] },
            ],
            exercise_media: [],
          });
        });
        setItems([...byKey.values()]);
      })
      .catch(() => setError(t('unableToLoadExercises')));
  }, [t]);
  const visible = useMemo(() => items.filter((item) => {
    const names = item.exercise_translations.map((translation) => translation.name).join(' ');
    const hasHe = item.exercise_translations.some((translation) => translation.locale === 'he' && translation.description && translation.instructions.length);
    const hasVideo = item.exercise_media.length > 0;
    return `${item.stable_key} ${names}`.toLowerCase().includes(query.toLowerCase())
      && (status === 'all' || (status === 'published') === item.is_published)
      && (category === 'all' || item.category === category)
      && (difficulty === 'all' || item.difficulty === difficulty)
      && (missing === 'all' || (missing === 'video' ? !hasVideo : !hasHe));
  }), [category, difficulty, items, missing, query, status]);
  return (
    <main className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{t('exerciseManagement')}</p><h1 className="text-4xl font-black">{t('exercises')}</h1></div><Link className="btn-secondary" to="/admin/exercises/new">{t('newSharedExercise')}</Link></div>
      <div className="my-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <input aria-label={t('searchSharedExercises')} className="field" placeholder={t('search')} value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label={t('published')} className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t('allPublicationStates')}</option><option value="published">{t('publishedOnly')}</option><option value="draft">{t('draftsOnly')}</option></select>
        <select aria-label={t('missingHebrew')} className="field" value={missing} onChange={(event) => setMissing(event.target.value)}><option value="all">{t('allContent')}</option><option value="video">{t('missingVideo')}</option><option value="hebrew">{t('missingHebrew')}</option></select>
        <select aria-label={t('category')} className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t('allCategories')}</option>{['push','pull','legs','core','mobility','skill'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label={t('difficulty')} className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">{t('allDifficulties')}</option>{['beginner','intermediate','advanced'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </div>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((item) => {
          const en = item.exercise_translations.find((translation) => translation.locale === 'en');
          const he = item.exercise_translations.find((translation) => translation.locale === 'he');
          return <Link key={item.id} to={`/admin/exercises/${item.id}/edit`} className="card touch-manipulation">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-black" dir="auto">{en?.name ?? item.stable_key}</h2><p dir="auto" className="text-slate-400">{he?.name ?? t('missingHebrewName')}</p></div><span className="chip">{item.is_published ? t('published') : t('draft')}</span></div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="chip">{item.source === 'built-in' ? t('builtIn') : t('global')}</span><span className="chip" dir="auto">{item.movement_family}</span><span className="chip">{item.difficulty}</span><span className="chip">{item.exercise_media.length ? t('hasMedia') : t('missingVideo')}</span><span className="chip">{he?.description ? t('hebrewComplete') : t('missingHebrew')}</span></div>
            <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : t('notEnrichedYet')}</span><strong className="text-brand">{t('edit')}</strong></div>
          </Link>;
        })}
      </div>
    </main>
  );
}
