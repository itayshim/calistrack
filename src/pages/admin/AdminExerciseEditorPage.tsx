import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteExerciseMediaFile, getAdminSession, supabaseRequest, uploadExerciseMedia } from '../../services/supabase';
import type { ExerciseMedia } from '../../types';
import { parseYouTubeVideoId, youtubeEmbedUrl } from '../../utils/youtube';
import { useI18n } from '../../hooks/useI18n';
import { builtInExercises } from '../../data/exercises';
import { invalidatePublishedExerciseMedia } from '../../services/exerciseMedia';
import { PageBackLink } from '../../components/PageBackLink';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { SuggestedVideosPanel } from './SuggestedVideosPanel';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  addPublishedYouTubeMedia,
  findDuplicateYouTubeMedia,
} from '../../services/adminExerciseMedia';
import { useAppStore } from '../../store/useAppStore';
import { isValidStableKey, normalizeStableKey, normalizeStableKeyDraft } from '../../utils/stableKey';
import { ChipInput, TaxonomyCombobox } from '../../components/TaxonomyInputs';
import { Select as SharedSelect } from '../../components/SelectMenu';
import {
  createExerciseTaxonomyValue,
  deriveExerciseTaxonomy,
  loadExerciseTaxonomy,
  type ExerciseTaxonomy,
} from '../../services/exerciseTaxonomy';
import {
  keywordSuggestions,
  suggestedCategory,
  uniqueTaxonomyValues,
  type TaxonomyKind,
} from '../../utils/taxonomy';
import { ensureBuiltInExerciseIdentity } from '../../services/adminExerciseIdentity';

const empty = {
  id: '',
  stable_key: '',
  movement_family: '',
  category: 'skill',
  difficulty: 'beginner',
  measurement_type: 'reps',
  muscles: '',
  aliases: '',
  keywords: '',
  is_published: false,
  nameEn: '',
  nameHe: '',
  descriptionEn: '',
  descriptionHe: '',
  instructionsEn: '',
  instructionsHe: '',
  mistakesEn: '',
  mistakesHe: '',
};

