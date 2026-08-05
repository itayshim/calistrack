import { CalendarDays, Check, Dumbbell, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/ui';
import { compileManagedWorkout } from '../features/programs/managedProgram';
import { isManagedMilestoneComplete } from '../features/programs/managedProgression';
import { useI18n } from '../hooks/useI18n';
import { getManagedProgram } from '../services/managedPrograms';
import { useAppStore } from '../store/useAppStore';
import { createId } from '../utils/id';
import { getExerciseName } from '../utils/exerciseLocalization';

export function ManagedProgramPage() {
  const { programKey } = useParams();
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const record = getManagedProgram(programKey ?? '');
  const store = useAppStore();
  const nav = useNavigate();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  if (!record)
    return (
      <main className="card">
        <h1 className="text-2xl font-black">{l('Program unavailable', 'התוכנית אינה זמינה')}</h1>
      </main>
    );
  const d = record.definition;
  const exerciseByKey = new Map(store.exercises.map((exercise) => [exercise.stableKey, exercise]));
  const completedProgramSessions = store.workoutSessions.filter(
    (session) => session.status === 'completed' && session.managedProgramLink?.programKey === d.key && !session.managedProgramLink.preview,
  );
  const milestoneProgress = (d.milestones ?? []).map((milestone) => {
    const ids = new Set(milestone.exerciseKeys.map((key) => exerciseByKey.get(key)?.id).filter(Boolean));
    const sets = completedProgramSessions.flatMap((session) => session.exercises.filter((item) => ids.has(item.exerciseId)).flatMap((item) => item.skipped ? [] : item.sets));
    return { milestone, complete: isManagedMilestoneComplete(milestone, sets) };
  });
  const enrollment = store.managedProgramEnrollments.find(
    (x) => x.programKey === d.key && x.status === 'active',
  );
  const enroll = () => {
    if (enrollment) return;
    const item = {
      id: createId(),
      programKey: d.key,
      programVersion: d.version,
      startDate,
      currentWeekKey: d.weeks[0].key,
      completedWorkoutKeys: [],
      skippedWorkoutKeys: [],
      preferredWeekdays: [],
      status: 'active' as const,
      detached: false,
    };
    useAppStore.setState((s) => ({
      managedProgramEnrollments: [...s.managedProgramEnrollments, item],
    }));
    useAppStore.getState().persist();
  };
  const start = (weekKey: string, workoutKey: string) => {
    if (store.activeWorkout) {
      nav(`/workout/${store.activeWorkout.id}`);
      return;
    }
    const current =
      enrollment ??
      useAppStore
        .getState()
        .managedProgramEnrollments.find((x) => x.programKey === d.key && x.status === 'active');
    if (!current) return;
    const workout = compileManagedWorkout(
      d,
      weekKey,
      workoutKey,
      store.exercises,
      current.id,
      language,
    );
    if (store.startWorkout(workout)) nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const markSkipped = (weekKey: string, workoutKey: string) => {
    if (!enrollment) return;
    const completionKey = `${weekKey}:${workoutKey}`;
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) =>
      item.id === enrollment.id && !item.skippedWorkoutKeys.includes(completionKey)
        ? { ...item, skippedWorkoutKeys: [...item.skippedWorkoutKeys, completionKey] }
        : item) }));
    useAppStore.getState().persist();
  };
  const advanceExplicitly = () => {
    if (!enrollment) return;
    const index = d.weeks.findIndex((week) => week.key === enrollment.currentWeekKey);
    const next = d.weeks[index + 1];
    useAppStore.setState((state) => ({ managedProgramEnrollments: state.managedProgramEnrollments.map((item) =>
      item.id === enrollment.id ? { ...item, currentWeekKey: next?.key ?? item.currentWeekKey, status: next ? item.status : 'completed' as const } : item) }));
    useAppStore.getState().persist();
  };
  return (
    <main className="pb-8">
      <Badge tone="brand">
        {d.difficulty} · {d.durationWeeks} {l('weeks', 'שבועות')}
      </Badge>
      <h1 className="mt-3 text-4xl font-black">{language === 'he' ? d.nameHe : d.nameEn}</h1>
      <p className="mt-3 max-w-3xl text-slate-500">
        {language === 'he' ? d.descriptionHe : d.descriptionEn}
      </p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="badge">
          <CalendarDays size={16} />
          {d.sessionsPerWeek} {l('sessions/week', 'אימונים בשבוע')}
        </span>
        <span className="badge">
          <Dumbbell size={16} />
          {d.equipment.join(', ') || l('No special equipment', 'ללא ציוד מיוחד')}
        </span>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {d.phases.map((phase) => <article className="card" key={phase.key}>
          <p className="label">{l('Phase', 'שלב')} {phase.order + 1}</p>
          <h2 className="mt-1 text-xl font-black">{language === 'he' ? phase.nameHe : phase.nameEn}</h2>
          <p className="mt-2 text-sm text-slate-500">{language === 'he' ? phase.descriptionHe : phase.descriptionEn}</p>
        </article>)}
      </section>
      {d.progressionPhilosophyEn && <section className="card mt-5">
        <h2 className="text-xl font-black">{l('Performance-based progression', 'התקדמות לפי ביצועים')}</h2>
        <p className="mt-2 text-slate-500">{language === 'he' ? d.progressionPhilosophyHe : d.progressionPhilosophyEn}</p>
      </section>}
      {milestoneProgress.length > 0 && <section className="card mt-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">{l('Program milestones', 'אבני דרך בתוכנית')}</h2><Badge tone="brand">{milestoneProgress.filter((item) => item.complete).length}/{milestoneProgress.length}</Badge></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{milestoneProgress.map(({ milestone, complete }) => <div className="surface-subtle rounded-2xl p-3" key={milestone.key}>
          <strong>{language === 'he' ? milestone.nameHe : milestone.nameEn}</strong>
          <p className="mt-1 text-sm text-slate-500">{language === 'he' ? milestone.descriptionHe : milestone.descriptionEn}</p>
          <span className={`mt-2 inline-flex text-xs font-black ${complete ? 'text-emerald-500' : 'text-slate-500'}`}>{complete ? l('Completed', 'הושלם') : l('In progress', 'בתהליך')}</span>
        </div>)}</div>
      </section>}
      {!enrollment && (
        <section className="card mt-6">
          <h2 className="text-xl font-black">{l('Start Program', 'התחלת תוכנית')}</h2>
          <label className="field-label mt-3 block">
            {l('Start date', 'תאריך התחלה')}
            <input
              className="input mt-2"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <button className="btn-primary mt-4" onClick={enroll}>
            <Check size={18} />
            {l(
              'Enroll without replacing my personal Program',
              'הרשמה בלי להחליף את התוכנית האישית שלי',
            )}
          </button>
        </section>
      )}
      <section className="mt-7 grid gap-4">
        {d.weeks.map((week, index) => (
          <article className="card" key={week.key}>
            <div className="flex justify-between">
              <div>
                <span className="label">
                  {l('Week', 'שבוע')} {index + 1}
                </span>
                <h2 className="text-2xl font-black">
                  {language === 'he' ? week.nameHe : week.nameEn}
                </h2>
                {(language === 'he' ? week.goalHe : week.goalEn) && <p className="mt-1 max-w-2xl text-sm text-slate-500">{language === 'he' ? week.goalHe : week.goalEn}</p>}
              </div>
              {enrollment && week.key !== enrollment.currentWeekKey && (
                <Badge>{l('Preview', 'תצוגה')}</Badge>
              )}
            </div>
            {week.workouts.map((day) => (
              <div className="surface-subtle mt-4 rounded-2xl p-4" key={day.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong>{language === 'he' ? day.nameHe : day.nameEn}</strong>
                    <p className="text-sm text-slate-500">
                      {day.sections.reduce((n, s) => n + s.exercises.length, 0)}{' '}
                      {l('exercises', 'תרגילים')}
                    </p>
                  </div>
                  {enrollment && week.key === enrollment.currentWeekKey ? (
                    <div className="flex gap-2"><button
                      className="icon-button bg-brand text-ink"
                      aria-label={l('Start workout', 'התחלת אימון')}
                      onClick={() => start(week.key, day.key)}
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                    <button className="btn-secondary" onClick={() => markSkipped(week.key, day.key)}>{l('Skip', 'דילוג')}</button></div>
                  ) : null}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold">{l('View prescription', 'הצגת מרשם האימון')}</summary>
                  <div className="mt-3 grid gap-3">
                    {day.sections.map((section) => (
                      <section key={section.key} className="rounded-xl border border-slate-500/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{language === 'he' ? section.nameHe : section.nameEn}</strong>
                          {!section.requiredForSuccess && <Badge>{l('Optional', 'אופציונלי')}</Badge>}
                        </div>
                        {(language === 'he' ? section.guidanceHe : section.guidanceEn) && <p className="mt-1 text-sm text-slate-500">{language === 'he' ? section.guidanceHe : section.guidanceEn}</p>}
                        <ul className="mt-2 grid gap-2">
                          {section.exercises.map((item) => {
                            const exercise = exerciseByKey.get(item.exerciseKey);
                            const target = item.targetMin === item.targetMax ? item.targetMin : `${item.targetMin}–${item.targetMax}`;
                            return <li key={item.key} className="text-sm">
                              <span className="font-bold">{exercise ? getExerciseName(exercise, language) : item.exerciseKey}</span>
                              {' · '}{item.sets} × {target} {exercise?.measurementType === 'duration' ? l('sec', 'שניות') : l('reps', 'חזרות')}
                              {item.perSide ? ` ${l('per side', 'לכל צד')}` : ''} · {item.restSeconds} {l('sec rest', 'שניות מנוחה')}
                            </li>;
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </article>
        ))}
      </section>
      {enrollment && <button className="btn-secondary mt-6" onClick={advanceExplicitly}>
        {l('Advance to next week', 'מעבר מפורש לשבוע הבא')}
      </button>}
    </main>
  );
}
