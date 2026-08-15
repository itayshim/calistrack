import { CalendarDays, Check, CheckCircle2, Dumbbell, Eye, LockKeyhole, Play, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ManagedWorkoutPreviewDialog } from '../components/ManagedWorkoutPreviewDialog';
import { Badge } from '../components/ui';
import { compileManagedWorkout } from '../features/programs/managedProgram';
import {
  getManagedProgramProgress,
  managedEnrollmentChanged,
  managedWorkoutKey,
  type ManagedWorkoutProgressState,
} from '../features/programs/managedProgramProgress';
import { isManagedMilestoneComplete } from '../features/programs/managedProgression';
import { useI18n } from '../hooks/useI18n';
import { useManagedProgramRegistry } from '../hooks/useManagedProgramRegistry';
import { getManagedProgram, getResolvedManagedProgram, isManagedProgramRegistryReady } from '../services/managedPrograms';
import { useAppStore } from '../store/useAppStore';
import { createId } from '../utils/id';

export function ManagedProgramPage() {
  useManagedProgramRegistry();
  const { programKey } = useParams();
  const { language } = useI18n();
  const l = (en: string, he: string) => language === 'he' ? he : en;
  const store = useAppStore();
  const nav = useNavigate();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<{ weekKey: string; workoutKey: string }>();
  const enrollment = store.managedProgramEnrollments.find((item) => item.programKey === programKey && item.status === 'active')
    ?? store.managedProgramEnrollments.find((item) => item.programKey === programKey && item.status === 'completed');
  const publishedRecord = getManagedProgram(programKey ?? '');
  const record = publishedRecord ?? (enrollment ? getResolvedManagedProgram(programKey ?? '') : undefined);
  const publiclyAvailable = Boolean(publishedRecord);
  const definition = record?.definition;
  const progress = useMemo(
    () => definition && enrollment ? getManagedProgramProgress(definition, enrollment, store.workoutSessions) : undefined,
    [definition, enrollment, store.workoutSessions],
  );

  useEffect(() => {
    if (!enrollment || !progress || !managedEnrollmentChanged(enrollment, progress.enrollment)) return;
    useAppStore.setState((state) => ({
      managedProgramEnrollments: state.managedProgramEnrollments.map((item) => item.id === enrollment.id ? progress.enrollment : item),
    }));
    useAppStore.getState().persist();
  }, [enrollment, progress]);

  if (!isManagedProgramRegistryReady()) return <main className="card">{l('Loading Program…', 'טוען תוכנית…')}</main>;
  if (!record || !definition) return <main className="card"><h1 className="text-2xl font-black">{l('Program unavailable', 'התוכנית אינה זמינה')}</h1></main>;
  const d = definition;
  const exerciseByKey = new Map(store.exercises.map((exercise) => [exercise.stableKey, exercise]));
  const completedProgramSessions = store.workoutSessions.filter((session) => session.status === 'completed' && session.managedProgramLink?.programKey === d.key && session.managedProgramLink.version === d.version && !session.managedProgramLink.preview);
  const milestoneProgress = (d.milestones ?? []).map((milestone) => {
    const ids = new Set(milestone.exerciseKeys.map((key) => exerciseByKey.get(key)?.id).filter(Boolean));
    const sets = completedProgramSessions.flatMap((session) => session.exercises.filter((item) => ids.has(item.exerciseId)).flatMap((item) => item.skipped ? [] : item.sets));
    return { milestone, complete: isManagedMilestoneComplete(milestone, sets) };
  });
  const currentWeek = progress ? d.weeks.find((week) => week.key === progress.currentWeekKey) : d.weeks[0];
  const nextWorkout = currentWeek?.workouts.find((workout) => managedWorkoutKey(currentWeek.key, workout.key) === progress?.nextWorkoutKey);

  const enroll = () => {
    if (enrollment || !publiclyAvailable) return;
    const item = {
      id: createId(), programKey: d.key, programVersion: d.version, startDate,
      currentWeekKey: d.weeks[0].key, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [],
      preferredWeekdays: [], status: 'active' as const, detached: false,
    };
    useAppStore.setState((state) => ({ managedProgramEnrollments: [...state.managedProgramEnrollments, item] }));
    useAppStore.getState().persist();
  };
  const start = (weekKey: string, workoutKey: string) => {
    if (!publiclyAvailable || progress?.workoutStates[managedWorkoutKey(weekKey, workoutKey)] === 'locked') return;
    if (store.activeWorkout) { nav(`/workout/${store.activeWorkout.id}`); return; }
    const current = progress?.enrollment ?? enrollment;
    if (!current) return;
    const workout = compileManagedWorkout(d, weekKey, workoutKey, store.exercises, current.id, language);
    if (store.startWorkout(workout)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const setSkipped = (weekKey: string, workoutKey: string, skipped: boolean) => {
    if (!enrollment || !publiclyAvailable) return;
    const key = managedWorkoutKey(weekKey, workoutKey);
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) => {
      if (item.id !== enrollment.id || item.completedWorkoutKeys.includes(key)) return item;
      const updated = { ...item, skippedWorkoutKeys: skipped ? [...new Set([...item.skippedWorkoutKeys, key])] : item.skippedWorkoutKeys.filter((entry) => entry !== key) };
      return getManagedProgramProgress(d, updated, state.workoutSessions).enrollment;
    }) }));
    useAppStore.getState().persist();
  };
  const advanceExplicitly = () => {
    if (!progress || !enrollment || !publiclyAvailable) return;
    const index = d.weeks.findIndex((week) => week.key === progress.currentWeekKey);
    const week = d.weeks[index];
    const next = d.weeks[index + 1];
    if (!next || !progress.weekProgress[week.key].terminal || week.advancementPolicy === 'required_complete') return;
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) => item.id === enrollment.id ? { ...item, currentWeekKey: next.key } : item) }));
    useAppStore.getState().persist();
  };
  const previewWeek = preview ? d.weeks.find((week) => week.key === preview.weekKey) : undefined;
  const previewWorkout = previewWeek?.workouts.find((workout) => workout.key === preview?.workoutKey);

  return <main className="pb-8">
    <Badge tone="brand">{d.difficulty} · {d.durationWeeks} {l('weeks', 'שבועות')}</Badge>
    <h1 className="mt-3 text-4xl font-black">{language === 'he' ? d.nameHe : d.nameEn}</h1>
    <p className="mt-3 max-w-3xl text-slate-500">{language === 'he' ? d.descriptionHe : d.descriptionEn}</p>
    {!publiclyAvailable && enrollment && <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4" role="status"><strong>{l('This Program is no longer publicly available.', 'התוכנית אינה זמינה עוד לציבור.')}</strong><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{l('Your enrollment and history remain readable. New workouts and progression are paused.', 'ההרשמה וההיסטוריה נשמרות. אימונים חדשים והתקדמות מושהים.')}</p></section>}
    <div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="badge"><CalendarDays size={16} />{d.sessionsPerWeek} {l('sessions per stage', 'אימונים בכל שלב')}</span><span className="badge"><Dumbbell size={16} />{d.equipment.join(', ') || l('No special equipment', 'ללא ציוד מיוחד')}</span></div>
    <p className="mt-3 text-sm text-slate-500">{l('Each Week is a progression stage, not a calendar deadline. Complete the ordered sessions at your own pace and rest as needed.', 'כל שבוע הוא שלב התקדמות ולא מועד קלנדרי. השלימו את האימונים לפי הסדר ובקצב שלכם, ונוחו לפי הצורך.')}</p>

    {!enrollment && publiclyAvailable && <section className="card mt-6"><h2 className="text-xl font-black">{l('Start Program', 'התחלת תוכנית')}</h2><label className="label mt-3 block">{l('Start date', 'תאריך התחלה')}<input className="field mt-2" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><button className="btn-primary mt-4" onClick={enroll}><Check size={18} />{l('Enroll without replacing my personal Program', 'הרשמה בלי להחליף את התוכנית האישית שלי')}</button></section>}

    {progress && currentWeek && <section className="card mt-6 border-brand/40" data-testid="current-week-summary">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{l('Current stage', 'השלב הנוכחי')}</p><h2 className="mt-1 text-3xl font-black">{l('Week', 'שבוע')} {d.weeks.findIndex((week) => week.key === currentWeek.key) + 1}</h2><p className="mt-2 font-bold"><bdi>{progress.weekProgress[currentWeek.key].completedRequiredCount}</bdi> {l(`of ${progress.weekProgress[currentWeek.key].requiredCount} required workouts completed`, `מתוך ${progress.weekProgress[currentWeek.key].requiredCount} אימוני חובה הושלמו`)}</p>{progress.weekProgress[currentWeek.key].skippedRequiredCount > 0 && <p className="mt-1 text-sm text-amber-600 dark:text-amber-300"><bdi>{progress.weekProgress[currentWeek.key].skippedRequiredCount}</bdi> {l('required workout skipped', 'אימון חובה דולג')}</p>}</div><Badge tone="brand"><bdi>{progress.overall.percent}%</bdi></Badge></div>
      <p className="mt-4 text-sm text-slate-500">{l('Follow the session order when practical. There is no one-session-per-day restriction; use the prescribed rest guidance and recover as needed.', 'מומלץ לפעול לפי סדר האימונים. אין מגבלה של אימון אחד ביום; פעלו לפי הנחיות המנוחה והתאוששו לפי הצורך.')}</p>
      {nextWorkout ? <div className="surface-subtle mt-4 rounded-2xl p-4"><span className="label">{l('Next workout', 'האימון הבא')}</span><strong className="block text-lg" dir="auto">{language === 'he' ? nextWorkout.nameHe : nextWorkout.nameEn}</strong><div className="mt-3 flex flex-wrap gap-2">{publiclyAvailable && <button className="btn-primary" onClick={() => start(currentWeek.key, nextWorkout.key)}><Play size={18} fill="currentColor" />{l('Start workout', 'התחלת אימון')}</button>}<button className="btn-secondary" onClick={() => setPreview({ weekKey: currentWeek.key, workoutKey: nextWorkout.key })}><Eye size={18} />{l('Preview', 'תצוגה')}</button></div></div> : <p className="mt-4 font-bold text-emerald-600">{l('All required sessions in this stage are resolved.', 'כל אימוני החובה בשלב זה טופלו.')}</p>}
    </section>}

    <section className="mt-7 grid gap-4">{d.weeks.map((week, weekIndex) => {
      const weekState = progress?.weekProgress[week.key];
      const unlocked = !progress || weekState?.unlocked;
      return <article className={`card ${week.key === progress?.currentWeekKey ? 'border-brand/40' : ''}`} key={week.key}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="label">{l('Week', 'שבוע')} {weekIndex + 1}</span><h2 className="text-2xl font-black" dir="auto">{language === 'he' ? week.nameHe : week.nameEn}</h2>{(language === 'he' ? week.goalHe : week.goalEn) && <p className="mt-1 max-w-2xl text-sm text-slate-500">{language === 'he' ? week.goalHe : week.goalEn}</p>}</div>{progress && <Badge tone={unlocked ? 'brand' : 'neutral'}>{unlocked ? week.key === progress.currentWeekKey ? l('Current', 'נוכחי') : l('Available', 'זמין') : l('Locked', 'נעול')}</Badge>}</div>
        {weekState && !unlocked && weekState.lockReason && <div className="mt-4 flex gap-3 rounded-2xl bg-slate-100 p-4 dark:bg-white/[.05]"><LockKeyhole className="shrink-0 text-slate-500" aria-hidden /><p className="text-sm">{weekState.lockReason.policy === 'required_complete' ? weekState.lockReason.remainingRequiredCount > 0 ? l(`Complete or explicitly skip the remaining ${weekState.lockReason.remainingRequiredCount} required workout${weekState.lockReason.remainingRequiredCount === 1 ? '' : 's'} in Week ${weekIndex} to unlock.`, `יש להשלים או לדלג במפורש על ${weekState.lockReason.remainingRequiredCount} אימוני החובה שנותרו בשבוע ${weekIndex} כדי לפתוח.`) : l('The previous stage is being reconciled.', 'השלב הקודם מתעדכן.') : l('Finish the previous stage, then advance explicitly according to its progression rule.', 'יש לסיים את השלב הקודם ואז להתקדם במפורש לפי כלל ההתקדמות שלו.')}</p></div>}
        <p className="mt-4 text-sm text-slate-500">{l(`Complete these ${week.workouts.filter((workout) => workout.required !== false).length} required sessions at your own pace. Rest as needed between sessions.`, `השלימו ${week.workouts.filter((workout) => workout.required !== false).length} אימוני חובה בקצב שלכם. נוחו לפי הצורך בין האימונים.`)}</p>
        <div className="mt-4 grid gap-3">{week.workouts.map((workout) => {
          const key = managedWorkoutKey(week.key, workout.key);
          const state = progress?.workoutStates[key] ?? 'available';
          const lastSession = completedProgramSessions.find((session) => session.managedProgramLink?.weekKey === week.key && session.managedProgramLink.workoutKey === workout.key);
          return <WorkoutRow key={workout.key} state={state} name={language === 'he' ? workout.nameHe : workout.nameEn} exerciseCount={workout.sections.reduce((count, section) => count + section.exercises.length, 0)} required={workout.required !== false} completedAt={lastSession?.completedAt} language={language} onPreview={() => setPreview({ weekKey: week.key, workoutKey: workout.key })} onStart={() => start(week.key, workout.key)} onSkip={() => setSkipped(week.key, workout.key, true)} onRestore={() => setSkipped(week.key, workout.key, false)} canMutate={Boolean(enrollment && publiclyAvailable)} />;
        })}</div>
        {progress && week.key === progress.currentWeekKey && week.advancementPolicy !== 'required_complete' && weekState?.terminal && d.weeks[weekIndex + 1] && <button className="btn-secondary mt-4" onClick={advanceExplicitly}>{l('Advance to next stage', 'מעבר לשלב הבא')}</button>}
      </article>;
    })}</section>

    {d.phases.length > 0 && <section className="mt-7 grid gap-4 md:grid-cols-3">{d.phases.map((phase) => <article className="card" key={phase.key}><p className="label">{l('Phase', 'שלב')} {phase.order + 1}</p><h2 className="mt-1 text-xl font-black">{language === 'he' ? phase.nameHe : phase.nameEn}</h2><p className="mt-2 text-sm text-slate-500">{language === 'he' ? phase.descriptionHe : phase.descriptionEn}</p></article>)}</section>}
    {milestoneProgress.length > 0 && <section className="card mt-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{l('Program milestones', 'אבני דרך בתוכנית')}</h2><Badge tone="brand">{milestoneProgress.filter((item) => item.complete).length}/{milestoneProgress.length}</Badge></div></section>}
    {previewWeek && previewWorkout && <ManagedWorkoutPreviewDialog week={previewWeek} workout={previewWorkout} exercises={store.exercises} language={language} onClose={() => setPreview(undefined)} />}
  </main>;
}

function WorkoutRow({ state, name, exerciseCount, required, completedAt, language, onPreview, onStart, onSkip, onRestore, canMutate }: {
  state: ManagedWorkoutProgressState; name: string; exerciseCount: number; required: boolean; completedAt?: string; language: 'en' | 'he'; onPreview: () => void; onStart: () => void; onSkip: () => void; onRestore: () => void; canMutate: boolean;
}) {
  const l = (en: string, he: string) => language === 'he' ? he : en;
  const status = state === 'up_next' ? l('Up next', 'הבא בתור') : state === 'available' ? l('Available', 'זמין') : state === 'completed' ? l('Completed', 'הושלם') : state === 'skipped' ? l('Skipped', 'דולג') : l('Locked', 'נעול');
  return <div className={`surface-subtle rounded-2xl p-4 ${state === 'up_next' ? 'ring-2 ring-brand/60' : ''}`} data-workout-state={state}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong dir="auto">{name}</strong><Badge tone={state === 'completed' ? 'blue' : state === 'up_next' ? 'brand' : 'neutral'}>{status}</Badge>{!required && <Badge>{l('Optional', 'רשות')}</Badge>}</div><p className="mt-1 text-sm text-slate-500"><bdi>{exerciseCount}</bdi> {l('exercises', 'תרגילים')}{completedAt ? ` · ${new Date(completedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}` : ''}</p></div>{state === 'completed' && <CheckCircle2 className="text-emerald-500" aria-hidden />}</div>
    <div className="mt-3 flex flex-wrap gap-2"><button className="btn-secondary min-h-11 px-4" onClick={onPreview}><Eye size={17} />{l('Preview', 'תצוגה')}</button>{canMutate && (state === 'up_next' || state === 'available') && <><button className="btn-primary min-h-11 px-4" onClick={onStart}><Play size={17} fill="currentColor" />{l('Play', 'התחלה')}</button><button className="btn-secondary min-h-11 px-4" onClick={onSkip}><SkipForward size={17} />{l('Skip', 'דילוג')}</button></>}{canMutate && state === 'skipped' && <button className="btn-secondary min-h-11 px-4" onClick={onRestore}>{l('Make available again', 'החזרה לזמין')}</button>}</div>
  </div>;
}