export function AdminExerciseEditorPage() {
  const { t } = useI18n();
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [baseline, setBaseline] = useState(JSON.stringify(empty));
  const [youtube, setYoutube] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState('');
  const [stableKeyError, setStableKeyError] = useState('');
  const [stableKeyManuallyEdited, setStableKeyManuallyEdited] = useState(false);
  const [taxonomy, setTaxonomy] = useState<ExerciseTaxonomy>(() => deriveExerciseTaxonomy());
  const [categoryError, setCategoryError] = useState('');
  const [familyError, setFamilyError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [media, setMedia] = useState<ExerciseMedia[]>([]);
  const [pendingPrimary, setPendingPrimary] = useState<ExerciseMedia | null>(null);
  const [highlightedMediaId, setHighlightedMediaId] = useState('');
  const token = getAdminSession()?.accessToken;
  const dirty = JSON.stringify(form) !== baseline || Boolean(youtube || externalUrl);
  const unsaved = useUnsavedChangesGuard(dirty);
  const loadForm = (next: typeof empty) => {
    setForm(next);
    setBaseline(JSON.stringify(next));
    setStableKeyManuallyEdited(true);
  };
  useEffect(() => {
    if (!token) return;
    loadExerciseTaxonomy().then(setTaxonomy).catch(() => undefined);
  }, [token]);
  useEffect(() => {
    if (!exerciseId || exerciseId === 'new' || !token) return;
    if (exerciseId.startsWith('builtin:')) {
      const key = exerciseId.slice(8);
      const exercise = builtInExercises.find((item) => (item.stableKey ?? item.id.replace(/^builtin-/, '')) === key);
      if (exercise) queueMicrotask(() => loadForm({
        ...empty,
        stable_key: key,
        movement_family: exercise.movementFamily ?? exercise.category,
        category: exercise.category,
        difficulty: exercise.difficulty,
        measurement_type: exercise.measurementType,
        muscles: exercise.muscles.join(', '),
        aliases: (exercise.aliases ?? []).join(', '),
        keywords: (exercise.keywords ?? []).join(', '),
        nameEn: exercise.nameEn,
        nameHe: exercise.nameHe,
        descriptionEn: exercise.description,
        descriptionHe: exercise.descriptionHe ?? '',
        instructionsEn: exercise.instructions.join('\n'),
        instructionsHe: (exercise.instructionsHe ?? []).join('\n'),
        mistakesEn: exercise.commonMistakes.join('\n'),
        mistakesHe: (exercise.commonMistakesHe ?? []).join('\n'),
      }));
      return;
    }
    supabaseRequest<Array<Record<string, unknown>>>(
      `/rest/v1/global_exercises?id=eq.${exerciseId}&select=*,exercise_translations(*),exercise_media(*)`,
      {},
      token,
    ).then(([row]) => {
      if (!row) return;
      const translations = row.exercise_translations as Array<Record<string, unknown>>;
      const en = translations.find((item) => item.locale === 'en');
      const he = translations.find((item) => item.locale === 'he');
      loadForm({
        id: String(row.id),
        stable_key: String(row.stable_key),
        movement_family: String(row.movement_family),
        category: String(row.category),
        difficulty: String(row.difficulty),
        measurement_type: String(row.measurement_type),
        muscles: (row.muscles as string[]).join(', '),
        aliases: (row.aliases as string[]).join(', '),
        keywords: (row.keywords as string[]).join(', '),
        is_published: Boolean(row.is_published),
        nameEn: String(en?.name ?? ''),
        nameHe: String(he?.name ?? ''),
        descriptionEn: String(en?.description ?? ''),
        descriptionHe: String(he?.description ?? ''),
        instructionsEn: ((en?.instructions as string[]) ?? []).join('\n'),
        instructionsHe: ((he?.instructions as string[]) ?? []).join('\n'),
        mistakesEn: ((en?.common_mistakes as string[]) ?? []).join('\n'),
        mistakesHe: ((he?.common_mistakes as string[]) ?? []).join('\n'),
      });
      setMedia(((row.exercise_media as Array<Record<string, unknown>>) ?? []).map((item) => ({
        id: String(item.id), exerciseId: String(item.exercise_id),
        mediaType: item.media_type as ExerciseMedia['mediaType'],
        provider: item.provider as ExerciseMedia['provider'],
        title: String(item.title ?? ''), externalUrl: typeof item.external_url === 'string' ? item.external_url : undefined,
        youtubeVideoId: typeof item.youtube_video_id === 'string' ? item.youtube_video_id : undefined,
        storagePath: typeof item.storage_path === 'string' ? item.storage_path : undefined,
        sortOrder: Number(item.sort_order ?? 0), isPrimary: item.is_primary === true, isPublished: item.is_published === true,
      })).sort((a, b) => a.sortOrder - b.sortOrder));
    }).catch((reason: Error) => setError(reason.message));
  }, [exerciseId, token]);
  const list = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const updateList = (key: 'muscles' | 'aliases' | 'keywords', values: string[]) =>
    set(key, values.join(', '));
  const createTaxonomy = async (kind: TaxonomyKind, value: string) => {
    const created = await createExerciseTaxonomyValue(kind, value);
    setTaxonomy((current) => ({
      ...current,
      categories: kind === 'category' ? uniqueTaxonomyValues([...current.categories, created], kind) : current.categories,
      movementFamilies: kind === 'movement_family' ? uniqueTaxonomyValues([...current.movementFamilies, created], kind) : current.movementFamilies,
      muscles: kind === 'muscle' ? uniqueTaxonomyValues([...current.muscles, created], kind) : current.muscles,
      keywords: kind === 'keyword' ? uniqueTaxonomyValues([...current.keywords, created], kind) : current.keywords,
    }));
    return created;
  };
  const save = async () => {
    const stableKey = normalizeStableKey(form.stable_key);
    const validDifficulty = ['beginner', 'intermediate', 'advanced'].includes(form.difficulty);
    const validMeasurement = ['reps', 'duration', 'weighted_reps'].includes(form.measurement_type);
    const categoryKnown = taxonomy.categories.includes(form.category);
    const familyKnown = taxonomy.movementFamilies.includes(form.movement_family);
    setCategoryError(!form.category ? t('categoryRequired') : !categoryKnown ? t('selectValidCategory') : '');
    setFamilyError(!form.movement_family ? t('movementFamilyRequired') : !familyKnown ? t('selectValidMovementFamily') : '');
    if (!token || !stableKey || !form.nameEn || !validMeasurement || !validDifficulty || !categoryKnown || !familyKnown) {
      if (!stableKey) setStableKeyError(t('invalidStableKey'));
      setError(t('requiredExerciseFields'));
      return;
    }
    if (!isValidStableKey(stableKey)) {
      setStableKeyError(t('invalidStableKey'));
      setError('');
      return;
    }
    setSaving(true);
    setStableKeyError('');
    setForm((current) => ({ ...current, stable_key: stableKey }));
    setError('');
    try {
      const wasNew = !form.id;
      let persistedId = form.id;
      if (!persistedId) {
        const [existing] = await supabaseRequest<Array<{ id: string }>>(
          `/rest/v1/global_exercises?stable_key=eq.${encodeURIComponent(stableKey)}&select=id&limit=1`,
          {},
          token,
        );
        persistedId = existing?.id;
      }
      const savedRows = await supabaseRequest<Array<{ id: string }>>('/rest/v1/global_exercises?on_conflict=stable_key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          ...(persistedId ? { id: persistedId } : {}),
          stable_key: stableKey,
          movement_family: form.movement_family,
          category: form.category,
          difficulty: form.difficulty,
          measurement_type: form.measurement_type,
          muscles: uniqueTaxonomyValues(list(form.muscles), 'muscle'),
          aliases: Array.from(new Map(list(form.aliases).map((value) => [value.toLocaleLowerCase(), value])).values()),
          keywords: uniqueTaxonomyValues(list(form.keywords), 'keyword'),
          is_published: form.is_published,
          created_by: getAdminSession()?.userId,
          updated_by: getAdminSession()?.userId,
        }),
      }, token);
      persistedId = savedRows[0]?.id ?? persistedId;
      if (!persistedId) throw new Error('persisted_identity_missing');
      const translations = [
        { locale: 'en', name: form.nameEn, description: form.descriptionEn, instructions: list(form.instructionsEn), common_mistakes: list(form.mistakesEn), aliases: [], keywords: [] },
        { locale: 'he', name: form.nameHe || form.nameEn, description: form.descriptionHe, instructions: list(form.instructionsHe), common_mistakes: list(form.mistakesHe), aliases: [], keywords: [] },
      ].map((translation) => ({ ...translation, exercise_id: persistedId }));
      await supabaseRequest('/rest/v1/exercise_translations?on_conflict=exercise_id,locale', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(translations),
      }, token);
      invalidatePublishedExerciseMedia({
        canonicalExerciseId: persistedId,
        stableKey,
      });
      const persistedForm = { ...form, id: persistedId, stable_key: stableKey };
      setForm(persistedForm);
      setBaseline(JSON.stringify(persistedForm));
      await reloadMedia(persistedId);
      useAppStore.getState().setToast(t('exerciseSaved'));
      if (wasNew) {
        navigate(`/admin/exercises/${persistedId}/edit`, { replace: true });
      }
    } catch (reason) {
      const code =
        reason && typeof reason === 'object' && 'code' in reason
          ? String(reason.code)
          : reason instanceof Error
            ? reason.message
            : '';
      if (code === '23514') {
        setStableKeyError(t('invalidStableKey'));
        setError(t('invalidTaxonomySelection'));
      } else if (code === '23503') {
        setError(t('invalidTaxonomySelection'));
      } else if (code === 'persisted_identity_missing') {
        setError(t('unableToSave'));
      } else {
        setError(t('unableToSave'));
      }
    } finally {
      setSaving(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file || !form.id || !token) return setError(t('saveBeforeUpload'));
    if (file.type === 'video/quicktime') setError(t('movCompatibilityWarning'));
    try {
      setProgress(0);
      const path = await uploadExerciseMedia(form.id, file, setProgress);
      await supabaseRequest('/rest/v1/exercise_media', { method: 'POST', body: JSON.stringify({ exercise_id: form.id, media_type: file.type.startsWith('image/') ? 'image' : 'uploaded_video', provider: 'supabase_storage', title: file.name, storage_path: path, mime_type: file.type, file_size_bytes: file.size, is_published: false, created_by: getAdminSession()?.userId }) }, token);
      await reloadMedia();
      setProgress(null);
    } catch (reason) {
      setProgress(null);
      setError(reason instanceof Error ? reason.message : t('uploadFailed'));
    }
  };
  const reloadMedia = async (exerciseIdentity = form.id) => {
    if (!exerciseIdentity || !token) return;
    invalidatePublishedExerciseMedia({
      canonicalExerciseId: exerciseIdentity,
      stableKey: form.stable_key,
    });
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(`/rest/v1/exercise_media?exercise_id=eq.${exerciseIdentity}&order=sort_order.asc`, {}, token);
    setMedia(rows.map((item) => ({ id: String(item.id), exerciseId: String(item.exercise_id), mediaType: item.media_type as ExerciseMedia['mediaType'], provider: item.provider as ExerciseMedia['provider'], title: String(item.title ?? ''), externalUrl: typeof item.external_url === 'string' ? item.external_url : undefined, youtubeVideoId: typeof item.youtube_video_id === 'string' ? item.youtube_video_id : undefined, storagePath: typeof item.storage_path === 'string' ? item.storage_path : undefined, sortOrder: Number(item.sort_order ?? 0), isPrimary: item.is_primary === true, isPublished: item.is_published === true })));
  };
  const reloadAndHighlight = async (mediaId: string) => {
    await reloadMedia();
    setHighlightedMediaId(mediaId);
    requestAnimationFrame(() => {
      document.getElementById(`media-${mediaId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
    window.setTimeout(() => setHighlightedMediaId(''), 1800);
  };
  const addYoutube = async () => {
    const videoId = parseYouTubeVideoId(youtube);
    if (!videoId || !form.id || !token) return setError(t('validYoutubeRequired'));
    if (findDuplicateYouTubeMedia(media, youtube)) return setError(t('youtubeVideoAlreadyAdded'));
    try {
      const result = await addPublishedYouTubeMedia({
        exerciseId: form.id,
        title: `${form.nameEn} demonstration`,
        url: youtube,
        sortOrder: media.length,
      });
      if (result.status === 'duplicate') return setError(t('youtubeVideoAlreadyAdded'));
      setYoutube('');
      await reloadAndHighlight(result.mediaId);
      useAppStore.getState().setToast(t('videoAddedAndPublished'));
    } catch { setError(t('unableToSave')); }
  };
  const updateMedia = async (item: ExerciseMedia, changes: Partial<ExerciseMedia>) => {
    if (!token) return;
    await supabaseRequest(`/rest/v1/exercise_media?id=eq.${item.id}`, { method: 'PATCH', body: JSON.stringify({ title: changes.title ?? item.title, sort_order: changes.sortOrder ?? item.sortOrder, is_primary: changes.isPrimary ?? item.isPrimary, is_published: changes.isPublished ?? item.isPublished }) }, token);
    if (changes.isPrimary) await Promise.all(media.filter((other) => other.id !== item.id && other.isPrimary).map((other) => supabaseRequest(`/rest/v1/exercise_media?id=eq.${other.id}`, { method: 'PATCH', body: JSON.stringify({ is_primary: false }) }, token)));
    await reloadMedia();
  };
  const removeMedia = async (item: ExerciseMedia) => {
    if (!token) return;
    try {
      await supabaseRequest(`/rest/v1/exercise_media?id=eq.${item.id}`, { method: 'DELETE' }, token);
      if (item.storagePath) await deleteExerciseMediaFile(item.storagePath);
      await reloadMedia();
    } catch { setError(t('unableToDeleteMedia')); }
  };
  const addExternal = async () => {
    if (!form.id || !token || !/^https?:\/\//i.test(externalUrl)) return setError(t('validExternalUrlRequired'));
    try {
      await supabaseRequest('/rest/v1/exercise_media', { method: 'POST', body: JSON.stringify({ exercise_id: form.id, media_type: 'external_link', provider: 'external', title: externalUrl, external_url: externalUrl, sort_order: media.length, is_primary: false, is_published: false, created_by: getAdminSession()?.userId }) }, token);
      setExternalUrl(''); await reloadMedia();
    } catch { setError(t('unableToSave')); }
  };
  const replaceMedia = async (item: ExerciseMedia, file?: File) => {
    if (!file || !form.id || !token) return;
    try {
      setProgress(0);
      const path = await uploadExerciseMedia(form.id, file, setProgress);
      await supabaseRequest(`/rest/v1/exercise_media?id=eq.${item.id}`, { method: 'PATCH', body: JSON.stringify({ media_type: file.type.startsWith('image/') ? 'image' : 'uploaded_video', provider: 'supabase_storage', title: file.name, storage_path: path, external_url: null, mime_type: file.type, file_size_bytes: file.size }) }, token);
      if (item.storagePath) await deleteExerciseMediaFile(item.storagePath);
      await reloadMedia();
    } catch { setError(t('mediaReplaceFailed')); } finally { setProgress(null); }
  };
  const set = (key: keyof typeof empty, value: string | boolean) =>
    setForm((current) => {
      if (key === 'nameEn' && typeof value === 'string' && !stableKeyManuallyEdited && !current.id) {
        const comparableName = value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
        const matchingFamily = taxonomy.movementFamilies
          .filter((family) => comparableName.includes(family.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')))
          .sort((a, b) => b.length - a.length)[0];
        return {
          ...current,
          nameEn: value,
          stable_key: normalizeStableKey(value),
          movement_family: current.movement_family || matchingFamily || '',
        };
      }
      return { ...current, [key]: value };
    });
  const setStableKey = (value: string) => {
    const normalized = normalizeStableKeyDraft(value);
    setStableKeyManuallyEdited(true);
    setStableKeyError(normalized && !isValidStableKey(normalized) ? t('invalidStableKey') : '');
    set('stable_key', normalized);
  };
  const videoId = parseYouTubeVideoId(youtube);
  const categorySuggestion = suggestedCategory(form.movement_family);
  const builtInExercise = exerciseId?.startsWith('builtin:')
    ? builtInExercises.find((item) =>
        (item.stableKey ?? item.id.replace(/^builtin-/, '')) === exerciseId.slice(8))
    : undefined;
  const prepareBuiltInMediaIdentity = builtInExercise
    ? async () => {
        const identity = await ensureBuiltInExerciseIdentity(builtInExercise);
        setForm((current) => ({ ...current, id: identity.id, is_published: identity.isPublished }));
        setBaseline((current) => {
          const parsed = JSON.parse(current) as typeof empty;
          return JSON.stringify({
            ...parsed,
            id: identity.id,
            is_published: identity.isPublished,
          });
        });
        await reloadMedia(identity.id);
        return identity.id;
      }
    : undefined;
  return (
    <main className="mx-auto max-w-4xl">
      <div onClick={(event) => {
        const anchor = (event.target as Element).closest('a[href="/admin/exercises"]');
        if (anchor && dirty) {
          event.preventDefault();
          unsaved.request(() => navigate('/admin/exercises'));
        }
      }}>
        <PageBackLink to="/admin/exercises" label={t('backToExercises')} />
      </div>
      <h1 className="text-4xl font-black">{form.id ? t('editSharedExercise') : t('newSharedExercise')}</h1>
      <div className="mt-6 grid gap-5">
        <section className="card grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-xl font-black">{t('exerciseMetadata')}</h2>
          <Field
            label={t('stableKey')}
            value={form.stable_key}
            set={setStableKey}
            onBlur={() => set('stable_key', normalizeStableKey(form.stable_key))}
            error={stableKeyError}
            ltr
          />
          <TaxonomyCombobox
            label={t('movementFamily')}
            value={form.movement_family}
            options={taxonomy.movementFamilies}
            kind="movement_family"
            onChange={(value) => {
              set('movement_family', value);
              setFamilyError('');
            }}
            onCreate={(value) => createTaxonomy('movement_family', value)}
            createLabel={t('createNewMovementFamily')}
            searchLabel={t('searchMovementFamilies')}
            error={familyError}
          />
          <div>
            <TaxonomyCombobox
              label={t('category')}
              value={form.category}
              options={taxonomy.categories}
              kind="category"
              onChange={(value) => {
                set('category', value);
                setCategoryError('');
              }}
              onCreate={(value) => createTaxonomy('category', value)}
              createLabel={t('createNewCategory')}
              searchLabel={t('searchCategories')}
              error={categoryError}
            />
            {categorySuggestion && categorySuggestion !== form.category && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>{t('suggestedCategory')}: <bdi className="font-bold">{categorySuggestion}</bdi></span>
                <button
                  className="font-bold text-brand-dark underline-offset-4 hover:underline dark:text-brand"
                  type="button"
                  onClick={() => {
                    set('category', categorySuggestion);
                    setCategoryError('');
                  }}
                >
                  {t('useSuggestion')}
                </button>
              </div>
            )}
          </div>
          <Select label={t('difficulty')} value={form.difficulty} values={['beginner','intermediate','advanced']} set={(value) => set('difficulty', value)} />
          <SharedSelect label={t('measurementType')} value={form.measurement_type} onChange={(value) => set('measurement_type', value)} options={[
            { value: 'reps', label: t('repetitionsMeasurement') },
            { value: 'duration', label: t('durationMeasurement') },
            { value: 'weighted_reps', label: t('weightedRepsMeasurement') },
          ]} />
          <ChipInput
            label={t('muscles')}
            values={list(form.muscles)}
            options={taxonomy.muscles}
            kind="muscle"
            onChange={(values) => updateList('muscles', values)}
            onCreate={(value) => createTaxonomy('muscle', value)}
            placeholder={t('searchMuscles')}
            createLabel={t('createNewMuscle')}
          />
          <ChipInput
            label={t('aliases')}
            values={list(form.aliases)}
            kind="alias"
            onChange={(values) => updateList('aliases', values)}
            placeholder={t('addAlias')}
          />
          <ChipInput
            label={t('keywords')}
            values={list(form.keywords)}
            options={taxonomy.keywords}
            kind="keyword"
            onChange={(values) => updateList('keywords', values)}
            onCreate={(value) => createTaxonomy('keyword', value)}
            placeholder={t('addKeyword')}
            createLabel={t('createNewKeyword')}
            suggestions={keywordSuggestions(form.category, form.movement_family)}
          />
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          <TranslationCard title={t('englishContent')} name={form.nameEn} description={form.descriptionEn} instructions={form.instructionsEn} mistakes={form.mistakesEn} set={(key, value) => set(`${key}En` as keyof typeof empty, value)} labels={{ name: t('name'), description: t('description'), instructions: t('instructionsPerLine'), mistakes: t('mistakesPerLine') }} />
          <TranslationCard title={t('hebrewContent')} name={form.nameHe} description={form.descriptionHe} instructions={form.instructionsHe} mistakes={form.mistakesHe} set={(key, value) => set(`${key}He` as keyof typeof empty, value)} labels={{ name: t('name'), description: t('description'), instructions: t('instructionsPerLine'), mistakes: t('mistakesPerLine') }} rtl />
        </div>
        <section className="card space-y-3">
          <h2 className="text-xl font-black">{t('media')}</h2>
          <SuggestedVideosPanel
            exerciseId={form.id}
            exerciseName={form.nameEn || form.stable_key}
            sortOrder={media.length}
            existingMedia={media}
            onSelected={reloadAndHighlight}
            resolveExerciseId={prepareBuiltInMediaIdentity}
          />
          <Field label={t('youtubeUrl')} value={youtube} set={setYoutube} ltr />
          {videoId && <div className="aspect-video overflow-hidden rounded-2xl"><iframe className="h-full w-full" src={youtubeEmbedUrl(videoId)} title={t('youtubePreview')} allowFullScreen /></div>}
          <button className="btn-secondary" type="button" disabled={!videoId || !form.id} onClick={addYoutube}>{t('addYoutube')}</button>
          <Field label={t('externalUrl')} value={externalUrl} set={setExternalUrl} ltr />
          <button className="btn-secondary" type="button" disabled={!externalUrl || !form.id} onClick={addExternal}>{t('addExternalLink')}</button>
          <label
            aria-disabled={!form.id}
            className={`btn-secondary ${form.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          >
            <span>{t('uploadVideoOrImage')}</span>
            <input
              className="sr-only"
              type="file"
              disabled={!form.id}
              accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
          <p className="text-sm text-slate-400">{t('uploadRecommendation')}</p>
          {progress !== null && <div role="progressbar" aria-valuenow={progress} className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full bg-brand" style={{ width: `${progress}%` }} /></div>}
          <div className="space-y-3">{media.map((item, index) => <article id={`media-${item.id}`} key={item.id} className={`surface-subtle rounded-2xl p-4 transition ${highlightedMediaId === item.id ? 'ring-2 ring-brand' : ''}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><strong dir="auto">{item.title || item.mediaType}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{item.mediaType} · {item.isPublished ? t('published') : t('draft')} · {item.isPrimary ? t('primary') : t('secondary')}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary min-h-10 px-3" onClick={() => updateMedia(item,{isPublished:!item.isPublished})}>{item.isPublished?t('unpublish'):t('publish')}</button><button className="btn-secondary min-h-10 px-3" onClick={() => media.some((other) => other.isPrimary && other.id !== item.id) ? setPendingPrimary(item) : updateMedia(item,{isPrimary:true})}>{t('makePrimary')}</button><button disabled={!index} className="btn-secondary min-h-10 px-3" onClick={() => updateMedia(item,{sortOrder:index-1})}>{t('moveUp')}</button>{item.provider === 'supabase_storage' && <label className="btn-secondary min-h-10 cursor-pointer px-3">{t('replace')}<input className="sr-only" type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" onChange={(event) => replaceMedia(item,event.target.files?.[0])}/></label>}<button className="btn-danger min-h-10 px-3" onClick={() => removeMedia(item)}>{t('delete')}</button></div></div></article>)}</div>
        </section>
      </div>
      {error && <p role="alert" className="mt-4 text-red-400">{error}</p>}
      <div className="mt-5 flex items-center justify-between"><label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={form.is_published} onChange={(event) => set('is_published', event.target.checked)} />{t('published')}</label><button className="btn-primary" disabled={saving} onClick={save}>{saving ? t('saving') : t('saveExercise')}</button></div>
      {unsaved.dialog}
      <ConfirmDialog open={pendingPrimary !== null} title={t('replacePrimaryVideo')} description={t('replacePrimaryDescription')} confirmLabel={t('replace')} onClose={() => setPendingPrimary(null)} onConfirm={() => { if (pendingPrimary) void updateMedia(pendingPrimary, { isPrimary: true }); setPendingPrimary(null); }} />
    </main>
  );
}

function Field({ label, value, set, ltr = false, error, onBlur }: { label: string; value: string; set: (value: string) => void; ltr?: boolean; error?: string; onBlur?: () => void }) {
  const errorId = error ? `${label.toLowerCase().replace(/\s+/g, '-')}-error` : undefined;
  return (
    <label>
      <span className="label">{label}</span>
      <input
        dir={ltr ? 'ltr' : 'auto'}
        className="field"
        value={value}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={errorId}
        onChange={(event) => set(event.target.value)}
        onBlur={onBlur}
      />
      {error && <span id={errorId} className="mt-1 block text-sm font-bold text-red-500">{error}</span>}
    </label>
  );
}
function Select({ label, value, values, set }: { label: string; value: string; values: string[]; set: (value: string) => void }) {
  return <SharedSelect label={label} value={value} onChange={set} options={values.map((item) => ({ value: item, label: item }))} />;
}
function TranslationCard({ title, name, description, instructions, mistakes, set, labels, rtl = false }: { title: string; name: string; description: string; instructions: string; mistakes: string; set: (key: 'name' | 'description' | 'instructions' | 'mistakes', value: string) => void; labels: { name: string; description: string; instructions: string; mistakes: string }; rtl?: boolean }) { return <section className="card space-y-3" dir={rtl ? 'rtl' : 'ltr'}><h2 className="text-xl font-black">{title}</h2><Field label={labels.name} value={name} set={(value) => set('name', value)} /><label><span className="label">{labels.description}</span><textarea dir="auto" className="field" value={description} onChange={(event) => set('description', event.target.value)} /></label><label><span className="label">{labels.instructions}</span><textarea dir="auto" className="field min-h-32" value={instructions} onChange={(event) => set('instructions', event.target.value)} /></label><label><span className="label">{labels.mistakes}</span><textarea dir="auto" className="field" value={mistakes} onChange={(event) => set('mistakes', event.target.value)} /></label></section>; }
