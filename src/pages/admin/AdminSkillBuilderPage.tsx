import { ArrowDown, ArrowUp, Copy, Eye, FileDown, FileUp, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Select } from '../../components/SelectMenu';
import type {
  SkillDefinition,
  SkillLevelDefinition,
  SkillPrescription,
  SkillWarmupPrescription,
} from '../../features/skills/skillEngine';
import { validateSkillContent } from '../../features/skills/skillEngine';
import { builtInSkillRegistry, getSkillDefinition, installManagedSkillRecords } from '../../features/skills/registry';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useI18n } from '../../hooks/useI18n';
import {
  exportSkillDocument,
  importSkillDocument,
  loadAdminSkills,
  publishSkill,
  saveSkillDraft,
  setSkillLifecycle,
  type ManagedSkillRecord,
} from '../../services/skillDefinitions';
import { useAppStore } from '../../store/useAppStore';
import { contentHash } from '../../utils/contentHash';

const keyify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[ _]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
const emptyLevel = (number: number): SkillLevelDefinition => ({
  key: `level-${number}`,
  number,
  nameEn: `Level ${number}`,
  nameHe: `שלב ${number}`,
  work: [],
  assessment: { exerciseKey: '', target: 1, measurementType: 'duration', techniqueRequired: true },
  performance: { exerciseKey: '', metric: 'duration' },
});
const blankSkill = (): SkillDefinition => ({
  key: '',
  templateVersion: 1,
  nameEn: '',
  nameHe: '',
  descriptionEn: '',
  descriptionHe: '',
  techniquePromptEn: 'How was your technique?',
  techniquePromptHe: 'איך הייתה הטכניקה?',
  levels: [emptyLevel(1)],
  warmup: [],
  metadata: {
    defaultRestSeconds: 90,
    assessmentRequired: true,
    techniqueModel: 'three-state',
    equipment: [],
    replacements: [],
  },
});

