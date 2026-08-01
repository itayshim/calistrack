import { Check, ChevronRight, Ellipsis, History, LockKeyhole, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { frontLeverLevels } from '../features/skills/frontLever';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';

export function FrontLeverSkillPage() {
  const { language } = useI18n();
  const progress = useAppStore((state) => state.skillProgress['front-lever']);
  const activeWorkout = useAppStore((state) => state.activeWorkout);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const state = progress ?? { activeLevelKey: 'tuck', unlockedLevelKeys: ['tuck'], masteredLevelKeys: [], completedWorkoutSessionIds: [], assessments: [] };
  const active = frontLeverLevels.find((level) => level.key === state.activeLevelKey) ?? frontLeverLevels[0];
  const label = (en: string, he: string) => language === 'he' ? he : en;
  const activePath = `/skills/front-lever/levels/${active.key}`;

  return <div className="animate-rise pb-8">
    <header className="flex items-start justify-between gap-4">
      <div><p className="eyebrow">{label('Skill path', 'מסלול מיומנות')}</p><h1 className="mt-2 text-4xl font-black">Front Lever</h1><p className="mt-2 max-w-2xl text-slate-500">{label('Build straight-arm pulling strength through six focused progressions.', 'בניית כוח משיכה בידיים ישרות דרך שישה שלבים ממוקדים.')}</p></div>
      <div className="relative"><button className="icon-button" aria-label={label('Skill actions', 'פעולות מיומנות')} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Ellipsis /></button>{menuOpen && <div className="action-surface absolute end-0 top-12 z-20 min-w-52 rounded-2xl p-2 shadow-xl"><Link className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold" to="/skills/front-lever/history" onClick={() => setMenuOpen(false)}><History size={18}/>{label('Skill history', 'היסטוריית מיומנות')}</Link></div>}</div>
    </header>

    <section className="surface-panel mt-6 rounded-3xl border border-brand/40 p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="label">{label('Active level', 'שלב פעיל')}</p><h2 className="mt-1 text-2xl font-black">{language === 'he' ? active.nameHe : active.nameEn}</h2><p className="mt-1 text-sm text-slate-500"><bdi>{label(`Level ${active.number} of 6`, `שלב ${active.number} מתוך 6`)}</bdi></p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 font-black text-brand">{active.number}</span></div>
      <button className="btn-primary mt-5 w-full sm:w-auto" onClick={() => activeWorkout ? nav(`/workout/${activeWorkout.id}`) : nav(activePath)}><Play size={18} fill="currentColor"/>{activeWorkout ? label('Continue workout', 'המשך אימון') : label('Start current level', 'התחלת השלב הנוכחי')}</button>
    </section>

    <section className="mt-7"><h2 className="text-2xl font-black">{label('Progression', 'מסלול ההתקדמות')}</h2><div className="mt-4 grid gap-3">
      {frontLeverLevels.map((level) => {
        const unlocked = state.unlockedLevelKeys.includes(level.key);
        const mastered = state.masteredLevelKeys.includes(level.key);
        const selected = state.activeLevelKey === level.key;
        const status = mastered ? label('Mastered', 'נשלט') : selected ? label('Active', 'פעיל') : unlocked ? label('Unlocked', 'פתוח') : label('Locked · preview available', 'נעול · תצוגה זמינה');
        return <Link key={level.key} to={`/skills/front-lever/levels/${level.key}`} className={`card group block min-w-0 max-w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${selected ? 'border-brand/60' : ''}`}>
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 font-black dark:bg-white/[.06]">{level.number}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{language === 'he' ? level.nameHe : level.nameEn}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-white/[.06]">{status}</span></div><p className="mt-1 text-sm text-slate-500"><bdi>{label(`${level.work.length} work exercises · assessment ${level.assessmentSeconds} sec`, `${level.work.length} תרגילי עבודה · מבחן ${level.assessmentSeconds} שניות`)}</bdi></p><p className="mt-2 max-w-full truncate text-xs text-slate-500">{level.work.map((item) => item.exerciseKey).join(' · ')}</p></div>{mastered ? <Check className="shrink-0 text-brand"/> : !unlocked ? <LockKeyhole className="shrink-0 text-slate-500"/> : null}<ChevronRight className="directional-icon shrink-0 text-slate-400" /></div>
        </Link>;
      })}
    </div></section>
  </div>;
}
