import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createId } from '../../utils/id';
import { deleteExerciseMediaFile, getAdminSession, supabaseRequest, uploadExerciseMedia } from '../../services/supabase';
import type { ExerciseMedia } from '../../types';
import { parseYouTubeVideoId, youtubeEmbedUrl } from '../../utils/youtube';
import { useI18n } from '../../hooks/useI18n';
import { builtInExercises } from '../../data/exercises';

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
  const [youtube, setYoutube] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [media, setMedia] = useState<ExerciseMedia[]>([]);
  const token = getAdminSession()?.accessToken;
  useEffect(() => {
    if (!exerciseId || exerciseId === 'new' || !token) return;
    if (exerciseId.startsWith('builtin:')) {
      const key = exerciseId.slice(8);
      const exercise = builtInExercises.find((item) => (item.stableKey ?? item.id.replace(/^builtin-/, '')) === key);
      if (exercise) queueMicrotask(() => setForm({
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
      setForm({
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
        storagePath: typeof item.storage_path === 'string' ? item.storage_path : undefined,
        sortOrder: Number(item.sort_order ?? 0), isPrimary: item.is_primary === true, isPublished: item.is_published === true,
      })).sort((a, b) => a.sortOrder - b.sortOrder));
    }).catch((reason: Error) => setError(reason.message));
  }, [exerciseId, token]);
  const list = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const save = async () => {
    if (!token || !form.stable_key || !form.nameEn || !form.measurement_type) {
      setError(t('requiredExerciseFields'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const id = form.id || createId();
      await supabaseRequest('/rest/v1/global_exercises?on_conflict=stable_key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id,
          stable_key: form.stable_key,
          movement_family: form.movement_family,
          category: form.category,
          difficulty: form.difficulty,
          measurement_type: form.measurement_type,
          muscles: list(form.muscles),
          aliases: list(form.aliases),
          keywords: list(form.keywords),
          is_published: form.is_published,
          created_by: getAdminSession()?.userId,
          updated_by: getAdminSession()?.userId,
        }),
      }, token);
      const translations = [
        { locale: 'en', name: form.nameEn, description: form.descriptionEn, instructions: list(form.instructionsEn), common_mistakes: list(form.mistakesEn), aliases: [], keywords: [] },
        { locale: 'he', name: form.nameHe || form.nameEn, description: form.descriptionHe, instructions: list(form.instructionsHe), common_mistakes: list(form.mistakesHe), aliases: [], keywords: [] },
      ].map((translation) => ({ ...translation, exercise_id: id }));
      await supabaseRequest('/rest/v1/exercise_translations?on_conflict=exercise_id,locale', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(translations),
      }, token);
      navigate('/admin/exercises');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('unableToSave'));
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
  const reloadMedia = async () => {
    if (!form.id || !token) return;
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(`/rest/v1/exercise_media?exercise_id=eq.${form.id}&order=sort_order.asc`, {}, token);
    setMedia(rows.map((item) => ({ id: String(item.id), exerciseId: String(item.exercise_id), mediaType: item.media_type as ExerciseMedia['mediaType'], provider: item.provider as ExerciseMedia['provider'], title: String(item.title ?? ''), externalUrl: typeof item.external_url === 'string' ? item.external_url : undefined, storagePath: typeof item.storage_path === 'string' ? item.storage_path : undefined, sortOrder: Number(item.sort_order ?? 0), isPrimary: item.is_primary === true, isPublished: item.is_published === true })));
  };
  const addYoutube = async () => {
    const videoId = parseYouTubeVideoId(youtube);
    if (!videoId || !form.id || !token) return setError(t('validYoutubeRequired'));
    try {
      await supabaseRequest('/rest/v1/exercise_media', { method: 'POST', body: JSON.stringify({ exercise_id: form.id, media_type: 'youtube', provider: 'youtube', title: `${form.nameEn} demonstration`, external_url: `https://youtu.be/${videoId}`, sort_order: media.length, is_primary: !media.length, is_published: form.is_published, created_by: getAdminSession()?.userId }) }, token);
      setYoutube(''); await reloadMedia();
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
  const set = (key: keyof typeof empty, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const videoId = parseYouTubeVideoId(youtube);
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-black">{form.id ? t('editSharedExercise') : t('newSharedExercise')}</h1>
      <div className="mt-6 grid gap-5">
        <section className="card grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-xl font-black">{t('exerciseMetadata')}</h2>
          <Field label={t('stableKey')} value={form.stable_key} set={(value) => set('stable_key', value)} ltr />
          <Field label={t('movementFamily')} value={form.movement_family} set={(value) => set('movement_family', value)} />
          <Select label={t('category')} value={form.category} values={['push','pull','legs','core','mobility','skill']} set={(value) => set('category', value)} />
          <Select label={t('difficulty')} value={form.difficulty} values={['beginner','intermediate','advanced']} set={(value) => set('difficulty', value)} />
          <Select label={t('measurement')} value={form.measurement_type} values={['reps','time']} set={(value) => set('measurement_type', value)} />
          <Field label={t('muscles')} value={form.muscles} set={(value) => set('muscles', value)} />
          <Field label={t('aliases')} value={form.aliases} set={(value) => set('aliases', value)} />
          <Field label={t('keywords')} value={form.keywords} set={(value) => set('keywords', value)} />
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          <TranslationCard title={t('englishContent')} name={form.nameEn} description={form.descriptionEn} instructions={form.instructionsEn} mistakes={form.mistakesEn} set={(key, value) => set(`${key}En` as keyof typeof empty, value)} labels={{ name: t('name'), description: t('description'), instructions: t('instructionsPerLine'), mistakes: t('mistakesPerLine') }} />
          <TranslationCard title={t('hebrewContent')} name={form.nameHe} description={form.descriptionHe} instructions={form.instructionsHe} mistakes={form.mistakesHe} set={(key, value) => set(`${key}He` as keyof typeof empty, value)} labels={{ name: t('name'), description: t('description'), instructions: t('instructionsPerLine'), mistakes: t('mistakesPerLine') }} rtl />
        </div>
        <section className="card space-y-3">
          <h2 className="text-xl font-black">{t('media')}</h2>
          <Field label={t('youtubeUrl')} value={youtube} set={setYoutube} ltr />
          {videoId && <div className="aspect-video overflow-hidden rounded-2xl"><iframe className="h-full w-full" src={youtubeEmbedUrl(videoId)} title={t('youtubePreview')} allowFullScreen /></div>}
          <button className="btn-secondary" type="button" disabled={!videoId || !form.id} onClick={addYoutube}>{t('addYoutube')}</button>
          <Field label={t('externalUrl')} value={externalUrl} set={setExternalUrl} ltr />
          <button className="btn-secondary" type="button" disabled={!externalUrl || !form.id} onClick={addExternal}>{t('addExternalLink')}</button>
          <label className="btn-secondary cursor-pointer"><span>{t('uploadVideoOrImage')}</span><input className="sr-only" type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} /></label>
          <p className="text-sm text-slate-400">{t('uploadRecommendation')}</p>
          {progress !== null && <div role="progressbar" aria-valuenow={progress} className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full bg-brand" style={{ width: `${progress}%` }} /></div>}
          <div className="space-y-3">{media.map((item, index) => <article key={item.id} className="surface-subtle rounded-2xl p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong dir="auto">{item.title || item.mediaType}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{item.mediaType} · {item.isPublished ? t('published') : t('draft')} · {item.isPrimary ? t('primary') : t('secondary')}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary min-h-10 px-3" onClick={() => updateMedia(item,{isPublished:!item.isPublished})}>{item.isPublished?t('unpublish'):t('publish')}</button><button className="btn-secondary min-h-10 px-3" onClick={() => updateMedia(item,{isPrimary:true})}>{t('makePrimary')}</button><button disabled={!index} className="btn-secondary min-h-10 px-3" onClick={() => updateMedia(item,{sortOrder:index-1})}>{t('moveUp')}</button>{item.provider === 'supabase_storage' && <label className="btn-secondary min-h-10 cursor-pointer px-3">{t('replace')}<input className="sr-only" type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" onChange={(event) => replaceMedia(item,event.target.files?.[0])}/></label>}<button className="btn-danger min-h-10 px-3" onClick={() => removeMedia(item)}>{t('delete')}</button></div></div></article>)}</div>
        </section>
      </div>
      {error && <p role="alert" className="mt-4 text-red-400">{error}</p>}
      <div className="mt-5 flex items-center justify-between"><label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={form.is_published} onChange={(event) => set('is_published', event.target.checked)} />{t('published')}</label><button className="btn-primary" disabled={saving} onClick={save}>{saving ? t('saving') : t('saveExercise')}</button></div>
    </main>
  );
}

function Field({ label, value, set, ltr = false }: { label: string; value: string; set: (value: string) => void; ltr?: boolean }) { return <label><span className="label">{label}</span><input dir={ltr ? 'ltr' : 'auto'} className="field" value={value} onChange={(event) => set(event.target.value)} /></label>; }
function Select({ label, value, values, set }: { label: string; value: string; values: string[]; set: (value: string) => void }) { return <label><span className="label">{label}</span><select className="field" value={value} onChange={(event) => set(event.target.value)}>{values.map((item) => <option key={item}>{item}</option>)}</select></label>; }
function TranslationCard({ title, name, description, instructions, mistakes, set, labels, rtl = false }: { title: string; name: string; description: string; instructions: string; mistakes: string; set: (key: 'name' | 'description' | 'instructions' | 'mistakes', value: string) => void; labels: { name: string; description: string; instructions: string; mistakes: string }; rtl?: boolean }) { return <section className="card space-y-3" dir={rtl ? 'rtl' : 'ltr'}><h2 className="text-xl font-black">{title}</h2><Field label={labels.name} value={name} set={(value) => set('name', value)} /><label><span className="label">{labels.description}</span><textarea dir="auto" className="field" value={description} onChange={(event) => set('description', event.target.value)} /></label><label><span className="label">{labels.instructions}</span><textarea dir="auto" className="field min-h-32" value={instructions} onChange={(event) => set('instructions', event.target.value)} /></label><label><span className="label">{labels.mistakes}</span><textarea dir="auto" className="field" value={mistakes} onChange={(event) => set('mistakes', event.target.value)} /></label></section>; }
