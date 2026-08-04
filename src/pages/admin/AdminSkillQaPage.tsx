import { CheckCircle2, Play, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  builtInSkillRegistry,
  getSkillDefinition,
  skillRegistry,
} from '../../features/skills/registry';
import {
  createSkillWorkout,
  validateSkillContent,
  type SkillDefinition,
} from '../../features/skills/skillEngine';
import { loadAdminSkills } from '../../services/skillDefinitions';
import { useI18n } from '../../hooks/useI18n';
import { useAppStore } from '../../store/useAppStore';
import { getExerciseName } from '../../utils/exerciseLocalization';
export function AdminSkillQaPage() {
  const { skillKey } = useParams();
  const [params] = useSearchParams();
  const original = params.get('source') === 'original';
  const builtInSkill = skillKey ? (original ? builtInSkillRegistry.find((item) => item.key === skillKey) : getSkillDefinition(skillKey)) : undefined;
  const [managedSkill, setManagedSkill] = useState<SkillDefinition>();
  const [loading, setLoading] = useState(Boolean(skillKey && !builtInSkill));
  useEffect(() => {
    if (!skillKey || original) return;
    void loadAdminSkills()
      .then((records) => {
        setManagedSkill(records.find((record) => record.stableKey === skillKey)?.definition);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [original, skillKey]);
  const skill = original ? builtInSkill : managedSkill ?? builtInSkill;
  const { language } = useI18n();
  const store = useAppStore();
  const nav = useNavigate();
  const label = (en: string, he: string) => (language === 'he' ? he : en);
  if (!skillKey)
    return (
      <main className="mx-auto max-w-5xl">
        <p className="eyebrow">
          {label('Administrator · Skill QA', 'מנהל מערכת · בדיקת מיומנויות')}
        </p>
        <h1 className="mt-2 text-4xl font-black">
          {label('Skill Training QA', 'בדיקת אימון מיומנויות')}
        </h1>
        <div className="mt-6 grid gap-4">
          {skillRegistry.map((item) => (
            <Link
              className="card flex items-center justify-between"
              to={`/admin/skills/${item.key}/preview`}
              key={item.key}
            >
              <strong>{language === 'he' ? item.nameHe : item.nameEn}</strong>
              <span>
                {item.levels.length} {label('levels', 'שלבים')}
              </span>
            </Link>
          ))}
        </div>
      </main>
    );
  if (!original && loading)
    return (
      <main className="mx-auto max-w-5xl">
        {label('Loading Skill preview…', 'טוען תצוגת מיומנות…')}
      </main>
    );
  if (!skill) return <Navigate to="/admin/skills" replace />;
  const validation = validateSkillContent(skill, store.exercises);
  const start = (levelKey: string) => {
    if (!validation.valid) return;
    if (store.activeWorkout) {
      store.setToast(
        label(
          'Finish or cancel the active workout first.',
          'יש לסיים או לבטל תחילה את האימון הפעיל.',
        ),
      );
      return;
    }
    const workout = createSkillWorkout(skill, levelKey, store.exercises, true, 'admin-skill-preview', true);
    if (store.startWorkout(workout)) nav(`/admin/skills/${skill.key}/test/${levelKey}`);
  };
  return (
    <main className="mx-auto max-w-5xl animate-rise pb-10">
      <p className="eyebrow">{label('Administrator · Preview', 'מנהל מערכת · תצוגה מקדימה')}</p>
      <div className="mt-2 flex items-center gap-3">
        <ShieldCheck className="text-brand" />
        <h1 className="text-4xl font-black">
          {language === 'he' ? `${skill.nameHe} · QA` : `${skill.nameEn} Skill QA`}
        </h1>
      </div>
      <section
        className={`mt-6 rounded-3xl border p-5 ${validation.valid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}
      >
        <div className="flex items-center gap-2 font-black">
          {validation.valid ? <CheckCircle2 /> : <TriangleAlert />}
          {validation.valid
            ? label('Content validation passed', 'אימות התוכן עבר בהצלחה')
            : label('Blocking content errors', 'שגיאות תוכן חוסמות')}
        </div>
        {validation.blockingErrors.map((x, i) => (
          <p className="mt-2 text-sm" key={i}>
            <code>{x.code}</code> · {x.message}
          </p>
        ))}
      </section>
      <section className="card mt-6">
        <h2 className="text-xl font-black">{label('Warm-up phase', 'שלב החימום')}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {skill.warmup.map((item, i) => {
            const e = store.exercises.find((x) => x.stableKey === item.exerciseKey);
            return (
              <div className="surface-subtle rounded-2xl p-3" key={item.exerciseKey}>
                <strong>
                  {i + 1}. {e ? getExerciseName(e, language) : item.exerciseKey}
                </strong>
                <p className="text-sm text-slate-500">
                  <code>{item.exerciseKey}</code> ·{' '}
                  {language === 'he' ? item.guidanceHe : item.guidanceEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <div className="mt-6 grid gap-4">
        {skill.levels.map((level) => {
          const result = validateSkillContent(skill, store.exercises, level.key);
          return (
            <article className="card" key={level.key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label">
                    {label(`Level ${level.number} · Preview`, `שלב ${level.number} · תצוגה`)}
                  </p>
                  <h2 className="text-2xl font-black">
                    {language === 'he' ? level.nameHe : level.nameEn}
                  </h2>
                </div>
                <button
                  className="btn-primary"
                  disabled={!result.valid}
                  onClick={() => start(level.key)}
                >
                  <Play size={18} />
                  {label('Run test workout', 'הפעלת אימון בדיקה')}
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[42rem] text-sm">
                  <tbody>
                    {level.work.map((item, i) => (
                      <tr
                        className="border-t border-slate-200/60 dark:border-white/[.06]"
                        key={item.exerciseKey}
                      >
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">
                          <code>{item.exerciseKey}</code>
                        </td>
                        <td className="p-2">{item.measurementType}</td>
                        <td className="p-2">
                          {item.sets} × {item.target}
                        </td>
                        <td className="p-2">{item.restSeconds ?? 90}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm">
                <strong>{label('Assessment', 'מבחן')}:</strong> {level.assessment.exerciseKey} ·{' '}
                {level.assessment.target} {level.assessment.measurementType}
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
