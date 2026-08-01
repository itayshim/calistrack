import { CheckCircle2, Play, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createFrontLeverWorkout, frontLeverLevels, frontLeverWarmup, validateFrontLeverContent } from '../../features/skills/frontLever';
import { useI18n } from '../../hooks/useI18n';
import { useAppStore } from '../../store/useAppStore';
import { getExerciseName } from '../../utils/exerciseLocalization';

export function AdminSkillQaPage() {
  const { language } = useI18n();
  const store = useAppStore();
  const nav = useNavigate();
  const validation = validateFrontLeverContent(store.exercises);
  const label = (en: string, he: string) => language === 'he' ? he : en;
  const startPreview = (levelKey: string) => {
    if (!validation.valid) return;
    if (store.activeWorkout) { store.setToast(label('Finish or cancel the active workout first.', 'יש לסיים או לבטל תחילה את האימון הפעיל.')); return; }
    const workout = createFrontLeverWorkout(levelKey, store.exercises, true, 'admin-skill-preview', true);
    if (store.startWorkout(workout)) nav(`/admin/skills/front-lever/test/${levelKey}`);
  };
  return <main className="mx-auto max-w-5xl animate-rise pb-10">
    <p className="eyebrow">{label('Administrator · Preview', 'מנהל מערכת · תצוגה מקדימה')}</p><div className="mt-2 flex flex-wrap items-center gap-3"><ShieldCheck className="text-brand"/><h1 className="text-4xl font-black">Front Lever Skill QA</h1></div><p className="mt-3 max-w-2xl text-slate-500">{label('Inspect every locked or unlocked level without changing user progress, history, records, or analytics.', 'בדיקת כל שלב נעול או פתוח ללא שינוי התקדמות, היסטוריה, שיאים או נתוני ניתוח.')}</p>
    <section className={`mt-6 rounded-3xl border p-5 ${validation.valid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}><div className="flex items-center gap-2 font-black">{validation.valid ? <CheckCircle2 className="text-emerald-500"/> : <TriangleAlert className="text-red-500"/>}{validation.valid ? label('Content validation passed', 'אימות התוכן עבר בהצלחה') : label('Blocking content errors', 'שגיאות תוכן חוסמות')}</div>{validation.blockingErrors.length > 0 && <ul className="mt-3 space-y-1 text-sm">{validation.blockingErrors.map((issue, index) => <li key={`${issue.code}-${index}`}><code>{issue.code}</code> · {issue.message}</li>)}</ul>}</section>
    <section className="card mt-6"><h2 className="text-xl font-black">{label('Warm-up phase', 'שלב החימום')}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{frontLeverWarmup.map((item, index) => { const exercise = store.exercises.find((candidate) => candidate.stableKey === item.exerciseKey); return <div className="surface-subtle rounded-2xl p-3" key={item.exerciseKey}><strong><bdi>{index + 1}</bdi>. {exercise ? getExerciseName(exercise, language) : item.exerciseKey}</strong><p className="text-sm text-slate-500"><code>{item.exerciseKey}</code> · <bdi>{language === 'he' ? item.guidanceHe : item.guidanceEn}</bdi></p></div>;})}</div></section>
    <div className="mt-6 grid gap-4">{frontLeverLevels.map((level) => { const result = validateFrontLeverContent(store.exercises, level.key); return <article className="card" key={level.key}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label">{label(`Level ${level.number} · Preview`, `שלב ${level.number} · תצוגה מקדימה`)}</p><h2 className="mt-1 text-2xl font-black">{language === 'he' ? level.nameHe : level.nameEn}</h2></div><button className="btn-primary" disabled={!result.valid} onClick={() => startPreview(level.key)}><Play size={18}/>{label('Run test workout', 'הפעלת אימון בדיקה')}</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-start text-sm"><thead><tr className="text-slate-500"><th className="p-2">#</th><th className="p-2">{label('Exercise / stable key', 'תרגיל / מפתח יציב')}</th><th className="p-2">{label('Type', 'סוג')}</th><th className="p-2">{label('Prescription', 'מרשם')}</th><th className="p-2">{label('Rest', 'מנוחה')}</th><th className="p-2">{label('Role', 'תפקיד')}</th></tr></thead><tbody>{level.work.map((item, index) => { const exercise = store.exercises.find((candidate) => candidate.stableKey === item.exerciseKey); return <tr className="border-t border-slate-200/60 dark:border-white/[.06]" key={item.exerciseKey}><td className="p-2"><bdi>{index + 1}</bdi></td><td className="p-2 font-bold">{exercise ? getExerciseName(exercise, language) : label('Missing', 'חסר')}<code className="ms-2 block text-xs text-slate-500">{item.exerciseKey}</code></td><td className="p-2">{item.measurementType}</td><td className="p-2"><bdi>{item.sets} × {item.target}</bdi></td><td className="p-2"><bdi>90s</bdi></td><td className="p-2">{item.role}</td></tr>;})}</tbody></table></div></article>;})}</div>
  </main>;
}
