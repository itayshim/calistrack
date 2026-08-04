import { ArrowDown, ArrowUp, Copy, Eye, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Select } from '../../components/SelectMenu';
import { useI18n } from '../../hooks/useI18n';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useAppStore } from '../../store/useAppStore';
import {
  compileManagedWorkout,
  exportManagedProgram,
  importManagedProgram,
  validateManagedProgram,
  type ManagedProgramDefinition,
  type ManagedProgramSectionKind,
} from '../../features/programs/managedProgram';
import {
  loadAdminManagedPrograms,
  publishManagedProgram,
  saveManagedProgramDraft,
  setManagedProgramLifecycle,
  type ManagedProgramRecord,
} from '../../services/managedPrograms';

const keyify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[ _]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
const blank = (): ManagedProgramDefinition => ({
  schemaVersion: 1,
  key: '',
  version: 1,
  nameEn: '',
  nameHe: '',
  shortDescriptionEn: '',
  shortDescriptionHe: '',
  descriptionEn: '',
  descriptionHe: '',
  difficulty: 'beginner',
  goals: ['strength'],
  durationWeeks: 1,
  sessionsPerWeek: 1,
  estimatedMinutesMin: 30,
  estimatedMinutesMax: 60,
  equipment: [],
  tags: [],
  targetAudienceEn: '',
  targetAudienceHe: '',
  featured: false,
  sortOrder: 0,
  phases: [],
  weeks: [
    {
      key: 'week-1',
      nameEn: 'Week 1',
      nameHe: 'שבוע 1',
      order: 0,
      advancementPolicy: 'required_complete',
      workouts: [],
    },
  ],
});
const sectionKinds: ManagedProgramSectionKind[] = [
  'warm_up',
  'main_work',
  'accessory',
  'skill_practice',
  'conditioning',
  'cool_down',
  'custom',
];

