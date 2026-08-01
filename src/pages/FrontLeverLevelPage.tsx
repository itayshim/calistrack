import { ArrowLeft, Check, LockKeyhole, Play, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ExerciseDemonstrationButton } from '../components/ExerciseDemonstration';
import { deriveSkillLevelPerformance } from '../features/skills/performance';
import { createFrontLeverAssessment, createFrontLeverWorkout, frontLeverLevels, frontLeverWarmup, validateFrontLeverContent } from '../features/skills/frontLever';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';
import { getExerciseName } from '../utils/exerciseLocalization';
import { createId } from '../utils/id';
import { formatAddedWeight, formatDuration, formatReps } from '../utils/performance';

export function FrontLeverLevelPage() {
  const { levelKey } = useParams();
  const level = frontLeverLevels.find((item) => item.key === levelKey);
  const { language } = useI18n();
  const store = useAppStore();
  const nav = useNavigate();
  const progress = store.skillProgress['front-lever'] ?? { activeLevelKey: 'tuck', unlockedLevelKeys: ['tuck'], masteredLevelKeys: [], completedWorkoutSessionIds: [], assessments: [] };
  const label = (en: string, he: string) => language === 'he' ? he : en;
  const summary = useMemo(() => level ? deriveSkillLevelPerformance(level.performance!, store.exercises, store.workoutSessions, progress.assessments, level.key) : {}, [level, progress.assessments, store.exercises, store.workoutSessions]);
  if (!level) return <Navigate to="/skills/front-lever" replace />;
  const unlocked = progress.unlockedLevelKeys.includes(level.key);
  const active = progress.activeLevelKey === level.key;
  const mastered = progress.masteredLevelKeys.includes(level.key);
  const contentValid = validateFrontLeverContent(store.exercises, level.key).valid;
  const primary = level.work[0];
  const formatMetric = (value: number, reps?: number, weight?: number) => level.performance?.metric === 'duration' ? formatDuration(value, language) : level.performance?.metric === 'weighted_reps' ? `${formatReps(reps ?? value, language)} · ${formatAddedWeight(weight ?? 0, language)}` : formatReps(value, language);
  const start = (assessment = false) => {
    if (!unlocked || !contentValid) return;
    if (store.activeWorkout) { nav(`/workout/${store.activeWorkout.id}`); return; }
    const workout = assessment ? createFrontLeverAssessment(level.key, store.exercises) : createFrontLeverWorkout(level.key, store.exercises, true);
    if (store.startWorkout(workout)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const addToProgram = () => {
    if (!unlocked || !contentValid) return;
    const existing = store.programs.find((program) => program.id === store.activeProgramId);
    if (existing?.workouts.some((workout) => workout.skillLink?.skillKey === 'front-lever' && workout.skillLink.levelKey === level.key)) { store.setToast(label('This level is already in the active program.', 'השלב כבר נמצא בתוכנית הפעילה.')); return; }
    const now = new Date().toISOString();
    const programId = existing?.id ?? createId();
    const workout = createFrontLeverWorkout(level.key, store.exercises, false, programId);
    const program: Program = existing ? { ...existing, workouts: [...existing.workouts, workout], updatedAt: now } : { id: programId, name: label('Front Lever Program', 'תוכנית פרונט לבר'), workouts: [workout], createdAt: now, updatedAt: now };
    store.saveProgram(program);
  };

  return <div className="animate-rise pb-8">
    <Link className="inline-flex min-h-11 items-center gap-2 font-bold text-slate-500" to="/skills/front-lever"><ArrowLeft className="directional-icon" size={18}/>{label('Front Lever progression', 'מסלול פרונט לבר')}</Link>
    <header className="mt-3"><p className="eyebrow"><bdi>{label(`Level ${level.number} of 6`, `שלב ${level.number} מתוך 6`)}</bdi></p><h1 className="mt-2 text-4xl font-black">{language === 'he' ? level.nameHe : level.nameEn}</h1><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-brand/15 px-3 py-1 text-sm font-black text-brand">{mastered ? label('Mastered', 'נשלט') : active ? label('Active', 'פעיל') : unlocked ? label('Unlocked', 'פתוח') : label('Locked', 'נעול')}</span>{!unlocked && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><LockKeyhole size={15}/>{label(`Pass Level ${level.number - 1} assessment to unlock`, `יש לעבור את מבחן שלב ${level.number - 1} כדי לפתוח`)}</span>}</div></header>

    <section className="surface-panel mt-6 rounded-3xl p-5" aria-labelledby="performance-heading"><h2 id="performance-heading" className="text-xl font-black">{label('Level performance', 'ביצועי השלב')}</h2>{summary.best ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><div><p className="label">{label('Best hold', 'החזקה מיטבית')}</p><p className="mt-1 text-2xl font-black"><bdi>{formatMetric(summary.best.value, summary.best.reps, summary.best.addedWeightKg)}</bdi></p></div><div><p className="label">{label('Current work target', 'יעד האימון הנוכחי')}</p><p className="mt-1 font-black"><bdi>{primary.sets} × {formatMetric(primary.target)}</bdi></p></div><div><p className="label">{label('Assessment target', 'יעד המבחן')}</p><p className="mt-1 font-black"><bdi>{formatDuration(level.assessmentSeconds, language)}</bdi></p></div></div> : <div className="mt-3"><p className="font-bold">{label('No recorded result yet', 'עדיין אין תוצאה מתועדת')}</p><p className="text-sm text-slate-500">{label('Complete this progression to establish your first best result.', 'השלם ביצוע של השלב כדי לקבוע תוצאה ראשונה.')}</p><p className="mt-3 text-sm"><bdi>{label(`Current work: ${primary.sets} × ${primary.target} sec · Assessment: ${level.assessmentSeconds} sec`, `אימון נוכחי: ${primary.sets} × ${primary.target} שניות · מבחן: ${level.assessmentSeconds} שניות`)}</bdi></p></div>}{summary.latest && <p className="mt-3 text-xs text-slate-500">{label('Latest result', 'תוצאה אחרונה')} · {new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium' }).format(new Date(summary.latest.performedAt))}</p>}
      <div className="mt-4 border-t border-slate-200/70 pt-3 text-sm dark:border-white/[.08]"><strong>{label('Assessment', 'מבחן')}:</strong> {summary.bestAssessment ? <bdi>{formatDuration(summary.bestAssessment.durationSeconds, language)} · {summary.bestAssessment.passed ? label('Assessment passed', 'המבחן עבר בהצלחה') : label('Assessment not yet passed', 'המבחן עדיין לא עבר')}</bdi> : label('Assessment not yet passed', 'המבחן עדיין לא עבר')}</div>
    </section>

    <section className="mt-7"><h2 className="text-2xl font-black">{label("Today's prescription", 'תוכנית האימון')}</h2><div className="mt-4 grid gap-3">{level.work.map((item) => { const exercise = store.exercises.find((candidate) => candidate.stableKey === item.exerciseKey); return <article className="card" key={item.exerciseKey}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{exercise ? getExerciseName(exercise, language) : item.exerciseKey}</h3><p className="mt-1 text-sm text-slate-500"><bdi>{item.sets} × {item.measurementType === 'duration' ? formatDuration(item.target, language) : formatReps(item.target, language)} · {label('90 sec rest', '90 שניות מנוחה')}</bdi></p></div>{exercise && <ExerciseDemonstrationButton exercise={exercise}/>}</div></article>; })}</div></section>

    <section className="surface-subtle mt-7 rounded-3xl p-5"><h2 className="text-xl font-black">{label('Optional warm-up', 'חימום אופציונלי')}</h2><p className="mt-1 text-sm text-slate-500">{label('Warm-up items use simple Done/Skip actions and do not count toward progress.', 'פריטי החימום משתמשים בפעולות בוצע/דילוג ואינם נספרים בהתקדמות.')}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{frontLeverWarmup.map((item) => { const exercise = store.exercises.find((candidate) => candidate.stableKey === item.exerciseKey); return <div className="rounded-2xl bg-white p-3 dark:bg-white/[.05]" key={item.exerciseKey}><strong>{exercise ? getExerciseName(exercise, language) : item.exerciseKey}</strong><p className="text-sm text-slate-500"><bdi>{language === 'he' ? item.guidanceHe : item.guidanceEn}</bdi></p>{exercise && <ExerciseDemonstrationButton exercise={exercise} className="mt-2"/>}</div>;})}</div></section>

    <section className="card mt-7"><h2 className="text-xl font-black">{label('Assessment', 'מבחן')}</h2><p className="mt-2 text-slate-500"><bdi>{label(`Hold ${level.assessmentSeconds} seconds with good technique. Formal assessment state remains separate from your general best.`, `החזקה של ${level.assessmentSeconds} שניות בטכניקה טובה. מצב המבחן הרשמי נשאר נפרד מהשיא הכללי.`)}</bdi></p></section>

    <div className="mt-7 grid gap-3 sm:grid-cols-3"><button className="btn-primary" disabled={!unlocked || !contentValid} onClick={() => start(false)}><Play size={18}/>{active && store.activeWorkout ? label('Continue training', 'המשך אימון') : unlocked ? label('Start this level', 'התחלת השלב') : label('Preview only', 'תצוגה בלבד')}</button><button className="btn-secondary" disabled={!unlocked || active} onClick={() => store.activateSkillLevel('front-lever', level.key)}><Check size={18}/>{label('Set as active level', 'הגדרה כשלב פעיל')}</button><button className="btn-secondary" disabled={!unlocked || !contentValid} onClick={addToProgram}><Plus size={18}/>{label('Add to program', 'הוספה לתוכנית')}</button><button className="btn-secondary sm:col-span-3" disabled={!unlocked || !contentValid} onClick={() => start(true)}>{label(`Run assessment · ${level.assessmentSeconds} sec`, `הפעלת מבחן · ${level.assessmentSeconds} שניות`)}</button></div>
  </div>;
}
