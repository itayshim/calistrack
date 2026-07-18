import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Pencil, Plus, Search, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type {
  Difficulty,
  Exercise,
  ExerciseCategory,
  MeasurementType,
  Program,
  WorkoutExercise,
  WorkoutTemplate,
} from '../types';
import { createId } from '../utils/id';
import { searchExercises } from '../utils/exerciseSearch';
import { useI18n } from '../hooks/useI18n';
import { ExerciseDemonstrationButton } from '../components/ExerciseDemonstration';
import { getExerciseName } from '../utils/exerciseLocalization';
import { PageBackLink } from '../components/PageBackLink';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import type { TranslationKey } from '../locales/translations';
import { Select } from '../components/SelectMenu';
const dayKeys: TranslationKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
type NumericField = 'targetSets' | 'targetMin' | 'targetMax' | 'targetAddedWeightKg' | 'restSeconds';
type NumericDrafts = Record<string, string>;
export function ProgramEditorPage() {
  const { t, language } = useI18n();
  const { id } = useParams(),
    existing = useAppStore((s) => s.programs.find((p) => p.id === id)),
    exercises = useAppStore((s) => s.exercises),
    addCustomExercise = useAppStore((s) => s.addExercise),
    save = useAppStore((s) => s.saveProgram),
    allowEmpty = useAppStore((s) => s.settings.allowEmptyNumericFields),
    location = useLocation(),
    nav = useNavigate();
  const now = new Date().toISOString();
  const [program, setProgram] = useState<Program>(() =>
    existing
      ? structuredClone(existing)
      : { id: createId(), name: t('defaultProgramName'), workouts: [], createdAt: now, updatedAt: now },
  );
  const [initialSnapshot, setInitialSnapshot] = useState(() => JSON.stringify(program));
  const [numericDrafts, setNumericDrafts] = useState<NumericDrafts>({});
  const [numericErrors, setNumericErrors] = useState<Record<string, string>>({});
  const requestedWorkoutId = (location.state as { workoutId?: string } | null)?.workoutId;
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(
    requestedWorkoutId && program.workouts.some((workout) => workout.id === requestedWorkoutId)
      ? requestedWorkoutId
      : program.workouts[0]?.id ?? null,
  );
  const dirty = JSON.stringify(program) !== initialSnapshot || Object.keys(numericDrafts).length > 0;
  const unsaved = useUnsavedChangesGuard(dirty);
  const [chooser, setChooser] = useState<string | null>(null);
  const updateWorkout = (wid: string, fn: (w: WorkoutTemplate) => void) =>
    setProgram((p) => ({
      ...p,
      workouts: p.workouts.map((w) => {
        if (w.id !== wid) return w;
        const x = structuredClone(w);
        fn(x);
        x.updatedAt = new Date().toISOString();
        return x;
      }),
    }));
  const addDay = () => {
    const workoutId = createId();
    setProgram((p) => ({
      ...p,
      workouts: [
        ...p.workouts,
        {
          id: workoutId,
          programId: p.id,
          name: t('defaultWorkoutName').replace('{letter}', String.fromCharCode(65 + p.workouts.length)),
          scheduledDays: [],
          exercises: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    setExpandedWorkoutId(workoutId);
  };
  const duplicateWorkout = (workout: WorkoutTemplate) => {
    const workoutId = createId();
    const copyWord = language === 'he' ? 'עותק' : 'Copy';
    setProgram((current) => {
      const sourceIndex = current.workouts.findIndex((item) => item.id === workout.id);
      const existingNames = new Set(current.workouts.map((item) => item.name));
      let name = `${workout.name} — ${copyWord}`;
      let number = 2;
      while (existingNames.has(name)) name = `${workout.name} — ${copyWord} ${number++}`;
      const duplicate: WorkoutTemplate = {
        ...structuredClone(workout),
        id: workoutId,
        programId: current.id,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercises: workout.exercises.map((exercise) => ({ ...structuredClone(exercise), id: createId() })),
      };
      const workouts = [...current.workouts];
      workouts.splice(sourceIndex + 1, 0, duplicate);
      return { ...current, workouts };
    });
    setExpandedWorkoutId(workoutId);
  };
  const deleteWorkout = (workoutId: string) => {
    setProgram((current) => {
      const index = current.workouts.findIndex((item) => item.id === workoutId);
      const workouts = current.workouts.filter((item) => item.id !== workoutId);
      if (expandedWorkoutId === workoutId) {
        setExpandedWorkoutId(workouts[Math.min(index, workouts.length - 1)]?.id ?? null);
      }
      return { ...current, workouts };
    });
  };
  const moveWorkout = (workoutId: string, delta: number) => {
    setProgram((current) => {
      const workouts = [...current.workouts];
      const index = workouts.findIndex((item) => item.id === workoutId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= workouts.length) return current;
      [workouts[index], workouts[target]] = [workouts[target], workouts[index]];
      return { ...current, workouts };
    });
  };
  const addExercise = (wid: string, eid: string) => {
    const exercise = exercises.find((item) => item.id === eid);
    const measurementType = exercise?.measurementType ?? 'reps';
    updateWorkout(wid, (w) =>
      w.exercises.push({
        id: createId(),
        exerciseId: eid,
        order: w.exercises.length,
        targetSets: 3,
        targetMin: measurementType === 'duration' ? 20 : 8,
        targetMax: measurementType === 'duration' ? 30 : 12,
        restSeconds: 75,
        measurementType,
      }),
    );
    setChooser(null);
  };
  const valid = program.name.trim() && program.workouts.length > 0;
  const draftKey = (exerciseId: string, field: NumericField) => `${exerciseId}:${field}`;
  const numericValue = (exercise: WorkoutExercise, field: NumericField) =>
    numericDrafts[draftKey(exercise.id, field)] ?? String(exercise[field] ?? 0);
  const updateNumeric = (
    workoutId: string,
    exercise: WorkoutExercise,
    field: NumericField,
    raw: string,
    minimum: number,
  ) => {
    const key = draftKey(exercise.id, field);
    if (allowEmpty) {
      setNumericDrafts((drafts) => ({ ...drafts, [key]: raw }));
      setNumericErrors((errors) => ({ ...errors, [key]: '' }));
      const parsed = Number(raw);
      if (raw !== '' && Number.isFinite(parsed)) {
        updateWorkout(workoutId, (workout) => {
          workout.exercises = workout.exercises.map((item) =>
            item.id === exercise.id ? { ...item, [field]: parsed } : item,
          );
        });
      }
      return;
    }
    const parsed = Number(raw);
    updateWorkout(workoutId, (workout) => {
      workout.exercises = workout.exercises.map((item) =>
        item.id === exercise.id
          ? { ...item, [field]: Number.isFinite(parsed) ? Math.max(minimum, parsed) : minimum }
          : item,
      );
    });
  };
  const saveProgram = () => {
    const errors: Record<string, string> = {};
    const next = structuredClone(program);
    for (const workout of next.workouts) {
      for (const exercise of workout.exercises) {
        const type = exercise.measurementType ?? exercises.find((item) => item.id === exercise.exerciseId)?.measurementType ?? 'reps';
        const read = (field: NumericField) => {
          const raw = numericDrafts[draftKey(exercise.id, field)];
          return raw === undefined ? Number(exercise[field] ?? 0) : raw.trim() === '' ? null : Number(raw);
        };
        const sets = read('targetSets');
        const rest = read('restSeconds');
        const minimum = read('targetMin');
        const maximum = read('targetMax');
        const weight = read('targetAddedWeightKg');
        if (sets === null || !Number.isInteger(sets) || sets < 1) errors[draftKey(exercise.id, 'targetSets')] = t('enterSets');
        if (rest === null || !Number.isFinite(rest) || rest < 0) errors[draftKey(exercise.id, 'restSeconds')] = t('enterValidRest');
        if (minimum === null || maximum === null || minimum < 1 || maximum < 1) {
          const message = type === 'duration' ? t('enterBothDurationRange') : t('enterBothRepetitionRange');
          errors[draftKey(exercise.id, 'targetMin')] = message;
          errors[draftKey(exercise.id, 'targetMax')] = message;
        } else if (maximum < minimum) {
          errors[draftKey(exercise.id, 'targetMax')] = t('maximumAtLeastMinimum');
        }
        if (type === 'weighted_reps' && (weight === null || !Number.isFinite(weight) || weight < 0)) {
          errors[draftKey(exercise.id, 'targetAddedWeightKg')] = t('addedWeightNonNegative');
        }
        if (sets !== null) exercise.targetSets = sets;
        if (rest !== null) exercise.restSeconds = rest;
        if (minimum !== null) exercise.targetMin = minimum;
        if (maximum !== null) exercise.targetMax = maximum;
        if (weight !== null) exercise.targetAddedWeightKg = weight;
      }
    }
    if (Object.keys(errors).length) {
      setNumericErrors(errors);
      const first = Object.keys(errors)[0];
      const exerciseId = first.split(':')[0];
      const workout = next.workouts.find((item) => item.exercises.some((exercise) => exercise.id === exerciseId));
      if (workout) setExpandedWorkoutId(workout.id);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-numeric-key="${first}"]`)?.focus());
      useAppStore.getState().setToast(t('invalidProgramFields'));
      return;
    }
    const saved = { ...next, updatedAt: new Date().toISOString() };
    save(saved);
    setProgram(saved);
    setInitialSnapshot(JSON.stringify(saved));
    setNumericDrafts({});
    setNumericErrors({});
    nav('/program');
  };
  return (
    <>
      <div onClick={(event) => {
        const anchor = (event.target as Element).closest('a[href="/program"]');
        if (anchor && dirty) {
          event.preventDefault();
          unsaved.request(() => nav('/program'));
        }
      }}>
        <PageBackLink to="/program" label={t('backToPrograms')} />
      </div>
      <div className="flex items-center justify-between">
        <h1 className="page-title">{existing ? t('editProgram') : t('newProgram')}</h1>
        <button
          disabled={!valid}
          className="btn-primary"
          onClick={saveProgram}
        >
          <Save />
          {t('save')}
        </button>
      </div>
      <label className="card mb-4 block">
        <span className="label">{t('programName')}</span>
        <input
          className="field text-xl font-bold"
          value={program.name}
          onChange={(e) => setProgram((p) => ({ ...p, name: e.target.value }))}
        />
      </label>
      {program.workouts.length > 1 && (
        <div className="mb-3 flex justify-end">
          <button className="btn-secondary min-h-10 px-4 py-2 text-sm" onClick={() => setExpandedWorkoutId(null)}>
            {t('collapseAll')}
          </button>
        </div>
      )}
      <div className="space-y-4">
        {program.workouts.map((w, workoutIndex) => {
          const expanded = expandedWorkoutId === w.id;
          const scheduled = w.scheduledDays.map((day) => t(dayKeys[day])).join(' · ');
          const estimatedMinutes = Math.max(1, Math.round(w.exercises.reduce((total, exercise) => total + exercise.targetSets * (45 + exercise.restSeconds), 0) / 60));
          return (
          <section className={`card overflow-hidden p-0 ${expanded ? 'border-brand/60 ring-1 ring-brand/20' : ''}`} key={w.id}>
            <div className={`flex items-start gap-2 p-4 ${expanded ? 'bg-brand/[.08]' : ''}`}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? t('collapseWorkout') : t('expandWorkout')}
                className="min-w-0 flex-1 text-start"
                onClick={() => setExpandedWorkoutId(expanded ? null : w.id)}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <strong className="block break-words text-xl font-black">{w.name}</strong>
                    {expanded && <span className="mt-1 inline-flex rounded-full bg-brand/20 px-2 py-0.5 text-xs font-black text-lime-700 dark:text-brand">{t('editing')}</span>}
                  </span>
                  <ChevronDown className={`mt-1 shrink-0 transition ${expanded ? 'rotate-180' : ''}`} />
                </span>
                <span className="mt-2 block text-sm font-semibold text-slate-500">{scheduled || t('noScheduledDays')}</span>
                <span className="mt-1 block text-sm text-slate-400">
                  <bdi>{t('workoutSummary').replace('{count}', String(w.exercises.length))}</bdi>
                  <span aria-hidden="true"> · </span>
                  <bdi>{t('estimatedMinutes').replace('{count}', String(estimatedMinutes))}</bdi>
                </span>
              </button>
              <div className="grid shrink-0 grid-cols-3 gap-1">
                <button
                  aria-label={t('renameWorkout')}
                  className="icon-button h-11 w-11"
                  onClick={() => {
                    setExpandedWorkoutId(w.id);
                    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-workout-name="${w.id}"]`)?.focus());
                  }}
                >
                  <Pencil size={18} />
                </button>
                <button aria-label={t('moveUp')} className="icon-button h-11 w-11" disabled={workoutIndex === 0} onClick={() => moveWorkout(w.id, -1)}><ArrowUp /></button>
                <button aria-label={t('moveDown')} className="icon-button h-11 w-11" disabled={workoutIndex === program.workouts.length - 1} onClick={() => moveWorkout(w.id, 1)}><ArrowDown /></button>
                <button aria-label={t('duplicateWorkout')} className="icon-button h-11 w-11" onClick={() => duplicateWorkout(w)}><Copy size={18} /></button>
                <button aria-label={t('deleteWorkoutDay')} className="icon-button h-11 w-11 text-red-500" onClick={() => deleteWorkout(w.id)}><Trash2 size={18} /></button>
              </div>
            </div>
            {expanded && <div className="border-t border-line p-4">
            <div className="flex gap-2">
              <input
                data-workout-name={w.id}
                aria-label={t('workoutDayName')}
                className="field text-lg font-black"
                value={w.name}
                onChange={(e) =>
                  updateWorkout(w.id, (x) => {
                    x.name = e.target.value;
                  })
                }
              />
              <button
                aria-label={t('duplicateDay')}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() =>
                  setProgram((p) => ({
                    ...p,
                    workouts: [
                      ...p.workouts,
                      {
                        ...structuredClone(w),
                        id: createId(),
                        name: `${w.name} – Copy`,
                        exercises: w.exercises.map((e) => ({ ...e, id: createId() })),
                      },
                    ],
                  }))
                }
              >
                <Copy size={18} />
              </button>
              <button
                aria-label={t('deleteWorkoutDay')}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() =>
                  setProgram((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== w.id) }))
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
            <fieldset className="my-3">
              <legend className="label">{t('daysOfWeek')}</legend>
              <div className="flex flex-wrap gap-2">
                {dayKeys.map((key, i) => {
                  const d = t(key);
                  const selected = w.scheduledDays.includes(i);
                  return (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={selected}
                    aria-label={t(selected ? 'deselectDay' : 'selectDay').replace('{day}', d)}
                    className={`chip min-h-11 cursor-pointer gap-2 border px-4 focus-visible:ring-2 focus-visible:ring-brand ${
                      selected ? 'border-brand bg-brand/25 text-slate-950 shadow-[inset_0_0_0_1px_rgba(183,243,107,.35)] dark:bg-brand/20 dark:text-brand' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[.04] dark:hover:bg-white/[.08]'
                    }`}
                    onClick={() =>
                      updateWorkout(w.id, (x) => {
                        x.scheduledDays = selected
                          ? x.scheduledDays.filter((value) => value !== i)
                          : [...x.scheduledDays, i].sort();
                      })
                    }
                  >
                    {selected && <Check aria-hidden="true" size={15} strokeWidth={3} />}
                    {d}
                  </button>
                )})}
              </div>
            </fieldset>
            <div className="space-y-3">
              {w.exercises
                .sort((a, b) => a.order - b.order)
                .map((we, i) => {
                  const e = exercises.find((x) => x.id === we.exerciseId);
                  return (
                    <div key={we.id} className="rounded-xl border border-line p-3">
                      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <b className="block break-words text-lg leading-tight">
                            {e ? getExerciseName(e, language) : t('exerciseUnavailable')}
                          </b>
                          {e && (
                            <ExerciseDemonstrationButton
                              exercise={e}
                              className="mt-2 min-h-11 max-w-full px-3 text-xs"
                            />
                          )}
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-1">
                          <button
                            aria-label={t('moveUp')}
                            className="icon-button h-11 w-11"
                            disabled={!i}
                            onClick={() => move(updateWorkout, w.id, i, -1)}
                          >
                            <ArrowUp />
                          </button>
                          <button
                            aria-label={t('moveDown')}
                            className="icon-button h-11 w-11"
                            disabled={i === w.exercises.length - 1}
                            onClick={() => move(updateWorkout, w.id, i, 1)}
                          >
                            <ArrowDown />
                          </button>
                          <button
                            aria-label={t('removeExercise')}
                            className="icon-button h-11 w-11 text-red-400"
                            onClick={() =>
                              updateWorkout(w.id, (x) => {
                                x.exercises = x.exercises
                                  .filter((v) => v.id !== we.id)
                                  .map((v, n) => ({ ...v, order: n }));
                              })
                            }
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                      <TargetFields
                        we={we}
                        exercise={e}
                        values={{
                          targetSets: numericValue(we, 'targetSets'),
                          targetMin: numericValue(we, 'targetMin'),
                          targetMax: numericValue(we, 'targetMax'),
                          targetAddedWeightKg: numericValue(we, 'targetAddedWeightKg'),
                          restSeconds: numericValue(we, 'restSeconds'),
                        }}
                        errors={numericErrors}
                        draftKey={(field) => draftKey(we.id, field)}
                        updateNumeric={(field, raw, minimum) => updateNumeric(w.id, we, field, raw, minimum)}
                        update={(patch) =>
                          updateWorkout(w.id, (x) => {
                            x.exercises = x.exercises.map((v) =>
                              v.id === we.id ? { ...v, ...patch } : v,
                            );
                          })
                        }
                      />
                    </div>
                  );
                })}
            </div>
            <button className="btn-secondary mt-3" onClick={() => setChooser(w.id)}>
              <Plus />
              {t('addExercise')}
            </button>
            {chooser === w.id && (
              <ExercisePicker
                exercises={exercises}
                onClose={() => setChooser(null)}
                onSelect={(exerciseId) => addExercise(w.id, exerciseId)}
                onCreate={(exercise) => {
                  addCustomExercise(exercise);
                  addExercise(w.id, exercise.id);
                }}
              />
            )}
            </div>}
          </section>
        )})}
        <button className="btn-secondary w-full" onClick={addDay}>
          <Plus />
          {t('addWorkoutDay')}
        </button>
      </div>
      {!program.workouts.length && (
        <p className="mt-3 text-center text-slate-400">
          {t('addAtLeastOneWorkout')}
        </p>
      )}
      {unsaved.dialog}
    </>
  );
}

