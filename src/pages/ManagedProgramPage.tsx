import { CalendarDays, Check, CheckCircle2, Dumbbell, Eye, LockKeyhole, Play, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ManagedWorkoutPreviewDialog } from '../components/ManagedWorkoutPreviewDialog';
import { Badge } from '../components/ui';
import { compileManagedWorkout } from '../features/programs/managedProgram';
import {
  getManagedProgramProgress,
  advanceManagedProgramStage,
  managedEnrollmentChanged,
  managedWorkoutKey,
  repeatManagedProgramStage,
  type ManagedStageReadiness,
  type ManagedWorkoutPerformanceState,
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
    const id = createId();
    const attemptId = createId();
    const item = {
      id, programKey: d.key, programVersion: d.version, startDate,
      currentWeekKey: d.weeks[0].key, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [],
      assessedWorkoutKeys: [], preferredWeekdays: [], status: 'active' as const, detached: false,
      currentStageAttemptId: attemptId,
      stageAttempts: [{ id: attemptId, weekKey: d.weeks[0].key, attemptNumber: 1, startedAt: new Date().toISOString(), completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], assessedWorkoutKeys: [] }],
    };
    useAppStore.setState((state) => ({ managedProgramEnrollments: [...state.managedProgramEnrollments, item] }));
    useAppStore.getState().persist();
  };
  const start = (weekKey: string, workoutKey: string) => {
    if (!publiclyAvailable || progress?.workoutStates[managedWorkoutKey(weekKey, workoutKey)] === 'locked') return;
    if (store.activeWorkout) { nav(`/workout/${store.activeWorkout.id}`); return; }
    const current = progress?.enrollment ?? enrollment;
    if (!current) return;
    const workout = compileManagedWorkout(d, weekKey, workoutKey, store.exercises, current.id, language, current.currentStageAttemptId);
    if (store.startWorkout(workout)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const setSkipped = (weekKey: string, workoutKey: string, skipped: boolean) => {
    if (!enrollment || !publiclyAvailable) return;
    const key = managedWorkoutKey(weekKey, workoutKey);
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) => {
      if (item.id !== enrollment.id || item.completedWorkoutKeys.includes(key)) return item;
      const skippedWorkoutKeys = skipped ? [...new Set([...item.skippedWorkoutKeys, key])] : item.skippedWorkoutKeys.filter((entry) => entry !== key);
      const stageAttempts = item.stageAttempts?.map((attempt) => attempt.id !== item.currentStageAttemptId ? attempt : ({ ...attempt, skippedWorkoutKeys: skipped ? [...new Set([...attempt.skippedWorkoutKeys, key])] : attempt.skippedWorkoutKeys.filter((entry) => entry !== key) }));
      const updated = { ...item, skippedWorkoutKeys, stageAttempts };
      return getManagedProgramProgress(d, updated, state.workoutSessions).enrollment;
    }) }));
    useAppStore.getState().persist();
  };
  const decideStage = (decision: 'repeat' | 'advance') => {
    if (!progress || !enrollment || !publiclyAvailable || !progress.weekProgress[progress.currentWeekKey].terminal) return;
    const now = new Date().toISOString();
    const updated = decision === 'repeat'
      ? repeatManagedProgramStage(enrollment, progress, now, createId())
      : advanceManagedProgramStage(progress, now, createId());
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) => item.id === enrollment.id ? updated : item) }));
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
      {progress.weekProgress[currentWeek.key].terminal
        ? <StageDecision language={language} weekNumber={d.weeks.findIndex((week) => week.key === currentWeek.key) + 1} isFinal={!progress.nextStageKey} readiness={progress.weekProgress[currentWeek.key].readiness!} workouts={currentWeek.workouts.filter((workout) => workout.required !== false).map((workout) => ({ name: language === 'he' ? workout.nameHe : workout.nameEn, status: progress.workoutPerformance[managedWorkoutKey(currentWeek.key, workout.key)] }))} canMutate={publiclyAvailable} onRepeat={() => decideStage('repeat')} onAdvance={() => decideStage('advance')} />
        : nextWorkout ? <div className="surface-subtle mt-4 rounded-2xl p-4"><span className="label">{l('Next workout', 'האימון הבא')}</span><strong className="block text-lg" dir="auto">{language === 'he' ? nextWorkout.nameHe : nextWorkout.nameEn}</strong><div className="mt-3 flex flex-wrap gap-2">{publiclyAvailable && <button className="btn-primary" onClick={() => start(currentWeek.key, nextWorkout.key)}><Play size={18} fill="currentColor" />{l('Start workout', 'התחלת אימון')}</button>}<button className="btn-secondary" onClick={() => setPreview({ weekKey: currentWeek.key, workoutKey: nextWorkout.key })}><Eye size={18} />{l('Preview', 'תצוגה')}</button></div></div> : null}
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
          const displayedAttempt = progress?.enrollment.stageAttempts?.filter((attempt) => attempt.weekKey === week.key).sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
          const lastSession = completedProgramSessions.find((session) => session.managedProgramLink?.weekKey === week.key && session.managedProgramLink.workoutKey === workout.key && (session.managedProgramLink.stageAttemptId ? session.managedProgramLink.stageAttemptId === displayedAttempt?.id : !displayedAttempt || displayedAttempt.attemptNumber === 1));
          return <WorkoutRow key={workout.key} state={state} name={language === 'he' ? workout.nameHe : workout.nameEn} exerciseCount={workout.sections.reduce((count, section) => count + section.exercises.length, 0)} required={workout.required !== false} completedAt={lastSession?.completedAt} language={language} onPreview={() => setPreview({ weekKey: week.key, workoutKey: workout.key })} onStart={() => start(week.key, workout.key)} onSkip={() => setSkipped(week.key, workout.key, true)} onRestore={() => setSkipped(week.key, workout.key, false)} canMutate={Boolean(enrollment && publiclyAvailable)} />;
        })}</div>
      </article>;
    })}</section>

    {progress && (progress.enrollment.stageAttempts ?? []).some((attempt) => attempt.decision) && <section className="card mt-7"><h2 className="text-xl font-black">{l('Stage history', 'היסטוריית שלבים')}</h2><div className="mt-3 grid gap-3">{(progress.enrollment.stageAttempts ?? []).filter((attempt) => attempt.decision).map((attempt) => {
      const index = d.weeks.findIndex((week) => week.key === attempt.weekKey);
      const recommendation = attempt.recommendation === 'advance' ? l('Ready to advance', 'מוכנים להתקדם') : attempt.recommendation === 'repeat' ? l('Repeat recommended', 'מומלץ לחזור') : attempt.recommendation === 'review' ? l('Review recommended', 'מומלץ לבדוק') : l('Assessment unavailable', 'אין נתונים להערכה');
      return <div key={attempt.id} className="surface-subtle rounded-xl p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{l(`Week ${index + 1} · Attempt ${attempt.attemptNumber}`, `שבוע ${index + 1} · ניסיון ${attempt.attemptNumber}`)}</strong><Badge>{attempt.decision === 'repeated' ? l('Repeated', 'בוצעה חזרה') : attempt.decision === 'program_finished' ? l('Program finished', 'התוכנית הסתיימה') : l('Advanced', 'בוצעה התקדמות')}</Badge></div>{attempt.completedAt && <p className="mt-1 text-sm text-slate-500"><bdi>{new Date(attempt.completedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</bdi>{attempt.recommendation ? ` · ${l('Recommendation', 'המלצה')}: ${recommendation}` : ''}</p>}</div>;
    })}</div></section>}

    {d.phases.length > 0 && <section className="mt-7 grid gap-4 md:grid-cols-3">{d.phases.map((phase) => <article className="card" key={phase.key}><p className="label">{l('Phase', 'שלב')} {phase.order + 1}</p><h2 className="mt-1 text-xl font-black">{language === 'he' ? phase.nameHe : phase.nameEn}</h2><p className="mt-2 text-sm text-slate-500">{language === 'he' ? phase.descriptionHe : phase.descriptionEn}</p></article>)}</section>}
    {milestoneProgress.length > 0 && <section className="card mt-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{l('Program milestones', 'אבני דרך בתוכנית')}</h2><Badge tone="brand">{milestoneProgress.filter((item) => item.complete).length}/{milestoneProgress.length}</Badge></div></section>}
    {previewWeek && previewWorkout && <ManagedWorkoutPreviewDialog week={previewWeek} workout={previewWorkout} exercises={store.exercises} language={language} onClose={() => setPreview(undefined)} />}
  </main>;
}