export function AdminProgramBuilderListPage() {
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const [rows, setRows] = useState<ManagedProgramRecord[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    void loadAdminManagedPrograms()
      .then(setRows)
      .catch(() => setError(true));
  }, []);
  return (
    <main className="mx-auto max-w-5xl pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{l('Administrator', 'ניהול')}</p>
          <h1 className="text-4xl font-black">{l('Program Builder', 'בונה תוכניות')}</h1>
          <p className="mt-2 text-slate-500">
            {l(
              'Versioned multi-week training products—not Skills or personal Programs.',
              'מוצרי אימון רב־שבועיים עם גרסאות — לא מיומנויות ולא תוכניות אישיות.',
            )}
          </p>
        </div>
        <Link className="btn-primary" to="/admin/programs/new">
          <Plus size={18} />
          {l('New Program', 'תוכנית חדשה')}
        </Link>
      </div>
      {error && (
        <p className="card mt-5">
          {l('Managed Programs could not be loaded.', 'לא ניתן לטעון תוכניות מנוהלות.')}
        </p>
      )}
      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="label">
                  {row.status} · v{row.publishedVersion ?? row.draftVersion}
                </span>
                <h2 className="text-xl font-black">
                  {language === 'he' ? row.definition.nameHe : row.definition.nameEn}
                </h2>
                <code>{row.stableKey}</code> · {row.definition.weeks.length} {l('weeks', 'שבועות')}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/edit`}>
                  {l('Edit', 'עריכה')}
                </Link>
                <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/preview`}>
                  <Eye size={17} />
                  {l('Preview', 'תצוגה')}
                </Link>
                <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/versions`}>
                  {l('Versions', 'גרסאות')}
                </Link>
                {row.status === 'published' && (
                  <button
                    className="btn-secondary"
                    onClick={() => void setManagedProgramLifecycle(row.id, 'unpublished')}
                  >
                    {l('Unpublish', 'ביטול פרסום')}
                  </button>
                )}
                <button
                  className="btn-secondary text-red-500"
                  onClick={() => void setManagedProgramLifecycle(row.id, 'archived')}
                >
                  {l('Archive', 'העברה לארכיון')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export function AdminProgramEditorPage() {
  const { programKey } = useParams();
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const exercises = useAppStore((s) => s.exercises);
  const [definition, setDefinition] = useState(blank);
  const [record, setRecord] = useState<ManagedProgramRecord>();
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState('week-1');
  const nav = useNavigate();
  useEffect(() => {
    if (!programKey) return;
    void loadAdminManagedPrograms().then((rows) => {
      const found = rows.find((x) => x.stableKey === programKey);
      if (found) {
        setRecord(found);
        setDefinition(found.definition);
      }
    });
  }, [programKey]);
  const validation = useMemo(
    () => validateManagedProgram(definition, exercises),
    [definition, exercises],
  );
  const guard = useUnsavedChangesGuard(dirty);
  const mutate = (fn: (d: ManagedProgramDefinition) => void) => {
    setDefinition((current) => {
      const next = structuredClone(current);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    const id = await saveManagedProgramDraft({
      id: record?.id,
      stableKey: definition.key,
      definition,
      validation,
    });
    setDirty(false);
    useAppStore.getState().setToast(l('Draft saved', 'הטיוטה נשמרה'));
    if (!record) nav(`/admin/programs/${definition.key}/edit`, { replace: true });
    return id;
  };
  const exerciseOptions = exercises
    .filter((e) => e.stableKey)
    .map((e) => ({
      value: e.stableKey!,
      label: language === 'he' ? e.nameHe : e.nameEn,
      description: `${e.stableKey} · ${e.measurementType}`,
    }));
  return (
    <main className="mx-auto max-w-5xl pb-28">
      <p className="eyebrow">{l('Managed Program', 'תוכנית מנוהלת')}</p>
      <h1 className="text-4xl font-black">
        {programKey ? l('Edit Program', 'עריכת תוכנית') : l('New Program', 'תוכנית חדשה')}
      </h1>
      <section className="card mt-6 grid gap-4 md:grid-cols-2">
        {(
          [
            'key',
            'nameEn',
            'nameHe',
            'shortDescriptionEn',
            'shortDescriptionHe',
            'targetAudienceEn',
            'targetAudienceHe',
          ] as const
        ).map((field) => (
          <label className="field-label" key={field}>
            {field}
            <input
              className="input mt-2"
              dir={field.endsWith('He') ? 'rtl' : 'ltr'}
              value={definition[field]}
              disabled={field === 'key' && Boolean(record?.publishedVersion)}
              onChange={(e) =>
                mutate((d) => {
                  if (field === 'key') d.key = keyify(e.target.value);
                  else d[field] = e.target.value;
                })
              }
            />
          </label>
        ))}
        <label className="field-label">
          {l('Difficulty', 'רמה')}
          <select
            className="input mt-2"
            value={definition.difficulty}
            onChange={(e) =>
              mutate((d) => {
                d.difficulty = e.target.value as ManagedProgramDefinition['difficulty'];
              })
            }
          >
            <option>beginner</option>
            <option>intermediate</option>
            <option>advanced</option>
            <option>mixed</option>
          </select>
        </label>
        <label className="field-label">
          {l('Duration (weeks)', 'משך (שבועות)')}
          <input
            className="input mt-2"
            type="number"
            min="1"
            value={definition.durationWeeks}
            onChange={(e) =>
              mutate((d) => {
                d.durationWeeks = Number(e.target.value);
              })
            }
          />
        </label>
      </section>
      <section className="mt-7">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="text-2xl font-black">{l('Program structure', 'מבנה התוכנית')}</h2>
          <button
            className="btn-secondary"
            onClick={() =>
              mutate((d) => {
                const n = d.weeks.length + 1;
                d.weeks.push({
                  key: `week-${n}`,
                  nameEn: `Week ${n}`,
                  nameHe: `שבוע ${n}`,
                  order: n - 1,
                  advancementPolicy: 'required_complete',
                  workouts: [],
                });
                d.durationWeeks = d.weeks.length;
                setExpanded(`week-${n}`);
              })
            }
          >
            <Plus size={17} />
            {l('Add week', 'הוספת שבוע')}
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {definition.weeks.map((week, wi) => (
            <article className="card" key={week.key}>
              <button
                className="flex w-full justify-between text-start"
                onClick={() => setExpanded(expanded === week.key ? '' : week.key)}
              >
                <span>
                  <span className="label">
                    {l('Week', 'שבוע')} {wi + 1}
                  </span>
                  <strong className="block text-xl">
                    {language === 'he' ? week.nameHe : week.nameEn}
                  </strong>
                </span>
                <span>
                  {week.workouts.length} {l('workouts', 'אימונים')}
                </span>
              </button>
              {expanded === week.key && (
                <div className="mt-5 grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        mutate((d) => {
                          const source = structuredClone(d.weeks[wi]);
                          source.key = `week-${d.weeks.length + 1}`;
                          source.nameEn += ` — Copy`;
                          source.nameHe += ` — עותק`;
                          source.order = d.weeks.length;
                          d.weeks.splice(wi + 1, 0, source);
                          d.weeks.forEach((x, i) => (x.order = i));
                          d.durationWeeks = d.weeks.length;
                        })
                      }
                    >
                      <Copy size={16} />
                      {l('Duplicate week', 'שכפול שבוע')}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={!wi}
                      onClick={() =>
                        mutate((d) => {
                          [d.weeks[wi - 1], d.weeks[wi]] = [d.weeks[wi], d.weeks[wi - 1]];
                          d.weeks.forEach((x, i) => (x.order = i));
                        })
                      }
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={wi === definition.weeks.length - 1}
                      onClick={() =>
                        mutate((d) => {
                          [d.weeks[wi + 1], d.weeks[wi]] = [d.weeks[wi], d.weeks[wi + 1]];
                          d.weeks.forEach((x, i) => (x.order = i));
                        })
                      }
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        mutate((d) => {
                          const n = d.weeks[wi].workouts.length + 1;
                          d.weeks[wi].workouts.push({
                            key: `workout-${n}`,
                            nameEn: `Workout ${n}`,
                            nameHe: `אימון ${n}`,
                            order: n - 1,
                            flexible: true,
                            repeatable: false,
                            sections: [],
                          });
                        })
                      }
                    >
                      <Plus size={16} />
                      {l('Workout day', 'יום אימון')}
                    </button>
                  </div>
                  {week.workouts.map((workout, di) => (
                    <div className="surface-subtle rounded-2xl p-4" key={workout.key}>
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{language === 'he' ? workout.nameHe : workout.nameEn}</strong>
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            mutate((d) => {
                              const n = d.weeks[wi].workouts[di].sections.length + 1;
                              d.weeks[wi].workouts[di].sections.push({
                                key: `section-${n}`,
                                nameEn: 'Main work',
                                nameHe: 'עבודה עיקרית',
                                order: n - 1,
                                kind: 'main_work',
                                contributesToHistory: true,
                                requiredForSuccess: true,
                                exercises: [],
                              });
                            })
                          }
                        >
                          <Plus size={16} />
                          {l('Section', 'מקטע')}
                        </button>
                      </div>
                      {workout.sections.map((section, si) => (
                        <div
                          className="mt-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10"
                          key={section.key}
                        >
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input
                              className="input"
                              value={section.nameEn}
                              onChange={(e) =>
                                mutate((d) => {
                                  d.weeks[wi].workouts[di].sections[si].nameEn = e.target.value;
                                })
                              }
                            />
                            <input
                              className="input"
                              dir="rtl"
                              value={section.nameHe}
                              onChange={(e) =>
                                mutate((d) => {
                                  d.weeks[wi].workouts[di].sections[si].nameHe = e.target.value;
                                })
                              }
                            />
                            <select
                              className="input"
                              value={section.kind}
                              onChange={(e) =>
                                mutate((d) => {
                                  d.weeks[wi].workouts[di].sections[si].kind = e.target
                                    .value as ManagedProgramSectionKind;
                                })
                              }
                            >
                              {sectionKinds.map((k) => (
                                <option key={k}>{k}</option>
                              ))}
                            </select>
                          </div>
                          {section.exercises.map((item, ei) => (
                            <div className="mt-3 grid gap-2 md:grid-cols-6" key={item.key}>
                              <Select
                                className="md:col-span-2"
                                label={l('Canonical exercise', 'תרגיל קנוני')}
                                value={item.exerciseKey}
                                options={exerciseOptions}
                                searchable
                                onChange={(value: string) =>
                                  mutate((d) => {
                                    d.weeks[wi].workouts[di].sections[si].exercises[
                                      ei
                                    ].exerciseKey = value;
                                  })
                                }
                              />
                              {(['sets', 'targetMin', 'targetMax', 'restSeconds'] as const).map(
                                (field) => (
                                  <label className="field-label" key={field}>
                                    {field}
                                    <input
                                      className="input mt-1"
                                      type="number"
                                      min="0"
                                      step={field.startsWith('target') ? 0.5 : 1}
                                      value={item[field]}
                                      onChange={(e) =>
                                        mutate((d) => {
                                          d.weeks[wi].workouts[di].sections[si].exercises[ei][
                                            field
                                          ] = Number(e.target.value);
                                        })
                                      }
                                    />
                                  </label>
                                ),
                              )}
                            </div>
                          ))}
                          <button
                            className="btn-secondary mt-3"
                            onClick={() =>
                              mutate((d) => {
                                const list = d.weeks[wi].workouts[di].sections[si].exercises;
                                list.push({
                                  key: `exercise-${list.length + 1}`,
                                  exerciseKey: exerciseOptions[0]?.value ?? '',
                                  order: list.length,
                                  required: true,
                                  sets: 3,
                                  targetMin: 8,
                                  targetMax: 8,
                                  restSeconds: 90,
                                  progression: 'fixed',
                                });
                              })
                            }
                          >
                            <Plus size={16} />
                            {l('Exercise', 'תרגיל')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section
        className={`card mt-6 ${validation.valid ? 'border-emerald-500/40' : 'border-red-500/40'}`}
      >
        <h2 className="font-black">
          {validation.valid
            ? l('Ready to publish', 'מוכן לפרסום')
            : l('Blocking validation', 'שגיאות חוסמות')}
        </h2>
        {[...validation.blockingErrors, ...validation.warnings].map((issue, i) => (
          <p className="mt-2 text-sm" key={`${issue.code}-${i}`}>
            <code>{issue.path}</code> · {issue.message}
          </p>
        ))}
      </section>
      <div className="sticky bottom-3 z-20 mt-6 flex flex-wrap gap-2 rounded-3xl border bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-950">
        <button className="btn-primary" onClick={() => void save()}>
          <Save size={17} />
          {l('Save draft', 'שמירת טיוטה')}
        </button>
        {record && (
          <button
            className="btn-secondary"
            disabled={!validation.valid || dirty}
            onClick={() => void publishManagedProgram(record.id)}
          >
            {l('Publish immutable version', 'פרסום גרסה קבועה')}
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => {
            const blob = new Blob([exportManagedProgram(definition)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${definition.key || 'managed-program'}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          {l('Export JSON', 'ייצוא JSON')}
        </button>
        <label className="btn-secondary">
          {l('Import JSON', 'ייבוא JSON')}
          <input
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void file.text().then((text) => {
                  setDefinition(importManagedProgram(text));
                  setDirty(true);
                });
            }}
          />
        </label>
        <Link className="btn-secondary" to={`/admin/programs/${definition.key}/preview`}>
          {l('Preview', 'תצוגה')}
        </Link>
      </div>
      {guard.dialog}
    </main>
  );
}

export function AdminProgramPreviewPage() {
  const { programKey } = useParams();
  const { weekKey, workoutKey } = useParams();
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const [record, setRecord] = useState<ManagedProgramRecord>();
  const store = useAppStore();
  const nav = useNavigate();
  useEffect(() => {
    void loadAdminManagedPrograms().then((rows) =>
      setRecord(rows.find((x) => x.stableKey === programKey)),
    );
  }, [programKey]);
  if (!record) return <p>{l('Loading Program…', 'טוען תוכנית…')}</p>;
  const d = record.definition;
  if (weekKey && workoutKey) {
    if (store.activeWorkout)
      return (
        <main className="card">
          <h1 className="text-2xl font-black">
            {l('Workout already active', 'כבר קיים אימון פעיל')}
          </h1>
          <p>
            {l(
              'Finish or cancel the real workout before starting a QA preview.',
              'יש לסיים או לבטל את האימון האמיתי לפני תצוגת QA.',
            )}
          </p>
        </main>
      );
    const run = () => {
      const workout = compileManagedWorkout(d, weekKey, workoutKey, store.exercises);
      workout.managedProgramLink = { ...workout.managedProgramLink!, preview: true };
      if (store.startWorkout(workout))
        nav(`/admin/programs/${d.key}/test/${weekKey}/${workoutKey}`);
    };
    return (
      <main className="card">
        <h1 className="text-3xl font-black">{l('QA test workout', 'אימון בדיקת QA')}</h1>
        <p>
          {l(
            'Preview sessions never enter History, PRs, Progress, or enrollment.',
            'אימוני תצוגה אינם נרשמים בהיסטוריה, שיאים, התקדמות או הרשמה.',
          )}
        </p>
        <button className="btn-primary mt-4" onClick={run}>
          {l('Run test workout', 'הפעלת אימון בדיקה')}
        </button>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl pb-12">
      <p className="eyebrow">{l('Administrator preview', 'תצוגת מנהל')}</p>
      <h1 className="text-4xl font-black">{language === 'he' ? d.nameHe : d.nameEn}</h1>
      <p className="mt-2">{language === 'he' ? d.descriptionHe : d.descriptionEn}</p>
      <section className="mt-6 grid gap-4">
        {d.weeks.map((week) => (
          <article className="card" key={week.key}>
            <h2 className="text-2xl font-black">{language === 'he' ? week.nameHe : week.nameEn}</h2>
            {week.workouts.map((day) => (
              <div className="mt-4" key={day.key}>
                <div className="flex justify-between">
                  <strong>{language === 'he' ? day.nameHe : day.nameEn}</strong>
                  <Link
                    className="btn-secondary"
                    to={`/admin/programs/${d.key}/preview/${week.key}/${day.key}`}
                  >
                    {l('QA', 'בדיקה')}
                  </Link>
                </div>
                {day.sections.map((section) => (
                  <div className="mt-2" key={section.key}>
                    <span className="label">
                      {language === 'he' ? section.nameHe : section.nameEn}
                    </span>
                    <ul>
                      {section.exercises.map((x) => (
                        <li key={x.key}>
                          <code>{x.exerciseKey}</code> · {x.sets}×
                          {x.targetMin === x.targetMax
                            ? x.targetMin
                            : `${x.targetMin}–${x.targetMax}`}{' '}
                          · {x.restSeconds}s
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

export function AdminProgramVersionsPage() {
  const { programKey } = useParams();
  const { language } = useI18n();
  return (
    <main className="card">
      <h1 className="text-3xl font-black">
        {language === 'he' ? 'גרסאות תוכנית' : 'Program versions'}
      </h1>
      <p className="mt-2">
        <code>{programKey}</code>
      </p>
      <p className="mt-3 text-slate-500">
        {language === 'he'
          ? 'גרסאות שפורסמו נשארות קבועות וקריאות להרשמות היסטוריות.'
          : 'Published versions remain immutable and readable for historical enrollments.'}
      </p>
    </main>
  );
}
