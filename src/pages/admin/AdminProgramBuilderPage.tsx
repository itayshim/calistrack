import { ArrowDown, ArrowUp, ChevronDown, Copy, Download, Eye, Plus, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Select } from '../../components/SelectMenu';
import { useI18n } from '../../hooks/useI18n';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { AdminPreviewBadge, AdminValidationBanner } from '../../components/AdminPreview';
import { getExerciseName } from '../../utils/exerciseLocalization';
import type { Exercise } from '../../types';
import { contentHash } from '../../utils/contentHash';
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
  getBuiltInManagedPrograms,
  getManagedProgram,
  installManagedPrograms,
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

function mergeAdminProgramRows(builtIns: ManagedProgramRecord[], backend: ManagedProgramRecord[]) {
  const overrides = new Map(backend.filter((item) => item.source === 'builtin_override' && item.status !== 'archived' && item.status !== 'unpublished').map((item) => [item.builtinKey, item]));
  return [
    ...builtIns.map((item) => overrides.get(item.stableKey) ?? item),
    ...backend.filter((item) => item.source === 'admin-created'),
  ];
}

export function AdminProgramBuilderListPage() {
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const [rows, setRows] = useState<ManagedProgramRecord[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    void loadAdminManagedPrograms()
      .then((backend) => setRows(mergeAdminProgramRows(getBuiltInManagedPrograms(), backend)))
      .catch(() => { setRows(getBuiltInManagedPrograms()); setError(true); });
  }, []);
  const changeLifecycle = (id: string, status: 'unpublished' | 'archived') => void setManagedProgramLifecycle(id, status).then(() => setRows((items) => {
    const next = items.map((item) => item.id === id ? { ...item, status } : item);
    installManagedPrograms(next);
    return mergeAdminProgramRows(getBuiltInManagedPrograms(), next);
  }));
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
                  {row.source === 'builtin_override' ? l('Managed override', 'גרסה מנוהלת') : row.source === 'built-in' ? l('Built-in · Using original', 'מובנה · בשימוש במקור') : l('Managed', 'מנוהל')} · {row.status} · v{row.publishedVersion ?? row.draftVersion}
                </span>
                <h2 className="text-xl font-black">
                  {language === 'he' ? row.definition.nameHe : row.definition.nameEn}
                </h2>
                <code>{row.stableKey}</code> · {row.definition.weeks.length} {l('weeks', 'שבועות')}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.source === 'built-in' ? (
                  <Link className="btn-primary" to={`/admin/programs/new?override=${row.stableKey}`}>
                    <Copy size={17} /> {l('Create editable version', 'יצירת גרסה ניתנת לעריכה')}
                  </Link>
                ) : <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/edit`}>
                  {row.source === 'builtin_override' ? l('Edit managed version', 'עריכת גרסה מנוהלת') : l('Edit', 'עריכה')}
                </Link>}
                <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/preview`}>
                  <Eye size={17} />
                  {l('Preview', 'תצוגה')}
                </Link>
                {(row.source === 'built-in' || row.source === 'builtin_override') && <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/preview?source=original`}>{l('Preview original', 'תצוגת המקור')}</Link>}
                <Link className="btn-secondary" to={`/admin/programs/${row.stableKey}/versions`}>
                  {l('Versions', 'גרסאות')}
                </Link>
                {row.status === 'published' && (
                  <button
                    className="btn-secondary"
                    onClick={() => changeLifecycle(row.id, 'unpublished')}
                  >
                    {l('Unpublish', 'ביטול פרסום')}
                  </button>
                )}
                <button
                  className="btn-secondary text-red-500"
                  onClick={() => changeLifecycle(row.id, 'archived')}
                >
                  {row.source === 'builtin_override' ? l('Restore built-in version', 'שחזור הגרסה המובנית') : l('Archive', 'העברה לארכיון')}
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
  const [search] = useSearchParams();
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const exercises = useAppStore((s) => s.exercises);
  const [definition, setDefinition] = useState(blank);
  const [record, setRecord] = useState<ManagedProgramRecord>();
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState('week-1');
  const nav = useNavigate();
  useEffect(() => {
    const overrideKey = search.get('override');
    if (!programKey && overrideKey) {
      const source = getBuiltInManagedPrograms().find((item) => item.stableKey === overrideKey);
      if (source) queueMicrotask(() => setDefinition(structuredClone(source.definition)));
      return;
    }
    const duplicateKey = search.get('duplicate');
    if (!programKey && duplicateKey) {
      const source = getManagedProgram(duplicateKey);
      if (source) queueMicrotask(() => setDefinition({ ...structuredClone(source.definition), key: `${source.stableKey}-copy`, version: 1, featured: false }));
      return;
    }
    if (!programKey) return;
    void loadAdminManagedPrograms().then((rows) => {
      const found = rows.find((x) => x.stableKey === programKey);
      if (found) {
        setRecord(found);
        setDefinition(found.definition);
      }
    });
  }, [programKey, search]);
  const validation = useMemo(
    () => validateManagedProgram(definition, exercises),
    [definition, exercises],
  );
  const guard = useUnsavedChangesGuard(dirty);
  const overrideKey = search.get('override');
  const builtinKey = record?.builtinKey ?? overrideKey ?? undefined;
  const originalDefinition = builtinKey ? getBuiltInManagedPrograms().find((item) => item.stableKey === builtinKey)?.definition : undefined;
  const breakingStructureKeys = Boolean(originalDefinition && originalDefinition.weeks.some((week) => !definition.weeks.some((candidate) => candidate.key === week.key)));
  const storedValidation = breakingStructureKeys ? { ...validation, valid: false, blockingErrors: [...validation.blockingErrors, { severity: 'error' as const, code: 'week_key_migration_required', path: 'weeks', message: 'Existing built-in week keys require an explicit enrollment migration.' }] } : validation;
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
      validation: storedValidation,
      builtinKey,
      basedOnBuiltinHash: builtinKey ? contentHash(getBuiltInManagedPrograms().find((item) => item.stableKey === builtinKey)?.definition) : undefined,
    });
    if (!record) setRecord({ id, stableKey: definition.key, source: builtinKey ? 'builtin_override' : 'admin-created', status: 'draft', draftVersion: 1, publishedVersion: null, definition, validation: storedValidation, updatedAt: new Date().toISOString(), builtinKey, basedOnBuiltinHash: builtinKey ? contentHash(getBuiltInManagedPrograms().find((item) => item.stableKey === builtinKey)?.definition) : undefined });
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
      {builtinKey && <p className="mb-5 rounded-2xl border border-lime/30 bg-lime/10 p-4 font-bold">{l('You are editing a managed version. The built-in source remains unchanged.', 'אתם עורכים גרסה מנוהלת. המקור המובנה נשאר ללא שינוי.')}</p>}
      {originalDefinition && <details className="card mb-5"><summary className="cursor-pointer font-black">{l('Compare managed version with original', 'השוואת הגרסה המנוהלת למקור')}</summary><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">{l('Original content hash', 'חתימת תוכן מקורית')}</dt><dd><code>{contentHash(originalDefinition)}</code></dd></div><div><dt className="text-xs text-slate-500">{l('Current draft hash', 'חתימת הטיוטה הנוכחית')}</dt><dd><code>{contentHash(definition)}</code></dd></div><div><dt className="text-xs text-slate-500">{l('Weeks', 'שבועות')}</dt><dd>{originalDefinition.weeks.length} → {definition.weeks.length}</dd></div><div><dt className="text-xs text-slate-500">{l('Status', 'מצב')}</dt><dd>{contentHash(originalDefinition) === contentHash(definition) ? l('Matches original', 'זהה למקור') : l('Modified draft', 'טיוטה שונתה')}</dd></div></dl></details>}
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
              disabled={field === 'key' && Boolean(record?.publishedVersion || builtinKey)}
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
        {breakingStructureKeys && <p className="mt-2 text-sm text-red-500"><code>week_key_migration_required</code> · {l('Existing built-in week keys cannot be removed without an explicit enrollment migration.', 'לא ניתן להסיר מפתחות שבועות מובנים ללא מיפוי מפורש של הרשמות.')}</p>}
      </section>
      <div className="sticky bottom-3 z-20 mt-6 flex flex-wrap gap-2 rounded-3xl border bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-950">
        <button className="btn-primary" onClick={() => void save()}>
          <Save size={17} />
          {l('Save draft', 'שמירת טיוטה')}
        </button>
        {record && (
          <button
            className="btn-secondary"
            disabled={!validation.valid || dirty || breakingStructureKeys}
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

export function LegacyAdminProgramPreviewPage() {
  const { programKey } = useParams();
  const { weekKey, workoutKey } = useParams();
  const { language } = useI18n();
  const l = (e: string, h: string) => (language === 'he' ? h : e);
  const [record, setRecord] = useState<ManagedProgramRecord>();
  const store = useAppStore();
  const nav = useNavigate();
  useEffect(() => {
    const builtIn = getManagedProgram(programKey ?? '');
    if (builtIn?.source === 'built-in') {
      queueMicrotask(() => setRecord(builtIn));
      return;
    }
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

export function AdminProgramPreviewPage() {
  const { programKey } = useParams();
  const [previewParams] = useSearchParams();
  const originalPreview = previewParams.get('source') === 'original';
  const { language } = useI18n();
  const text = (en: string, he: string) => language === 'he' ? he : en;
  const [record, setRecord] = useState<ManagedProgramRecord>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<'all' | 'required' | 'optional'>('all');
  const [search, setSearch] = useState('');
  const [missingMedia, setMissingMedia] = useState(false);
  const [warningsOnly, setWarningsOnly] = useState(false);
  const store = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    const builtIn = getBuiltInManagedPrograms().find((item) => item.stableKey === programKey);
    if (originalPreview) { queueMicrotask(() => setRecord(builtIn)); return; }
    void loadAdminManagedPrograms().then((rows) => setRecord(rows.find((row) => row.stableKey === programKey) ?? getManagedProgram(programKey ?? ''))).catch(() => setRecord(getManagedProgram(programKey ?? '')));
  }, [originalPreview, programKey]);
  if (!record) return <p>{text('Loading Program…', 'טוען תוכנית…')}</p>;
  const definition = record.definition;
  const validation = validateManagedProgram(definition, store.exercises);
  const prescriptions = definition.weeks.flatMap((week) => week.workouts.flatMap((workout) => workout.sections.flatMap((section) => section.exercises)));
  const requiredSessions = definition.weeks.reduce((sum, week) => sum + week.workouts.filter((workout) => workout.required !== false).length, 0);
  const optionalSessions = definition.weeks.reduce((sum, week) => sum + week.workouts.filter((workout) => workout.required === false).length, 0);
  const phaseGroups = definition.phases.slice().sort((a, b) => a.order - b.order).map((phase) => ({ phase, weeks: definition.weeks.filter((week) => week.phaseKey === phase.key).sort((a, b) => a.order - b.order) }));
  const orphanWeeks = definition.weeks.filter((week) => !week.phaseKey || !definition.phases.some((phase) => phase.key === week.phaseKey));
  if (orphanWeeks.length) phaseGroups.push({ phase: { key: 'program', nameEn: 'Program weeks', nameHe: 'שבועות התוכנית', order: -1 }, weeks: orphanWeeks });
  const runQa = (week: ManagedProgramDefinition['weeks'][number], workout: ManagedProgramDefinition['weeks'][number]['workouts'][number]) => {
    if (store.activeWorkout) { store.setToast(text('Finish or cancel the active workout before starting QA.', 'יש לסיים או לבטל את האימון הפעיל לפני הפעלת QA.')); return; }
    const compiled = compileManagedWorkout(definition, week.key, workout.key, store.exercises, undefined, language);
    compiled.managedProgramLink = { ...compiled.managedProgramLink!, preview: true };
    if (store.startWorkout(compiled)) navigate(`/admin/programs/${definition.key}/test/${week.key}/${workout.key}`);
  };
  const exportJson = () => { const blob = new Blob([exportManagedProgram(definition)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${definition.key}.json`; anchor.click(); URL.revokeObjectURL(url); };
  return <main className="mx-auto max-w-5xl pb-12">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{text('Administrator · Preview', 'ניהול · תצוגה מקדימה')}</p><h1 className="mt-2 text-4xl font-black">{language === 'he' ? definition.nameHe : definition.nameEn}</h1><div className="mt-3 flex flex-wrap gap-2"><AdminPreviewBadge>v{definition.version}</AdminPreviewBadge><AdminPreviewBadge tone={record.source === 'built-in' ? 'success' : 'neutral'}>{record.source === 'built-in' ? text('Built-in', 'מובנה') : text('Managed', 'מנוהל')}</AdminPreviewBadge><AdminPreviewBadge>{record.status}</AdminPreviewBadge></div></div><div className="flex flex-wrap gap-2">{record.source !== 'built-in' && <Link className="btn-secondary" to={`/admin/programs/${definition.key}/edit`}>{text('Edit managed version', 'עריכת גרסה מנוהלת')}</Link>}<Link className="btn-secondary" to={`/admin/programs/new?duplicate=${definition.key}`}><Copy size={17}/>{text('Duplicate', 'שכפול')}</Link><Link className="btn-secondary" to={`/admin/programs/${definition.key}/versions`}>{text('Versions', 'גרסאות')}</Link><button className="btn-secondary" onClick={exportJson}><Download size={17} />{text('Export JSON', 'ייצוא JSON')}</button></div></div>
    <p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300">{language === 'he' ? definition.descriptionHe : definition.descriptionEn}</p>
    <AdminValidationBanner valid={validation.valid} errors={validation.blockingErrors} warnings={validation.warnings} language={language} />
    <section className="card mt-6"><h2 className="section-title">{text('Program summary', 'סיכום התוכנית')}</h2><dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"><Summary label={text('Duration','משך')} value={`${definition.durationWeeks} ${text('weeks','שבועות')}`} /><Summary label={text('Phases','שלבים')} value={definition.phases.length} /><Summary label={text('Required','חובה')} value={requiredSessions} /><Summary label={text('Optional','רשות')} value={optionalSessions} /><Summary label={text('Sessions / week','אימונים בשבוע')} value={definition.sessionsPerWeek} /><Summary label={text('Estimated workout','משך אימון משוער')} value={`${definition.estimatedMinutesMin}–${definition.estimatedMinutesMax} ${text('min','דק׳')}`} /><Summary label={text('Prescribed sets','סטים מתוכננים')} value={prescriptions.reduce((sum,item)=>sum+item.sets,0)} /><Summary label={text('Unique exercises','תרגילים ייחודיים')} value={new Set(prescriptions.map((item) => item.exerciseKey)).size} /><Summary label={text('Progression','התקדמות')} value={text('Week-specific','לפי שבוע')} /><Summary label={text('Active version','גרסה פעילה')} value={`v${definition.version}`} /></dl><p className="mt-4 text-sm text-slate-500">{text('Target audience','קהל יעד')}: {language === 'he' ? definition.targetAudienceHe : definition.targetAudienceEn}</p></section>
    <section className="card mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">{text('Preview tools','כלי תצוגה')}</h2><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setExpanded(new Set(definition.weeks.map((week) => week.key)))}>{text('Expand all weeks','פתיחת כל השבועות')}</button><button className="btn-secondary" onClick={() => setExpanded(new Set())}>{text('Collapse all weeks','סגירת כל השבועות')}</button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="control-shell field flex items-center gap-2"><Search size={17}/><input aria-label={text('Exercise search','חיפוש תרגיל')} className="min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="field" aria-label={text('Workout scope','סוג אימון')} value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="all">{text('All workouts','כל האימונים')}</option><option value="required">{text('Required only','חובה בלבד')}</option><option value="optional">{text('Optional only','רשות בלבד')}</option></select><label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={missingMedia} onChange={(event) => setMissingMedia(event.target.checked)} />{text('Missing media','מדיה חסרה')}</label><label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={warningsOnly} onChange={(event) => setWarningsOnly(event.target.checked)} />{text('Warnings','אזהרות')}</label><span className="self-center text-sm font-bold text-slate-500">{prescriptions.length} {text('prescriptions','מרשמים')}</span></div></section>
    <div className="mt-8 grid gap-8">{phaseGroups.map(({ phase, weeks }) => <section key={phase.key}><div className="mb-4"><p className="eyebrow">{text('Phase','שלב')} {phase.order >= 0 ? phase.order + 1 : ''}</p><h2 className="text-3xl font-black">{language === 'he' ? phase.nameHe : phase.nameEn}</h2><p className="text-sm text-slate-500">{weeks.length ? `${text('Weeks','שבועות')} ${weeks[0].order + 1}–${weeks[weeks.length - 1].order + 1}` : text('No weeks','אין שבועות')}</p></div><div className="grid gap-4">{weeks.map((week) => <ProgramPreviewWeek key={week.key} week={week} exercises={store.exercises} language={language} expanded={expanded.has(week.key)} scope={scope} search={search} missingMedia={missingMedia} warningsOnly={warningsOnly} warnings={validation.warnings} onToggle={() => setExpanded((current) => { const next = new Set(current); if (next.has(week.key)) next.delete(week.key); else next.add(week.key); return next; })} onRun={runQa} />)}</div></section>)}</div>
  </main>;
}

