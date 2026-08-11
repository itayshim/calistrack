import { AlertTriangle, ArrowRight, CheckCircle2, GitMerge, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { resolveAdminExerciseVisualSource } from '../../features/exercises/adminExerciseVisualStatus';
import {
  executeExerciseMerge,
  previewExerciseMerge,
  type ExerciseMergePreview,
} from '../../services/exerciseMerges';
import { getAdminSession, supabaseRequest } from '../../services/supabase';
import { useAppStore } from '../../store/useAppStore';

interface AdminExerciseRow {
  id: string;
  stable_key: string;
  movement_family: string;
  category: string;
  difficulty: string;
  measurement_type: string;
  muscles: string[];
  aliases: string[];
  keywords: string[];
  is_published: boolean;
  exercise_translations: Array<{ locale: 'en' | 'he'; name: string; description?: string; instructions: string[] }>;
  exercise_media: Array<{ id: string; title?: string; provider: string; youtube_video_id?: string; is_primary: boolean; is_published: boolean }>;
}
interface MergeAuditRow {
  id: string;
  created_at: string;
  rollback_eligible: boolean;
  source_snapshot: { stable_key?: string };
  target_snapshot: { stable_key?: string };
}

const name = (item: AdminExerciseRow | undefined, language: string) =>
  item?.exercise_translations.find((translation) => translation.locale === language)?.name
  ?? item?.exercise_translations.find((translation) => translation.locale === 'en')?.name
  ?? item?.stable_key
  ?? '';

function ComparisonCard({ item, label, language }: { item?: AdminExerciseRow; label: string; language: string }) {
  const { t } = useI18n();
  if (!item) return <section className="card min-h-52"><p className="text-slate-500">{label}</p></section>;
  const translation = item.exercise_translations.find((entry) => entry.locale === language)
    ?? item.exercise_translations.find((entry) => entry.locale === 'en');
  const visual = resolveAdminExerciseVisualSource({ id: item.id, stableKey: item.stable_key });
  return <section className="card min-w-0" aria-label={`${label}: ${name(item, language)}`}>
    <p className="eyebrow">{label}</p>
    <h2 className="mt-2 break-words text-2xl font-black" dir="auto">{name(item, language)}</h2>
    <code className="mt-1 block break-all text-xs text-slate-500">{item.stable_key}</code>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-slate-500">{t('movementFamily')}</dt><dd>{item.movement_family}</dd></div>
      <div><dt className="text-slate-500">{t('category')}</dt><dd>{item.category}</dd></div>
      <div><dt className="text-slate-500">{t('difficulty')}</dt><dd>{item.difficulty}</dd></div>
      <div><dt className="text-slate-500">{t('measurement')}</dt><dd>{item.measurement_type}</dd></div>
      <div><dt className="text-slate-500">{t('mediaItems')}</dt><dd>{item.exercise_media.length}</dd></div>
      <div><dt className="text-slate-500">{t('visualStatus')}</dt><dd>{visual}</dd></div>
    </dl>
    <p className="mt-4 text-sm text-slate-500" dir="auto">{translation?.description}</p>
    <div className="mt-3 flex flex-wrap gap-1">{[...item.aliases, ...item.keywords].slice(0, 10).map((value) => <span className="chip" key={value}>{value}</span>)}</div>
  </section>;
}

export function AdminExerciseMergePage() {
  const { t, language } = useI18n();
  const [items, setItems] = useState<AdminExerciseRow[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [preview, setPreview] = useState<ExerciseMergePreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [audits, setAudits] = useState<MergeAuditRow[]>([]);
  const setToast = useAppStore((state) => state.setToast);
  useEffect(() => {
    const token = getAdminSession()?.accessToken;
    if (!token) return;
    void Promise.all([
      supabaseRequest<AdminExerciseRow[]>('/rest/v1/global_exercises?select=*,exercise_translations(*),exercise_media(*)&order=stable_key', {}, token),
      supabaseRequest<MergeAuditRow[]>('/rest/v1/exercise_merge_audits?select=id,created_at,rollback_eligible,source_snapshot,target_snapshot&order=created_at.desc&limit=20', {}, token).catch(() => []),
    ]).then(([exercises, auditRows]) => { setItems(exercises); setAudits(auditRows); })
      .catch(() => setError(t('unableToLoadExercises')));
  }, [t]);
  const source = useMemo(() => items.find((item) => item.id === sourceId), [items, sourceId]);
  const target = useMemo(() => items.find((item) => item.id === targetId), [items, targetId]);
  const runPreview = async () => {
    if (!sourceId || !targetId) return;
    setBusy(true); setError(''); setPreview(null); setConfirmation('');
    try { setPreview(await previewExerciseMerge(sourceId, targetId)); }
    catch { setError(t('mergePreviewFailed')); }
    finally { setBusy(false); }
  };
  const execute = async () => {
    if (!preview?.safe || !target || confirmation !== target.stable_key) return;
    setBusy(true); setError('');
    try {
      await executeExerciseMerge(sourceId, targetId, target.stable_key);
      setPreview(null); setSourceId(''); setTargetId(''); setConfirmation('');
      setToast(t('mergeCompleted'));
      window.dispatchEvent(new CustomEvent('calistrack:admin-content-changed'));
    } catch { setError(t('mergeFailed')); }
    finally { setBusy(false); }
  };
  const options = items.map((item) => <option key={item.id} value={item.id}>{name(item, language)} · {item.stable_key}</option>);
  return <main className="mx-auto max-w-5xl pb-16">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="eyebrow">{t('exerciseManagement')}</p><h1 className="text-4xl font-black">{t('mergeExercises')}</h1><p className="mt-2 max-w-2xl text-slate-500">{t('mergeExercisesDescription')}</p></div>
      <span className="chip">{audits.length} {t('references')}</span>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
      <label className="font-bold">{t('sourceExercise')}<select className="field mt-2" value={sourceId} onChange={(event) => { setSourceId(event.target.value); setPreview(null); }}><option value="">—</option>{options}</select></label>
      <ArrowRight className="directional-icon mx-auto hidden text-slate-400 md:block" aria-hidden="true" />
      <label className="font-bold">{t('targetExercise')}<select className="field mt-2" value={targetId} onChange={(event) => { setTargetId(event.target.value); setPreview(null); }}><option value="">—</option>{options}</select></label>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><ComparisonCard item={source} label={t('sourceExercise')} language={language} /><ComparisonCard item={target} label={t('targetExercise')} language={language} /></div>
    <button className="btn-primary mt-5" disabled={busy || !sourceId || !targetId} onClick={() => void runPreview()}><GitMerge aria-hidden="true" size={18} />{busy ? t('loading') : t('previewMerge')}</button>
    <p className="mt-2 text-sm text-slate-500">{t('mergeNoChangesPreview')}</p>
    {error && <p className="mt-4 text-red-500" role="alert">{error}</p>}
    {preview && <section className="card mt-6" aria-label={t('mergeImpact')}>
      <div className="flex items-center gap-3">{preview.safe ? <CheckCircle2 className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}<div><h2 className="text-2xl font-black">{t('mergeImpact')}</h2><strong className={preview.safe ? 'text-emerald-500' : 'text-red-500'}>{preview.safe ? t('mergeSafe') : t('mergeBlocking')}</strong></div></div>
      {!!preview.blocking.length && <div className="mt-4 rounded-xl bg-red-500/10 p-4"><strong>{t('mergeBlocking')}</strong><ul className="mt-2 list-inside list-disc">{preview.blocking.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
      {!!preview.warnings.length && <div className="mt-4 rounded-xl bg-amber-500/10 p-4"><strong className="flex items-center gap-2"><AlertTriangle size={18} />{t('mergeWarnings')}</strong><ul className="mt-2 list-inside list-disc">{preview.warnings.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(preview.counts).map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="text-xl font-black">{value}</dd></div>)}</dl>
      <p className="mt-5 font-bold">{t('targetRemainsCanonical')}</p><p className="text-sm text-slate-500">{t('targetContentWins')}</p>
      {preview.safe && target && <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
        <label className="font-bold">{t('typeTargetKey')}<input className="field mt-2" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <button className="btn-danger mt-4" disabled={busy || confirmation !== target.stable_key} onClick={() => void execute()}>{t('executeMerge')}</button>
      </div>}
    </section>}
    {audits.length > 0 && <section className="mt-8" aria-label={t('mergeImpact')}><h2 className="text-2xl font-black">{t('mergeExercises')}</h2><div className="mt-3 grid gap-2">{audits.map((audit) => <article className="card flex flex-wrap items-center justify-between gap-3" key={audit.id}><div><code>{audit.source_snapshot.stable_key} → {audit.target_snapshot.stable_key}</code><p className="text-sm text-slate-500">{new Date(audit.created_at).toLocaleString(language)}</p></div><span className="chip">{audit.rollback_eligible ? (language === 'he' ? 'ניתן לביטול' : 'Rollback eligible') : (language === 'he' ? 'סופי' : 'Final')}</span></article>)}</div></section>}
  </main>;
}