function StageDecision({ language, weekNumber, isFinal, readiness, workouts, canMutate, onRepeat, onAdvance }: {
  language: 'en' | 'he'; weekNumber: number; isFinal: boolean; readiness: ManagedStageReadiness;
  workouts: { name: string; status: ManagedWorkoutPerformanceState }[]; canMutate: boolean; onRepeat: () => void; onAdvance: () => void;
}) {
  const l = (en: string, he: string) => language === 'he' ? he : en;
  const heading = readiness.recommendation === 'advance' ? l('Ready for the next stage', 'מוכנים לשלב הבא')
    : readiness.recommendation === 'repeat' ? l('Repeating this stage may be useful', 'ייתכן שכדאי לחזור על השלב')
      : readiness.recommendation === 'unknown' ? l('Stage complete — assessment unavailable', 'השלב הושלם — אין מספיק נתונים להערכה')
        : l('Review before progressing', 'כדאי לבדוק לפני שמתקדמים');
  const reason = readiness.reason === 'all_met'
    ? l(`You met the target in all ${readiness.metCount} assessed sessions.`, `עמדתם ביעד בכל ${readiness.metCount} האימונים שנבדקו.`)
    : readiness.reason === 'mostly_met'
      ? l(`You met ${readiness.metCount} targets; ${readiness.partialCount} session was below target${readiness.skippedCount ? ` and ${readiness.skippedCount} was skipped` : ''}.`, `עמדתם ב־${readiness.metCount} יעדים; ${readiness.partialCount} אימון היה מתחת ליעד${readiness.skippedCount ? ` ו־${readiness.skippedCount} דולג` : ''}.`)
      : readiness.reason === 'multiple_partial'
        ? l(`${readiness.partialCount} completed sessions were below the prescribed target range.`, `${readiness.partialCount} אימונים שהושלמו היו מתחת לטווח היעד שנקבע.`)
        : readiness.reason === 'mostly_skipped'
          ? l(`${readiness.skippedCount} required sessions were skipped, so there is not enough performance evidence for a confident recommendation.`, `${readiness.skippedCount} אימוני חובה דולגו, ולכן אין מספיק נתוני ביצוע להמלצה בטוחה.`)
          : readiness.reason === 'replacement_limited'
            ? l('A replacement materially changed the prescription, so compare the result before progressing.', 'תחליף שינה באופן מהותי את המרשם, ולכן כדאי לבדוק את התוצאה לפני ההתקדמות.')
            : l(`${readiness.unknownCount} completed session${readiness.unknownCount === 1 ? '' : 's'} lack comparable performance data.`, `ל־${readiness.unknownCount} אימונים שהושלמו חסרים נתוני ביצוע בני השוואה.`);
  const statusLabel = (status: ManagedWorkoutPerformanceState) => status === 'met' ? l('Target met', 'היעד הושג') : status === 'partial' ? l('Completed below target', 'הושלם מתחת ליעד') : status === 'skipped' ? l('Skipped', 'דולג') : l('Assessment unavailable', 'אין נתונים להערכה');
  const primaryAdvance = readiness.recommendation === 'advance';
  return <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/5 p-4" data-testid="stage-decision">
    <p className="eyebrow">{isFinal ? l('Program complete', 'התוכנית הושלמה') : l(`Week ${weekNumber} complete`, `שבוע ${weekNumber} הושלם`)}</p>
    <h3 className="mt-1 text-xl font-black">{heading}</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{reason}</p>
    <details className="mt-3"><summary className="cursor-pointer font-bold">{l('View performance', 'הצגת ביצועים')}</summary><div className="mt-2 grid gap-2">{workouts.map((workout) => <div key={workout.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 p-3 text-sm dark:bg-black/15"><span dir="auto">{workout.name}</span><strong>{statusLabel(workout.status)}</strong></div>)}</div></details>
    {canMutate && <div className="mt-4 flex flex-wrap gap-2">{primaryAdvance
      ? <><button className="btn-primary" onClick={onAdvance}>{isFinal ? l('Finish Program', 'סיום התוכנית') : l(`Continue to Week ${weekNumber + 1}`, `המשך לשבוע ${weekNumber + 1}`)}</button><button className="btn-secondary" onClick={onRepeat}>{l('Repeat week', 'חזרה על השבוע')}</button></>
      : <><button className="btn-primary" onClick={onRepeat}>{readiness.recommendation === 'repeat' ? l(`Repeat Week ${weekNumber}`, `חזרה על שבוע ${weekNumber}`) : l('Review options / repeat', 'בדיקת אפשרויות או חזרה')}</button><button className="btn-secondary" onClick={onAdvance}>{isFinal ? l('Finish anyway', 'סיום בכל זאת') : l('Continue anyway', 'המשך בכל זאת')}</button></>}</div>}
  </div>;
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