function Summary({ label, value }: { label: string; value: string | number }) { return <div><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black">{value}</dd></div>; }

function ProgramPreviewWeek({ week, exercises, language, expanded, scope, search, missingMedia, warningsOnly, warnings, onToggle, onRun }: { week: ManagedProgramDefinition['weeks'][number]; exercises: Exercise[]; language: 'en'|'he'; expanded: boolean; scope: 'all'|'required'|'optional'; search: string; missingMedia: boolean; warningsOnly: boolean; warnings: Array<{path:string}>; onToggle:()=>void; onRun:(week:ManagedProgramDefinition['weeks'][number],workout:ManagedProgramDefinition['weeks'][number]['workouts'][number])=>void }) {
  const t=(en:string,he:string)=>language==='he'?he:en;
  const required=week.workouts.filter((workout)=>workout.required!==false).length, optional=week.workouts.length-required;
  const workouts=week.workouts.filter((workout)=>scope==='all'||(scope==='required')===(workout.required!==false));
  const weekName=language==='he'?week.nameHe:week.nameEn;
  return <article className="card"><button className="flex min-h-12 w-full items-center justify-between gap-3 text-start" onClick={onToggle} aria-expanded={expanded} aria-label={`${weekName} · ${expanded?t('Collapse','סגירה'):t('Expand','פתיחה')}`}><span><span className="block text-2xl font-black">{weekName}</span><span className="mt-1 block text-sm text-slate-500">{required} {t('required','חובה')} · {optional} {t('optional','רשות')} · {formatAdvancement(week.advancementPolicy,language)}</span></span><ChevronDown className={`shrink-0 transition ${expanded?'rotate-180':''}`} /></button>{expanded&&<div className="mt-5 grid gap-4">{workouts.map((workout)=><ProgramWorkoutCard key={workout.key} week={week} workout={workout} exercises={exercises} language={language} search={search} missingMedia={missingMedia} warningsOnly={warningsOnly} warnings={warnings} onRun={onRun}/>)}</div>}</article>;
}

function ProgramWorkoutCard({ week, workout, exercises, language, search, missingMedia, warningsOnly, warnings, onRun }: { week:ManagedProgramDefinition['weeks'][number]; workout:ManagedProgramDefinition['weeks'][number]['workouts'][number]; exercises:Exercise[]; language:'en'|'he'; search:string; missingMedia:boolean; warningsOnly:boolean; warnings:Array<{path:string}>; onRun:(week:ManagedProgramDefinition['weeks'][number],workout:ManagedProgramDefinition['weeks'][number]['workouts'][number])=>void }) {
  const t=(en:string,he:string)=>language==='he'?he:en;
  const [detailsOpen,setDetailsOpen]=useState(true);
  const workoutName=language==='he'?workout.nameHe:workout.nameEn;
  return <section className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/[.08] dark:bg-white/[.025]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black">{workoutName}</h3><AdminPreviewBadge tone={workout.required===false?'warning':'success'}>{workout.required===false?t('Optional','רשות'):t('Required','חובה')}</AdminPreviewBadge></div><code className="mt-1 block text-xs text-slate-400">{workout.key}</code></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" aria-expanded={detailsOpen} aria-label={`${workoutName} · ${detailsOpen?t('Collapse','סגירה'):t('Expand','פתיחה')}`} onClick={()=>setDetailsOpen((value)=>!value)}><ChevronDown className={detailsOpen?'rotate-180':''} size={17}/>{detailsOpen?t('Collapse','סגירה'):t('Expand','פתיחה')}</button><button className="btn-primary" onClick={()=>onRun(week,workout)}>{t('Run QA workout','הפעלת אימון QA')}</button></div></div>{detailsOpen?<div className="mt-5 grid gap-4">{workout.sections.map((section)=><ProgramSection key={section.key} section={section} exercises={exercises} language={language} search={search} missingMedia={missingMedia} warningsOnly={warningsOnly} warnings={warnings}/>)}</div>:null}</section>;
}

function ProgramSection({ section, exercises, language, search, missingMedia, warningsOnly, warnings }: { section:ManagedProgramDefinition['weeks'][number]['workouts'][number]['sections'][number]; exercises:Exercise[]; language:'en'|'he'; search:string; missingMedia:boolean; warningsOnly:boolean; warnings:Array<{path:string}> }) {
  const t=(en:string,he:string)=>language==='he'?he:en;
  const rows=section.exercises.map((prescription)=>({prescription,exercise:exercises.find((exercise)=>exercise.stableKey===prescription.exerciseKey)})).filter(({prescription,exercise})=>{const name=exercise?getExerciseName(exercise,language):prescription.exerciseKey; if(search&&!`${name} ${prescription.exerciseKey}`.toLowerCase().includes(search.toLowerCase()))return false; if(missingMedia&&exercise?.media?.some((media)=>media.isPublished))return false; if(warningsOnly&&!warnings.some((warning)=>warning.path.includes(prescription.key)))return false; return true;});
  if(!rows.length)return null;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[.08] dark:bg-panel"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/[.08]"><div><h4 className="font-black">{language==='he'?section.nameHe:section.nameEn}</h4><span className="text-xs text-slate-500">{formatSectionKind(section.kind,language)}</span></div><div className="flex gap-2"><AdminPreviewBadge>{rows.length} {t('exercises','תרגילים')}</AdminPreviewBadge><AdminPreviewBadge tone={section.requiredForSuccess?'success':'warning'}>{section.requiredForSuccess?t('Required','חובה'):t('Optional','רשות')}</AdminPreviewBadge></div></div><div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/[.03]"><tr>{[t('#','#'),t('Exercise','תרגיל'),t('Measurement','מדידה'),t('Sets','סטים'),t('Target','יעד'),t('Rest','מנוחה'),t('Requirement','דרישה'),t('Replacements','תחליפים'),t('Media','מדיה')].map((heading)=><th className="px-3 py-2 text-start" key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row,index)=><PrescriptionCells key={row.prescription.key} index={index} {...row} language={language} warmup={section.kind==='warm_up'||section.kind==='cool_down'}/>)}</tbody></table></div><div className="grid gap-3 p-3 md:hidden">{rows.map((row,index)=><PrescriptionMobile key={row.prescription.key} index={index} {...row} language={language} warmup={section.kind==='warm_up'||section.kind==='cool_down'}/>)}</div></section>;
}

type RowProps={index:number;prescription:ManagedProgramDefinition['weeks'][number]['workouts'][number]['sections'][number]['exercises'][number];exercise?:Exercise;language:'en'|'he';warmup:boolean};
function PrescriptionCells(props:RowProps){const v=rowValues(props);return <tr className="border-t border-slate-100 dark:border-white/[.05]"><td className="px-3 py-3">{props.index+1}</td><td className="px-3 py-3"><strong className="block">{v.name}</strong><code className="text-xs text-slate-400">{props.prescription.exerciseKey}</code></td>{v.values.map((value,index)=><td className="px-3 py-3 align-top" key={index}>{value}</td>)}</tr>}
function PrescriptionMobile(props:RowProps){const v=rowValues(props);return <article className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[.04]"><strong>{props.index+1}. {v.name}</strong><code className="mt-1 block text-xs text-slate-400">{props.prescription.exerciseKey}</code><dl className="mt-3 grid grid-cols-2 gap-2 text-sm">{v.labels.map((label,index)=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-bold">{v.values[index]}</dd></div>)}</dl></article>}
function rowValues({prescription,exercise,language,warmup}:RowProps){const t=(en:string,he:string)=>language==='he'?he:en;const measurement=warmup?t('Done / Skip','בוצע / דילוג'):exercise?.measurementType==='duration'?t('Duration','משך'):exercise?.measurementType==='weighted_reps'?t('Weighted repetitions','חזרות עם משקל'):t('Repetitions','חזרות');const range=prescription.targetMin===prescription.targetMax?`${prescription.targetMin}`:`${prescription.targetMin}–${prescription.targetMax}`;const unit=exercise?.measurementType==='duration'?t('sec','שנ׳'):t('reps','חזרות');const target=`${range} ${prescription.perSide?(prescription.perSideGuidanceEn?language==='he'?prescription.perSideGuidanceHe:prescription.perSideGuidanceEn:t('each side','לכל צד')):unit}${prescription.addedWeightKg?` · +${prescription.addedWeightKg} kg`:''}${warmup?` · ${t('lightweight completion','השלמה קלה')}`:''}`;const values=[measurement,prescription.sets,target,prescription.restSeconds>0?`${prescription.restSeconds} ${t('sec','שנ׳')}`:t('No rest','ללא מנוחה'),prescription.required?t('Required','חובה'):t('Optional','רשות'),prescription.replacementKeys?.length??0,exercise?.media?.some((media)=>media.isPublished)?t('Published','פורסם'):t('Missing','חסר')];return{name:exercise?getExerciseName(exercise,language):prescription.exerciseKey,values,labels:[t('Measurement','מדידה'),t('Sets','סטים'),t('Target','יעד'),t('Rest','מנוחה'),t('Requirement','דרישה'),t('Replacements','תחליפים'),t('Media','מדיה')]}}
function formatAdvancement(value:string,language:'en'|'he'){const labels:Record<string,[string,string]>={manual:['Manual advance','מעבר ידני'],required_complete:['Required sessions complete','השלמת אימוני החובה'],calendar:['Calendar based','לפי לוח שנה'],hybrid:['Hybrid','משולב']};return labels[value]?.[language==='he'?1:0]??value}
function formatSectionKind(value:string,language:'en'|'he'){const en=value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());const he:Record<string,string>={warm_up:'חימום',main_work:'עבודה עיקרית',accessory:'תרגילי עזר',skill_practice:'תרגול מיומנות',conditioning:'כושר',cool_down:'שחרור',custom:'מותאם'};return language==='he'?he[value]??value:en}

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
