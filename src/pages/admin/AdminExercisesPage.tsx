import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { getAdminSession, supabaseRequest } from '../../services/supabase';
import { builtInExercises } from '../../data/exercises';
import { Select } from '../../components/SelectMenu';
import { isExerciseVisualRegistryReady, useExerciseVisualRegistry } from '../../services/exerciseVisuals';
import {
  matchesExerciseVisualStatus,
  resolveAdminExerciseVisualSource,
  type ExerciseVisualStatusFilter,
} from '../../features/exercises/adminExerciseVisualStatus';
import {
  findActiveExerciseMergeRedirect,
  installExerciseMergeRedirects,
  loadExerciseMergeRedirects,
  type ExerciseMergeRedirect,
} from '../../services/exerciseMerges';

type ExerciseLifecycleFilter = 'active' | 'draft' | 'merged' | 'all';

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
  const [mergeRedirects, setMergeRedirects] = useState<ExerciseMergeRedirect[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ExerciseLifecycleFilter>('active');
  const [missing, setMissing] = useState('all');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [visualStatus, setVisualStatus] = useState<ExerciseVisualStatusFilter>('all');
  const [error, setError] = useState('');
  const visualRevision = useExerciseVisualRegistry();
  const visualMetadataReady = isExerciseVisualRegistryReady();
  useEffect(() => {
    const token = getAdminSession()?.accessToken;
    if (!token) return;
    Promise.all([
      supabaseRequest<AdminExercise[]>('/rest/v1/global_exercises?select=*,exercise_translations(*),exercise_media(*)', {}, token),
      loadExerciseMergeRedirects(),
    ])
      .then(([globalItems, redirects]) => {
        installExerciseMergeRedirects(redirects);
        setMergeRedirects(redirects);
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
  const itemsByIdentity = useMemo(() => {
    const index = new Map<string, AdminExercise>();
    items.forEach((item) => {
      index.set(item.id, item);
      index.set(item.stable_key, item);
    });
    return index;
  }, [items]);
  const classifiedItems = useMemo(() => items.map((item) => ({
    item,
    visualSource: resolveAdminExerciseVisualSource({ id: item.id, stableKey: item.stable_key }),
    mergeRedirect: findActiveExerciseMergeRedirect([item.id, item.stable_key, `builtin-${item.stable_key}`]),
  // The external-store revision deliberately invalidates effective resolver results.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [items, mergeRedirects, visualRevision]);
  const catalogueItems = useMemo(
    () => classifiedItems.filter(({ item, mergeRedirect }) =>
      !mergeRedirect && (item.is_published || item.source === 'built-in')),
    [classifiedItems],
  );
  const visualCounts = useMemo(() => catalogueItems.reduce((counts, { visualSource }) => {
    counts[visualSource] += 1;
    return counts;
  }, { uploaded: 0, 'built-in': 0, fallback: 0 }), [catalogueItems]);
  const mergedCount = classifiedItems.reduce((count, { mergeRedirect }) => count + Number(Boolean(mergeRedirect)), 0);
  const visible = useMemo(() => classifiedItems.filter(({ item, visualSource, mergeRedirect }) => {
    const names = item.exercise_translations.map((translation) => translation.name).join(' ');
    const hasHe = item.exercise_translations.some((translation) => translation.locale === 'he' && translation.description && translation.instructions.length);
    const hasVideo = item.exercise_media.length > 0;
    const lifecycleMatches = status === 'all'
      || (status === 'merged' ? Boolean(mergeRedirect)
        : status === 'draft' ? !mergeRedirect && !item.is_published && item.source !== 'built-in'
          : !mergeRedirect && (item.is_published || item.source === 'built-in'));
    return lifecycleMatches
      && `${item.stable_key} ${names}`.toLowerCase().includes(query.toLowerCase())
      && (category === 'all' || item.category === category)
      && (difficulty === 'all' || item.difficulty === difficulty)
      && (missing === 'all' || (missing === 'video' ? !hasVideo : !hasHe))
      && (!visualMetadataReady || matchesExerciseVisualStatus(visualSource, visualStatus));
  }), [category, classifiedItems, difficulty, missing, query, status, visualMetadataReady, visualStatus]);
  return (
    <main className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">{t('exerciseManagement')}</p><h1 className="text-4xl font-black">{t('exercises')}</h1></div>
        <div className="flex flex-wrap gap-2"><Link className="btn-secondary" to="/admin/exercises/merge">{t('mergeExercises')}</Link><Link className="btn-primary" to="/admin/exercises/new">{t('newExercise')}</Link></div>
      </div>
      <div className="my-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input aria-label={t('searchSharedExercises')} className="field" placeholder={t('search')} value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select label={t('exerciseStatus')} value={status} onChange={(value) => setStatus(value as ExerciseLifecycleFilter)} options={[{ value: 'active', label: t('activePublished') }, { value: 'draft', label: t('draftsOnly') }, { value: 'merged', label: t('mergedExercises') }, { value: 'all', label: t('allPublicationStates') }]} />
        <Select label={t('missingHebrew')} value={missing} onChange={setMissing} options={[{ value: 'all', label: t('allContent') }, { value: 'video', label: t('missingVideo') }, { value: 'hebrew', label: t('missingHebrew') }]} />
        <Select searchable searchLabel={t('search')} label={t('category')} value={category} onChange={setCategory} options={[{ value: 'all', label: t('allCategories') }, ...['push','pull','legs','core','mobility','skill'].map((value) => ({ value, label: value }))]} />
        <Select label={t('difficulty')} value={difficulty} onChange={setDifficulty} options={[{ value: 'all', label: t('allDifficulties') }, ...['beginner','intermediate','advanced'].map((value) => ({ value, label: value }))]} />
        <Select
          label={t('visualStatus')}
          value={visualStatus}
          disabled={!visualMetadataReady}
          onChange={(value) => setVisualStatus(value as ExerciseVisualStatusFilter)}
          options={[
            { value: 'all', label: t('allVisuals') },
            { value: 'has-visual', label: t('hasVisual') },
            { value: 'missing-visual', label: t('missingVisual') },
            { value: 'using-fallback', label: t('usingFallback') },
          ]}
        />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5" aria-label={t('visualCompletenessSummary')}>
        <div className="card p-3"><span className="block text-slate-500">{t('totalExercises')}</span><strong>{catalogueItems.length}</strong></div>
        <div className="card p-3"><span className="block text-slate-500">{t('uploadedVisuals')}</span><strong>{visualMetadataReady ? visualCounts.uploaded : t('loading')}</strong></div>
        <div className="card p-3"><span className="block text-slate-500">{t('builtInVisuals')}</span><strong>{visualMetadataReady ? visualCounts['built-in'] : t('loading')}</strong></div>
        <div className="card p-3"><span className="block text-slate-500">{t('missingOrFallback')}</span><strong>{visualMetadataReady ? visualCounts.fallback : t('loading')}</strong></div>
        <div className="card p-3"><span className="block text-slate-500">{t('merged')}</span><strong>{mergedCount}</strong></div>
      </div>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map(({ item, visualSource, mergeRedirect }) => {
          const en = item.exercise_translations.find((translation) => translation.locale === 'en');
          const he = item.exercise_translations.find((translation) => translation.locale === 'he');
          const target = mergeRedirect
            ? itemsByIdentity.get(mergeRedirect.targetExerciseId) ?? itemsByIdentity.get(mergeRedirect.targetStableKey)
            : undefined;
          const targetName = target?.exercise_translations.find((translation) => translation.locale === 'en')?.name ?? mergeRedirect?.targetStableKey;
          return <article key={item.id} className="card touch-manipulation">
            <div className="flex items-start justify-between gap-3"><div><Link to={`/admin/exercises/${item.id}/edit`}><h2 className="text-xl font-black" dir="auto">{en?.name ?? item.stable_key}</h2></Link><p dir="auto" className="text-slate-400">{he?.name ?? t('missingHebrewName')}</p></div><span className="chip">{mergeRedirect ? t('merged') : item.is_published ? t('published') : t('draft')}</span></div>
            {mergeRedirect && <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/5"><span>{t('mergedRedirectsTo')} </span><Link className="font-bold text-brand" to={`/admin/exercises/${mergeRedirect.targetExerciseId}/edit`} dir="auto">{targetName}</Link><p className="mt-1 text-xs text-slate-500" dir="ltr">{item.stable_key} → {mergeRedirect.targetStableKey}</p></div>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="chip">{item.source === 'built-in' ? t('builtIn') : t('global')}</span><span className="chip" dir="auto">{item.movement_family}</span><span className="chip">{item.difficulty}</span>{visualMetadataReady && <span className="chip" data-visual-source={visualSource}>{visualSource === 'uploaded' ? t('uploadedVisual') : visualSource === 'built-in' ? t('builtInVisual') : t('fallbackVisual')}</span>}<span className="chip">{item.exercise_media.length ? t('hasMedia') : t('missingVideo')}</span><span className="chip">{he?.description ? t('hebrewComplete') : t('missingHebrew')}</span></div>
            <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : t('notEnrichedYet')}</span><Link to={`/admin/exercises/${item.id}/edit`} className="font-bold text-brand">{mergeRedirect ? t('viewMergedExercise') : t('edit')}</Link></div>
          </article>;
        })}
      </div>
    </main>
  );
}
