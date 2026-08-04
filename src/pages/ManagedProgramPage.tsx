import { CalendarDays, Check, Dumbbell, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/ui';
import { compileManagedWorkout } from '../features/programs/managedProgram';
import { useI18n } from '../hooks/useI18n';
import { getManagedProgram } from '../services/managedPrograms';
import { useAppStore } from '../store/useAppStore';
import { createId } from '../utils/id';

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
                    <button
                      className="icon-button bg-brand text-ink"
                      aria-label={l('Start workout', 'התחלת אימון')}
                      onClick={() => start(week.key, day.key)}
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
