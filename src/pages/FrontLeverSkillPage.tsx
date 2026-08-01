import { Check, History, LockKeyhole, Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { createFrontLeverWorkout, frontLeverLevels, validateFrontLeverContent } from '../features/skills/frontLever';
import { createId } from '../utils/id';
import type { Program } from '../types';
import { useState } from 'react';

export function FrontLeverSkillPage() {
  const { language } = useI18n();
  const store = useAppStore();
  const nav = useNavigate();
  const [targetWorkoutId, setTargetWorkoutId] = useState('');
  const progress = store.skillProgress['front-lever'] ?? { activeLevelKey: 'tuck', unlockedLevelKeys: ['tuck'], masteredLevelKeys: [] };
  const active = frontLeverLevels.find((level) => level.key === progress.activeLevelKey) ?? frontLeverLevels[0];
  const contentValidation = validateFrontLeverContent(store.exercises);
  const label = (en: string, he: string) => language === 'he' ? he : en;
  const start = (assessment = false) => {
    if (!contentValidation.valid) { store.setToast(label('This skill is temporarily unavailable because its content needs administrator review.', 'המיומנות אינה זמינה זמנית מפני שהתוכן דורש בדיקת מנהל מערכת.')); return; }
    if (store.activeWorkout) { nav(`/workout/${store.activeWorkout.id}`); return; }
    const workout = assessment
      ? import('../features/skills/frontLever').then(({ createFrontLeverAssessment }) => createFrontLeverAssessment(active.key, store.exercises))
      : Promise.resolve(createFrontLeverWorkout(active.key, store.exercises, true));
    void workout.then((template) => { if (store.startWorkout(template)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`); });
  };
  const addToProgram = () => {
    const now = new Date().toISOString();
    const existing = store.programs.find((program) => program.id === store.activeProgramId);
    const programId = existing?.id ?? createId();
    if (existing?.workouts.some((workout) => workout.skillLink?.skillKey === 'front-lever' && workout.skillLink.levelKey === active.key)) {
      store.setToast(label('This skill workout is already in the active program.', 'אימון המיומנות כבר נמצא בתוכנית הפעילה.'));
      return;
    }
    const workout = createFrontLeverWorkout(active.key, store.exercises, false, programId);
    const program: Program = existing
      ? { ...existing, workouts: [...existing.workouts, workout], updatedAt: now }
      : { id: programId, name: label('Front Lever Program', 'תוכנית פרונט לבר'), workouts: [workout], createdAt: now, updatedAt: now };
    store.saveProgram(program);
  };
  const addToExistingWorkout = () => {
    if (!targetWorkoutId) return;
    const containing = store.programs.find((program) => program.workouts.some((workout) => workout.id === targetWorkoutId));
    const targetWorkout = containing?.workouts.find((workout) => workout.id === targetWorkoutId);
    if (!containing || !targetWorkout) return;
    if (targetWorkout.skillLink?.skillKey === 'front-lever' || targetWorkout.exercises.some((item) => item.skillRole && item.skillSection === 'work')) {
      store.setToast(label('This workout already contains a generated skill section.', 'האימון כבר כולל מקטע מיומנות שנוצר אוטומטית.'));
      return;
    }
    const generated = createFrontLeverWorkout(active.key, store.exercises, false, containing.id);
    const offset = targetWorkout.exercises.length;
    const updated: Program = { ...containing, updatedAt: new Date().toISOString(), workouts: containing.workouts.map((workout) => workout.id === targetWorkoutId ? { ...workout, updatedAt: new Date().toISOString(), exercises: [...workout.exercises, ...generated.exercises.map((item, index) => ({ ...item, order: offset + index }))], skillLink: generated.skillLink } : workout) };
    store.saveProgram(updated);
  };
  return <div className="animate-rise pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">{label('Skill path', 'מסלול מיומנות')}</p><h1 className="mt-2 text-4xl font-black">Front Lever</h1><p className="mt-2 text-slate-500">{label('Six progressive levels. Train, assess, and unlock the next step.', 'שישה שלבים מדורגים. מתאמנים, נבחנים ופותחים את השלב הבא.')}</p></div>
      <button className="btn-secondary" onClick={() => nav('/skills/front-lever/history')}><History size={18}/>{label('Skill history', 'היסטוריית מיומנות')}</button>
    </div>
    <section className="card mt-7 border-brand/50">
      <p className="label">{label('Active level', 'שלב פעיל')}</p><h2 className="mt-2 text-2xl font-black">{language === 'he' ? active.nameHe : active.nameEn}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><button className="btn-primary" disabled={!contentValidation.valid} onClick={() => start(false)}><Play size={18}/>{label('Start skill workout', 'התחלת אימון מיומנות')}</button><button className="btn-secondary" disabled={!contentValidation.valid} onClick={() => start(true)}>{label(`Assessment · ${active.assessmentSeconds} sec`, `מבחן · ${active.assessmentSeconds} שניות`)}</button><button className="btn-secondary" disabled={!contentValidation.valid} onClick={addToProgram}><Plus size={18}/>{label('Add to program', 'הוספה לתוכנית')}</button></div>
      {!contentValidation.valid && <p role="alert" className="mt-3 text-sm font-bold text-red-500">{label('Skill content is unavailable pending administrator review.', 'תוכן המיומנות אינו זמין עד לבדיקת מנהל מערכת.')}</p>}
      {store.programs.some((program) => program.workouts.length) && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><label><span className="sr-only">{label('Existing workout', 'אימון קיים')}</span><select className="field" value={targetWorkoutId} onChange={(event) => setTargetWorkoutId(event.target.value)}><option value="">{label('Add as a skill section to…', 'הוספה כמקטע מיומנות אל…')}</option>{store.programs.flatMap((program) => program.workouts.map((workout) => <option value={workout.id} key={workout.id}>{program.name} · {workout.name}</option>))}</select></label><button className="btn-secondary" disabled={!targetWorkoutId} onClick={addToExistingWorkout}>{label('Add section', 'הוספת מקטע')}</button></div>}
      <p className="mt-3 text-xs text-slate-500">{label('Warm-up is optional and does not affect workout success. Work sets rest 90 seconds.', 'החימום אופציונלי ואינו משפיע על הצלחת האימון. מנוחה של 90 שניות בסטים העיקריים.')}</p>
    </section>
    <div className="mt-6 grid gap-4">
      {frontLeverLevels.map((level) => {
        const unlocked = progress.unlockedLevelKeys.includes(level.key), mastered = progress.masteredLevelKeys.includes(level.key), selected = level.key === active.key;
        return <article key={level.key} className={`card ${selected ? 'border-brand/60' : ''}`}>
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 font-black dark:bg-white/[.06]">{level.number}</span><div className="min-w-0 flex-1"><h3 className="font-black">{language === 'he' ? level.nameHe : level.nameEn}</h3><p className="text-sm text-slate-500">{label(`${level.work.length} exercises · assessment ${level.assessmentSeconds} sec`, `${level.work.length} תרגילים · מבחן ${level.assessmentSeconds} שניות`)}</p></div>{mastered ? <Check className="text-brand"/> : unlocked ? null : <LockKeyhole className="text-slate-500"/>}</div>
          {unlocked && !selected && <button className="btn-secondary mt-4 w-full" onClick={() => store.activateSkillLevel('front-lever', level.key)}>{label('Make active level', 'הגדרה כשלב פעיל')}</button>}
        </article>;
      })}
    </div>
    <div className="surface-subtle mt-6 rounded-3xl p-4 text-sm text-slate-500">{label('Placement assessment is being held behind a feature flag until its side-by-side multi-level protocol is fully validated. You can assess each unlocked level safely now.', 'מבחן המיקום נשמר מאחורי דגל תכונה עד לאימות מלא של פרוטוקול רב־שלבי לשני הצדדים. ניתן להיבחן כעת בכל שלב פתוח.')}</div>
  </div>;
}