function ExercisePicker({
  exercises,
  onClose,
  onSelect,
  onCreate,
}: {
  exercises: Exercise[];
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
  onCreate: (exercise: Exercise) => void;
}) {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('All');
  const [category, setCategory] = useState<'all' | ExerciseCategory>('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');
  const [customForm, setCustomForm] = useState(false);
  const families = useMemo(
    () => ['All', ...Array.from(new Set(exercises.map((exercise) => exercise.movementFamily ?? 'Other'))).sort()],
    [exercises],
  );
  const results = useMemo(
    () =>
      searchExercises(exercises, query).filter(
        (exercise) =>
          (family === 'All' || exercise.movementFamily === family) &&
          (category === 'all' || exercise.category === category) &&
          (difficulty === 'all' || exercise.difficulty === difficulty),
      ),
    [category, difficulty, exercises, family, query],
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chooseExercise')}
      className="fixed inset-0 z-40 flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-4"
    >
      <div className="modal-surface max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] sm:max-w-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/[.06]">
          <div>
            <p className="eyebrow">{t('exerciseLibrary')}</p>
            <h2 className="text-2xl font-black">{t('addMovement')}</h2>
          </div>
          <button aria-label={t('closeExercisePicker')} className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        {customForm ? (
          <CustomExerciseForm
            initialName={query}
            onCancel={() => setCustomForm(false)}
            onSave={onCreate}
          />
        ) : (
          <>
            <div className="space-y-3 p-4">
              <label className="relative block">
                <span className="sr-only">{t('searchExercises')}</span>
                <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                <input
                  autoFocus
                  className="field min-h-12 pl-12"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search squats, dips, handstands..."
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {families.map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={family === item}
                    className={`chip min-h-10 shrink-0 ${family === item ? 'bg-brand text-ink' : ''}`}
                    onClick={() => setFamily(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select label={t('filterByCategory')} value={category} onChange={(value) => setCategory(value as typeof category)} options={[
                  { value: 'all', label: t('allCategories') },
                  ...['push', 'pull', 'legs', 'core', 'mobility', 'skill'].map((value) => ({ value, label: value })),
                ]} />
                <Select label={t('filterByDifficulty')} value={difficulty} onChange={(value) => setDifficulty(value as typeof difficulty)} options={[
                  { value: 'all', label: t('allLevels') },
                  { value: 'beginner', label: t('beginner') },
                  { value: 'intermediate', label: t('intermediate') },
                  { value: 'advanced', label: t('advanced') },
                ]} />
              </div>
            </div>
            <div className="max-h-[50dvh] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <p className="mb-2 text-xs font-bold text-slate-500">{t('movementsFound').replace('{count}', String(results.length))}</p>
              <div className="space-y-2">
                {results.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="surface-subtle flex min-h-16 w-full items-center justify-between rounded-2xl p-4 text-left hover:bg-slate-200 dark:hover:bg-white/[.08]"
                    onClick={() => onSelect(exercise.id)}
                  >
                    <span>
                      <strong className="block">{getExerciseName(exercise, language)}</strong>
                      <small className="text-slate-500">
                        {exercise.movementFamily} · {exercise.difficulty}
                      </small>
                    </span>
                    {exercise.isCustom && <span className="chip">{t('custom')}</span>}
                  </button>
                ))}
              </div>
              {query.trim() && (
                <button className="btn-primary mt-3 w-full" onClick={() => setCustomForm(true)}>
                  <Plus />
                  {t('createCustomNamed').replace('{name}', query.trim())}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CustomExerciseForm({
  initialName,
  onCancel,
  onSave,
}: {
  initialName: string;
  onCancel: () => void;
  onSave: (exercise: Exercise) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('reps');
  const [movementFamily, setMovementFamily] = useState('Custom');
  const [category, setCategory] = useState<ExerciseCategory>('skill');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [muscles, setMuscles] = useState('');
  const [notes, setNotes] = useState('');
  const save = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: createId(),
      nameHe: name.trim(),
      nameEn: name.trim(),
      movementFamily: movementFamily.trim() || 'Custom',
      category,
      difficulty,
      measurementType,
      muscles: muscles.split(',').map((item) => item.trim()).filter(Boolean),
      aliases: [],
      keywords: [movementFamily, notes].filter(Boolean),
      progressionOrder: 0,
      description: notes || 'Custom exercise',
      instructions: ['Perform with control through a comfortable range'],
      commonMistakes: [],
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    });
  };
  return (
    <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <label className="block">
        <span className="label">{t('exerciseName')}</span>
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('measurementType')} value={measurementType} onChange={(value) => setMeasurementType(value as MeasurementType)} options={[{ value: 'reps', label: t('repetitionsMeasurement') }, { value: 'duration', label: t('durationMeasurement') }, { value: 'weighted_reps', label: t('weightedRepsMeasurement') }]} />
        <Select label={t('difficulty')} value={difficulty} onChange={(value) => setDifficulty(value as Difficulty)} options={[{ value: 'beginner', label: t('beginner') }, { value: 'intermediate', label: t('intermediate') }, { value: 'advanced', label: t('advanced') }]} />
      </div>
      <label className="block"><span className="label">{t('movementFamily')}</span><input className="field" value={movementFamily} onChange={(event) => setMovementFamily(event.target.value)} /></label>
      <Select label={t('category')} value={category} onChange={(value) => setCategory(value as ExerciseCategory)} options={['push', 'pull', 'legs', 'core', 'mobility', 'skill'].map((value) => ({ value, label: value }))} />
      <label className="block"><span className="label">{t('targetMuscles')}</span><input className="field" value={muscles} onChange={(event) => setMuscles(event.target.value)} /></label>
      <label className="block"><span className="label">{t('notes')}</span><textarea className="field" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary" onClick={onCancel}>{t('back')}</button>
        <button className="btn-primary" disabled={!name.trim()} onClick={save}>{t('saveAndAdd')}</button>
      </div>
    </div>
  );
}
function TargetFields({
  we,
  exercise,
  values,
  errors,
  draftKey,
  updateNumeric,
  update,
}: {
  we: WorkoutExercise;
  exercise?: Exercise;
  values: Record<NumericField, string>;
  errors: Record<string, string>;
  draftKey: (field: NumericField) => string;
  updateNumeric: (field: NumericField, raw: string, minimum: number) => void;
  update: (p: Partial<WorkoutExercise>) => void;
}) {
  const { t } = useI18n();
  const measurementType = we.measurementType ?? exercise?.measurementType ?? 'reps';
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <CompactNumber
        label={t('sets')}
        value={values.targetSets}
        set={(value) => updateNumeric('targetSets', value, 1)}
        fieldKey={draftKey('targetSets')}
        error={errors[draftKey('targetSets')]}
      />
      <CompactRange
        label={measurementType === 'duration' ? t('targetHold') : t('targetReps')}
        minimum={values.targetMin}
        maximum={values.targetMax}
        unit={measurementType === 'duration' ? t('seconds') : undefined}
        setMinimum={(value) => updateNumeric('targetMin', value, 1)}
        setMaximum={(value) => updateNumeric('targetMax', value, 1)}
        minimumKey={draftKey('targetMin')}
        maximumKey={draftKey('targetMax')}
        error={errors[draftKey('targetMin')] || errors[draftKey('targetMax')]}
      />
      {measurementType === 'weighted_reps' && (
        <CompactNumber
          label={t('addedWeight')}
          value={values.targetAddedWeightKg}
          set={(value) => updateNumeric('targetAddedWeightKg', value, 0)}
          min={0}
          step={0.5}
          unit={t('kilogramsShort')}
          fieldKey={draftKey('targetAddedWeightKg')}
          error={errors[draftKey('targetAddedWeightKg')]}
        />
      )}
      <CompactNumber
        label={t('rest')}
        value={values.restSeconds}
        set={(value) => updateNumeric('restSeconds', value, 0)}
        min={0}
        unit={t('seconds')}
        fieldKey={draftKey('restSeconds')}
        error={errors[draftKey('restSeconds')]}
      />
      <label className="md:col-span-2">
        <span className="label normal-case">{t('note')}</span>
        <input
          className="field"
          value={we.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
function CompactNumber({
  label,
  value,
  set,
  fieldKey,
  error,
  min = 1,
  step = 1,
  unit,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  fieldKey: string;
  error?: string;
  min?: number;
  step?: number;
  unit?: string;
}) {
  const errorId = `${fieldKey}-error`;
  return (
    <label className="min-w-0">
      <span className="label normal-case">{label}</span>
      <span className="control-shell surface-subtle flex min-h-12 min-w-0 items-center rounded-2xl px-3">
        <input
          type="number"
          min={min}
          step={step}
          inputMode={step < 1 ? 'decimal' : 'numeric'}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          data-numeric-key={fieldKey}
          className="control-input min-w-0 flex-1 bg-transparent px-2 py-2 text-center text-lg font-black outline-none"
          value={value}
          onChange={(event) => set(event.target.value)}
        />
        {unit && <bdi className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-500">{unit}</bdi>}
      </span>
      {error && <span id={errorId} className="mt-1 block text-sm font-bold text-red-500">{error}</span>}
    </label>
  );
}
function CompactRange({
  label,
  minimum,
  maximum,
  unit,
  setMinimum,
  setMaximum,
  minimumKey,
  maximumKey,
  error,
}: {
  label: string;
  minimum: string;
  maximum: string;
  unit?: string;
  setMinimum: (value: string) => void;
  setMaximum: (value: string) => void;
  minimumKey: string;
  maximumKey: string;
  error?: string;
}) {
  const { t } = useI18n();
  const errorId = `${minimumKey}-error`;
  return (
    <fieldset className="min-w-0">
      <legend className="label normal-case">{label}</legend>
      <div
        dir="ltr"
        className="control-shell surface-subtle flex min-h-12 min-w-0 items-center gap-2 rounded-2xl px-3"
      >
        <input
          aria-label={`${label} ${t('minimum')}`}
          type="number"
          min="1"
          inputMode="numeric"
          data-numeric-key={minimumKey}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="control-input min-w-0 flex-1 bg-transparent px-1 py-2 text-center text-lg font-black outline-none focus:bg-brand/[.06]"
          value={minimum}
          onChange={(event) => setMinimum(event.target.value)}
        />
        <span aria-hidden="true" className="shrink-0 text-slate-500">–</span>
        <input
          aria-label={`${label} ${t('maximum')}`}
          type="number"
          min="1"
          inputMode="numeric"
          data-numeric-key={maximumKey}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="control-input min-w-0 flex-1 bg-transparent px-1 py-2 text-center text-lg font-black outline-none focus:bg-brand/[.06]"
          value={maximum}
          onChange={(event) => setMaximum(event.target.value)}
        />
        {unit && <bdi className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-500">{unit}</bdi>}
      </div>
      {error && <span id={errorId} className="mt-1 block text-sm font-bold text-red-500">{error}</span>}
    </fieldset>
  );
}
function move(
  update: (id: string, fn: (w: WorkoutTemplate) => void) => void,
  wid: string,
  index: number,
  delta: number,
) {
  update(wid, (w) => {
    const a = w.exercises.sort((x, y) => x.order - y.order),
      b = index + delta;
    [a[index], a[b]] = [a[b], a[index]];
    w.exercises = a.map((x, i) => ({ ...x, order: i }));
  });
}