export function AdminSkillBuilderListPage() {
  const { language } = useI18n();
  const label = (en: string, he: string) => (language === 'he' ? he : en);
  const [managed, setManaged] = useState<ManagedSkillRecord[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    void loadAdminSkills()
      .then(setManaged)
      .catch(() => setError(true));
  }, []);
  const changeLifecycle = (id: string, status: 'unpublished' | 'archived') =>
    void setSkillLifecycle(id, status).then(() => setManaged((items) => {
      const next = items.map((item) => (item.id === id ? { ...item, status } : item));
      installManagedSkillRecords(next);
      return next;
    }));
  const builtIns = builtInSkillRegistry;
  const overrides = new Map(managed.filter((item) => item.source === 'builtin_override' && item.status !== 'archived' && item.status !== 'unpublished').map((item) => [item.builtinKey, item]));
  return (
    <main className="mx-auto max-w-5xl pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{label('Administrator', 'מנהל מערכת')}</p>
          <h1 className="text-4xl font-black">{label('Skill Builder', 'בונה מיומנויות')}</h1>
        </div>
        <Link className="btn-primary" to="/admin/skills/new">
          <Plus size={18} />
          {label('New Skill', 'מיומנות חדשה')}
        </Link>
      </div>
      {error && (
        <p className="mt-4 rounded-2xl border border-amber-500/30 p-3">
          {label(
            'Managed Skills could not be loaded. Built-in Skills remain available.',
            'לא ניתן לטעון מיומנויות מנוהלות. המיומנויות המובנות עדיין זמינות.',
          )}
        </p>
      )}
      <div className="mt-6 grid gap-4">
        {builtIns.map((skill) => {
          const override = overrides.get(skill.key);
          return (
          <article className="card" key={skill.key}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="label">{override ? label('Built-in · Managed override', 'מובנה · גרסה מנוהלת') : label('Built-in · Using original', 'מובנה · בשימוש בגרסה המקורית')}</span>
                <h2 className="text-xl font-black">
                  {language === 'he' ? skill.nameHe : skill.nameEn}
                </h2>
                <code>{skill.key}</code> · {skill.levels.length} {label('levels', 'שלבים')}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/admin/skills/${skill.key}/preview`}>
                  <Eye size={17} />
                  {label('Preview', 'תצוגה')}
                </Link>
                <Link className="btn-primary" to={override ? `/admin/skills/${skill.key}/edit` : `/admin/skills/new?override=${skill.key}`}>
                  <Copy size={17} />
                  {override ? label('Edit managed version', 'עריכת גרסה מנוהלת') : label('Create editable version', 'יצירת גרסה ניתנת לעריכה')}
                </Link>
                <Link className="btn-secondary" to={`/admin/skills/${skill.key}/preview?source=original`}>{label('Preview original', 'תצוגת המקור')}</Link>
                {override && <button className="btn-secondary text-red-500" onClick={() => changeLifecycle(override.id, 'archived')}>{label('Restore built-in version', 'שחזור הגרסה המובנית')}</button>}
              </div>
            </div>
          </article>
        )})}
        {managed.filter((item) => item.source !== 'builtin_override').map((item) => (
          <article className="card" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="label">
                  {item.status} · {label('Admin-created', 'נוצר על ידי מנהל')}
                </span>
                <h2 className="text-xl font-black">
                  {language === 'he' ? item.definition.nameHe : item.definition.nameEn}
                </h2>
                <code>{item.stableKey}</code> · {item.definition.levels.length}{' '}
                {label('levels', 'שלבים')} · v{item.publishedVersion ?? item.draftVersion}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/admin/skills/${item.stableKey}/edit`}>
                  {label('Edit', 'עריכה')}
                </Link>
                <Link className="btn-secondary" to={`/admin/skills/${item.stableKey}/preview`}>
                  {label('Preview', 'תצוגה')}
                </Link>
                {item.status === 'published' && (
                  <button
                    className="btn-secondary"
                    onClick={() => changeLifecycle(item.id, 'unpublished')}
                  >
                    {label('Unpublish', 'ביטול פרסום')}
                  </button>
                )}
                {item.status !== 'archived' && (
                  <button
                    className="btn-secondary text-red-500"
                    onClick={() => changeLifecycle(item.id, 'archived')}
                  >
                    {label('Archive', 'העברה לארכיון')}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export function AdminSkillEditorPage() {
  const { skillKey } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { language } = useI18n();
  const label = (en: string, he: string) => (language === 'he' ? he : en);
  const exercises = useAppStore((state) => state.exercises);
  const [record, setRecord] = useState<ManagedSkillRecord>();
  const duplicate = params.get('duplicate');
  const overrideKey = params.get('override');
  const overrideSource = overrideKey ? builtInSkillRegistry.find((skill) => skill.key === overrideKey) : undefined;
  const source = duplicate ? getSkillDefinition(duplicate) : undefined;
  const [definition, setDefinition] = useState<SkillDefinition>(() =>
    overrideSource
      ? structuredClone(overrideSource)
      : source
      ? {
          ...structuredClone(source),
          key: `${source.key}-copy`,
          nameEn: `${source.nameEn} — Copy`,
          nameHe: `${source.nameHe} — עותק`,
          templateVersion: 1,
        }
      : blankSkill(),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const unsaved = useUnsavedChangesGuard(dirty);
  const builtinKey = record?.builtinKey ?? overrideSource?.key;
  const originalDefinition = builtinKey ? builtInSkillRegistry.find((skill) => skill.key === builtinKey) : undefined;
  const breakingLevelKeys = Boolean(originalDefinition && originalDefinition.levels.some((level) => !definition.levels.some((candidate) => candidate.key === level.key)));
  useEffect(() => {
    if (!skillKey) return;
    void loadAdminSkills().then((rows) => {
      const found = rows.find((row) => row.stableKey === skillKey);
      if (found) {
        setRecord(found);
        setDefinition(found.definition);
        setDirty(false);
      }
    });
  }, [skillKey]);
  const validation = useMemo(
    () => validateSkillContent(definition, exercises),
    [definition, exercises],
  );
  const storedValidation = breakingLevelKeys ? { ...validation, valid: false, blockingErrors: [...validation.blockingErrors, { code: 'level_key_migration_required', message: 'Existing built-in level keys require an explicit progress migration.' }] } : validation;
  const mutate = (fn: (draft: SkillDefinition) => void) => {
    setDefinition((current) => {
      const next = structuredClone(current);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const exerciseOptions = exercises
    .filter((exercise) => Boolean(exercise.stableKey))
    .map((exercise) => ({
      value: exercise.stableKey!,
      label: language === 'he' ? exercise.nameHe : exercise.nameEn,
      description: `${exercise.stableKey} · ${exercise.measurementType}`,
    }));
  const addWork = (levelIndex: number) =>
    mutate((draft) => {
      const exercise = exercises.find((item) => item.stableKey);
      if (!exercise?.stableKey) return;
      draft.levels[levelIndex].work.push({
        exerciseKey: exercise.stableKey,
        sets: 3,
        target: 5,
        measurementType: exercise.measurementType,
        role: 'primary-skill',
        restSeconds: draft.metadata?.defaultRestSeconds ?? 90,
      });
      if (draft.levels[levelIndex].work.length === 1) {
        draft.levels[levelIndex].performance = {
          exerciseKey: exercise.stableKey,
          metric: exercise.measurementType,
        };
        draft.levels[levelIndex].assessment = {
          exerciseKey: exercise.stableKey,
          target: 5,
          measurementType: exercise.measurementType,
          techniqueRequired: true,
        };
      }
    });
  const save = async () => {
    setBusy(true);
    try {
      const id = await saveSkillDraft({
        id: record?.id ?? '',
        stableKey: definition.key,
        definition,
        validation: storedValidation,
        isNew: !record,
        builtinKey,
        basedOnBuiltinHash: builtinKey ? contentHash(builtInSkillRegistry.find((skill) => skill.key === builtinKey)) : undefined,
      });
      setRecord(
        (old) =>
          old ?? {
            id,
            stableKey: definition.key,
            source: builtinKey ? 'builtin_override' : 'admin-created',
            status: storedValidation.valid ? 'ready' : 'draft',
            draftVersion: 1,
            publishedVersion: null,
            definition,
            validation: storedValidation,
            updatedAt: new Date().toISOString(),
            builtinKey,
            basedOnBuiltinHash: builtinKey ? contentHash(builtInSkillRegistry.find((skill) => skill.key === builtinKey)) : undefined,
          },
      );
      setDirty(false);
      nav(`/admin/skills/${definition.key}/edit`, { replace: true });
      useAppStore.getState().setToast(label('Draft saved', 'הטיוטה נשמרה'));
    } catch {
      useAppStore.getState().setToast(label('Draft could not be saved', 'לא ניתן לשמור את הטיוטה'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-5xl pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      {builtinKey && <p className="mb-5 rounded-2xl border border-lime/30 bg-lime/10 p-4 font-bold">{label('You are editing a managed version. The built-in source remains unchanged.', 'אתם עורכים גרסה מנוהלת. המקור המובנה נשאר ללא שינוי.')}</p>}
      {originalDefinition && <details className="card mb-5"><summary className="cursor-pointer font-black">{label('Compare managed version with original', 'השוואת הגרסה המנוהלת למקור')}</summary><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">{label('Original content hash', 'חתימת תוכן מקורית')}</dt><dd><code>{contentHash(originalDefinition)}</code></dd></div><div><dt className="text-xs text-slate-500">{label('Current draft hash', 'חתימת הטיוטה הנוכחית')}</dt><dd><code>{contentHash(definition)}</code></dd></div><div><dt className="text-xs text-slate-500">{label('Levels', 'שלבים')}</dt><dd>{originalDefinition.levels.length} → {definition.levels.length}</dd></div><div><dt className="text-xs text-slate-500">{label('Status', 'מצב')}</dt><dd>{contentHash(originalDefinition) === contentHash(definition) ? label('Matches original', 'זהה למקור') : label('Modified draft', 'טיוטה שונתה')}</dd></div></dl></details>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {label('Administrator · Skill Builder', 'מנהל מערכת · בונה מיומנויות')}
          </p>
          <h1 className="text-3xl font-black">
            {skillKey ? label('Edit Skill', 'עריכת מיומנות') : label('New Skill', 'מיומנות חדשה')}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              const blob = new Blob([exportSkillDocument(definition)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${definition.key || 'skill'}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <FileDown size={17} />
            {label('Export', 'ייצוא')}
          </button>
          <button className="btn-secondary" onClick={() => importRef.current?.click()}>
            <FileUp size={17} />
            {label('Import draft', 'ייבוא טיוטה')}
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void file.text().then((text) => {
                  setDefinition(importSkillDocument(text));
                  setDirty(true);
                });
            }}
          />
        </div>
      </div>
      <section className="card mt-6 grid gap-4 md:grid-cols-2">
        <h2 className="text-xl font-black md:col-span-2">{label('Metadata', 'פרטים')}</h2>
        <label className="field-label">
          {label('Stable key', 'מפתח יציב')}
          <input
            className="input mt-2"
            value={definition.key}
            disabled={Boolean(record?.publishedVersion || builtinKey)}
            onChange={(e) =>
              mutate((d) => {
                d.key = keyify(e.target.value);
              })
            }
          />
        </label>
        <label className="field-label">
          {label('Default rest (seconds)', 'מנוחה ברירת מחדל (שניות)')}
          <input
            className="input mt-2"
            type="number"
            min="0"
            value={definition.metadata?.defaultRestSeconds ?? 90}
            onChange={(e) =>
              mutate((d) => {
                d.metadata = { ...d.metadata, defaultRestSeconds: Number(e.target.value) };
              })
            }
          />
        </label>
        {(['nameEn', 'nameHe', 'descriptionEn', 'descriptionHe'] as const).map((field) => (
          <label className="field-label" key={field}>
            {field}
            <input
              className="input mt-2"
              dir={field.endsWith('He') ? 'rtl' : 'ltr'}
              value={definition[field]}
              onChange={(e) =>
                mutate((d) => {
                  d[field] = e.target.value;
                })
              }
            />
          </label>
        ))}
      </section>
      <section className="mt-6">
        <div className="flex justify-between">
          <h2 className="text-2xl font-black">{label('Levels', 'שלבים')}</h2>
          <button
            className="btn-secondary"
            onClick={() =>
              mutate((d) => {
                d.levels.push(emptyLevel(d.levels.length + 1));
                setExpanded(d.levels.length - 1);
              })
            }
          >
            <Plus size={17} />
            {label('Add level', 'הוספת שלב')}
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {definition.levels.map((level, levelIndex) => (
            <article className="card" key={`${level.key}-${levelIndex}`}>
              <button
                className="flex w-full justify-between text-start"
                onClick={() => setExpanded(expanded === levelIndex ? -1 : levelIndex)}
              >
                <span>
                  <span className="label">
                    {label('Level', 'שלב')} {level.number}
                  </span>
                  <strong className="block text-xl">
                    {language === 'he' ? level.nameHe : level.nameEn}
                  </strong>
                </span>
                <span>
                  {level.work.length} {label('exercises', 'תרגילים')}
                </span>
              </button>
              {expanded === levelIndex && (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      className="input"
                      aria-label="Level key"
                      value={level.key}
                      onChange={(e) =>
                        mutate((d) => {
                          d.levels[levelIndex].key = keyify(e.target.value);
                        })
                      }
                    />
                    <input
                      className="input"
                      aria-label="English level name"
                      value={level.nameEn}
                      onChange={(e) =>
                        mutate((d) => {
                          d.levels[levelIndex].nameEn = e.target.value;
                        })
                      }
                    />
                    <input
                      className="input"
                      aria-label="Hebrew level name"
                      dir="rtl"
                      value={level.nameHe}
                      onChange={(e) =>
                        mutate((d) => {
                          d.levels[levelIndex].nameHe = e.target.value;
                        })
                      }
                    />
                  </div>
                  <h3 className="font-black">{label('Official work', 'עבודה רשמית')}</h3>
                  {level.work.map((work, index) => (
                    <WorkRow
                      key={`${work.exerciseKey}-${index}`}
                      item={work}
                      options={exerciseOptions}
                      onChange={(next) =>
                        mutate((d) => {
                          d.levels[levelIndex].work[index] = next;
                          if (index === 0)
                            d.levels[levelIndex].performance = {
                              exerciseKey: next.exerciseKey,
                              metric: next.measurementType,
                            };
                        })
                      }
                      onDelete={() =>
                        mutate((d) => {
                          d.levels[levelIndex].work.splice(index, 1);
                        })
                      }
                    />
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => addWork(levelIndex)}>
                      <Plus size={17} />
                      {label('Add exercise', 'הוספת תרגיל')}
                    </button>
                    <Link
                      className="btn-secondary"
                      to={`/admin/exercises/new?returnTo=/admin/skills/${definition.key || 'new'}/edit`}
                    >
                      {label('Create exercise', 'יצירת תרגיל')}
                    </Link>
                    <button
                      className="btn-secondary"
                      disabled={levelIndex === 0}
                      onClick={() =>
                        mutate((d) => {
                          [d.levels[levelIndex - 1], d.levels[levelIndex]] = [
                            d.levels[levelIndex],
                            d.levels[levelIndex - 1],
                          ];
                          d.levels.forEach((x, i) => (x.number = i + 1));
                          setExpanded(levelIndex - 1);
                        })
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={levelIndex === definition.levels.length - 1}
                      onClick={() =>
                        mutate((d) => {
                          [d.levels[levelIndex + 1], d.levels[levelIndex]] = [
                            d.levels[levelIndex],
                            d.levels[levelIndex + 1],
                          ];
                          d.levels.forEach((x, i) => (x.number = i + 1));
                          setExpanded(levelIndex + 1);
                        })
                      }
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      className="btn-secondary text-red-500"
                      onClick={() =>
                        mutate((d) => {
                          d.levels.splice(levelIndex, 1);
                          d.levels.forEach((x, i) => (x.number = i + 1));
                        })
                      }
                    >
                      <Trash2 size={17} />
                      {label('Delete level', 'מחיקת שלב')}
                    </button>
                  </div>
                  <h3 className="font-black">{label('Assessment', 'מבחן')}</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select
                      label={label('Exact assessment exercise', 'תרגיל מבחן מדויק')}
                      value={level.assessment.exerciseKey}
                      options={exerciseOptions}
                      searchable
                      onChange={(value: string) =>
                        mutate((d) => {
                          const e = exercises.find((x) => x.stableKey === value)!;
                          d.levels[levelIndex].assessment.exerciseKey = value;
                          d.levels[levelIndex].assessment.measurementType = e.measurementType;
                        })
                      }
                    />
                    <label className="field-label">
                      {label('Target', 'יעד')}
                      <input
                        className="input mt-2"
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={level.assessment.target}
                        onChange={(e) =>
                          mutate((d) => {
                            d.levels[levelIndex].assessment.target = Number(e.target.value);
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <WarmupEditor
        definition={definition}
        exercises={exercises}
        language={language}
        onChange={(warmup) =>
          mutate((d) => {
            d.warmup = warmup;
          })
        }
      />
      <section
        className={`mt-6 rounded-3xl border p-5 ${validation.valid ? 'border-emerald-500/40' : 'border-red-500/40'}`}
      >
        <h2 className="font-black">
          {validation.valid
            ? label('Ready to publish', 'מוכן לפרסום')
            : label('Blocking validation errors', 'שגיאות אימות חוסמות')}
        </h2>
        {validation.blockingErrors.map((issue, index) => (
          <p className="mt-2 text-sm" key={`${issue.code}-${index}`}>
            <code>{issue.code}</code> · {issue.message}
          </p>
        ))}
        {breakingLevelKeys && <p className="mt-2 text-sm text-red-500"><code>level_key_migration_required</code> · {label('Existing built-in level keys cannot be removed without an explicit progress migration.', 'לא ניתן להסיר מפתחות שלבים מובנים ללא מיפוי מפורש של התקדמות.')}</p>}
      </section>
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+.75rem)] z-20 mt-6 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-950">
        <button className="btn-primary" disabled={busy} onClick={() => void save()}>
          <Save size={18} />
          {label('Save draft', 'שמירת טיוטה')}
        </button>
        {record && (
          <button
            className="btn-secondary"
            disabled={!validation.valid || dirty || breakingLevelKeys}
            onClick={() =>
              void publishSkill(record.id).then(() =>
                useAppStore.getState().setToast(label('Published', 'פורסם')),
              )
            }
          >
            {label('Publish immutable version', 'פרסום גרסה קבועה')}
          </button>
        )}
        <Link className="btn-secondary" to={`/admin/skills/${definition.key}/preview`}>
          {label('Preview', 'תצוגה')}
        </Link>
      </div>
      {unsaved.dialog}
    </main>
  );
}

function WorkRow({
  item,
  options,
  onChange,
  onDelete,
}: {
  item: SkillPrescription;
  options: { value: string; label: string; description: string }[];
  onChange: (item: SkillPrescription) => void;
  onDelete: () => void;
}) {
  return (
    <div className="surface-subtle grid gap-3 rounded-2xl p-3 md:grid-cols-5">
      <Select
        className="md:col-span-2"
        label="Canonical exercise"
        value={item.exerciseKey}
        options={options}
        searchable
        onChange={(value: string) => {
          const option = options.find((x) => x.value === value)!;
          const measurementType = (option.description.split(' · ')[1] ||
            'reps') as SkillPrescription['measurementType'];
          onChange({ ...item, exerciseKey: value, measurementType });
        }}
      />
      <label className="field-label">
        Sets
        <input
          className="input mt-2"
          type="number"
          min="1"
          value={item.sets}
          onChange={(e) => onChange({ ...item, sets: Number(e.target.value) })}
        />
      </label>
      <label className="field-label">
        Target
        <input
          className="input mt-2"
          type="number"
          min="0.5"
          step="0.5"
          value={item.target}
          onChange={(e) => onChange({ ...item, target: Number(e.target.value) })}
        />
      </label>
      <label className="field-label">
        Rest
        <input
          className="input mt-2"
          type="number"
          min="0"
          value={item.restSeconds ?? 90}
          onChange={(e) => onChange({ ...item, restSeconds: Number(e.target.value) })}
        />
      </label>
      <button className="btn-secondary md:col-start-5" onClick={onDelete}>
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );
}

function WarmupEditor({
  definition,
  exercises,
  language,
  onChange,
}: {
  definition: SkillDefinition;
  exercises: ReturnType<typeof useAppStore.getState>['exercises'];
  language: string;
  onChange: (items: SkillWarmupPrescription[]) => void;
}) {
  const options = exercises
    .filter((e) => Boolean(e.stableKey))
    .map((e) => ({
      value: e.stableKey!,
      label: language === 'he' ? e.nameHe : e.nameEn,
      description: e.stableKey,
    }));
  return (
    <section className="card mt-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-black">
            {language === 'he' ? 'חימום נפרד ואופציונלי' : 'Separate optional warm-up'}
          </h2>
          <p className="text-sm text-slate-500">Done / Skip · no sets, rest, PR, or Progress</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() =>
            onChange([
              ...definition.warmup,
              {
                exerciseKey: exercises[0]?.stableKey ?? '',
                guidanceEn: '10 reps',
                guidanceHe: '10 חזרות',
              },
            ])
          }
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {definition.warmup.map((item, index) => (
          <div
            className="surface-subtle grid gap-3 rounded-2xl p-3 md:grid-cols-3"
            key={`${item.exerciseKey}-${index}`}
          >
            <Select
              label="Canonical exercise"
              value={item.exerciseKey}
              options={options}
              searchable
              onChange={(value: string) =>
                onChange(
                  definition.warmup.map((x, i) => (i === index ? { ...x, exerciseKey: value } : x)),
                )
              }
            />
            <input
              className="input"
              aria-label="English warm-up guidance"
              value={item.guidanceEn}
              onChange={(e) =>
                onChange(
                  definition.warmup.map((x, i) =>
                    i === index ? { ...x, guidanceEn: e.target.value } : x,
                  ),
                )
              }
            />
            <input
              className="input"
              dir="rtl"
              aria-label="Hebrew warm-up guidance"
              value={item.guidanceHe}
              onChange={(e) =>
                onChange(
                  definition.warmup.map((x, i) =>
                    i === index ? { ...x, guidanceHe: e.target.value } : x,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
