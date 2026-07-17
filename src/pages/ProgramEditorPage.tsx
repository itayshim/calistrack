import { ArrowDown, ArrowUp, Check, Copy, Plus, Search, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function ProgramEditorPage() {
  const { t, language } = useI18n();
  const { id } = useParams(),
    existing = useAppStore((s) => s.programs.find((p) => p.id === id)),
    exercises = useAppStore((s) => s.exercises),
    addCustomExercise = useAppStore((s) => s.addExercise),
    save = useAppStore((s) => s.saveProgram),
    nav = useNavigate();
  const now = new Date().toISOString();
  const [program, setProgram] = useState<Program>(() =>
    existing
      ? structuredClone(existing)
      : { id: createId(), name: 'My program', workouts: [], createdAt: now, updatedAt: now },
  );
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
  const addDay = () =>
    setProgram((p) => ({
      ...p,
      workouts: [
        ...p.workouts,
        {
          id: createId(),
          programId: p.id,
          name: `Workout ${String.fromCharCode(65 + p.workouts.length)}`,
          scheduledDays: [],
          exercises: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
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
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="page-title">{existing ? t('editProgram') : t('newProgram')}</h1>
        <button
          disabled={!valid}
          className="btn-primary"
          onClick={() => {
            save({ ...program, updatedAt: new Date().toISOString() });
            nav('/program');
          }}
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
      <div className="space-y-4">
        {program.workouts.map((w) => (
          <section className="card" key={w.id}>
            <div className="flex gap-2">
              <input
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
                className="btn-secondary"
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
                aria-label="Delete day"
                className="btn-danger"
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
                {dayNames.map((d, i) => {
                  const selected = w.scheduledDays.includes(i);
                  return (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={selected}
                    aria-label={`${selected ? 'Deselect' : 'Select'} ${d}`}
                    className={`chip min-h-11 cursor-pointer gap-2 px-4 focus-visible:ring-2 focus-visible:ring-brand ${
                      selected ? 'border-brand bg-brand text-ink' : 'border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[.04]'
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
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <b>{e ? getExerciseName(e, language) : t('exerciseUnavailable')}</b>
                          {e && (
                            <ExerciseDemonstrationButton
                              exercise={e}
                              className="min-h-10 px-3 text-xs"
                            />
                          )}
                        </div>
                        <div>
                          <button
                            aria-label="Move up"
                            disabled={!i}
                            onClick={() => move(updateWorkout, w.id, i, -1)}
                          >
                            <ArrowUp />
                          </button>
                          <button
                            aria-label="Move down"
                            disabled={i === w.exercises.length - 1}
                            onClick={() => move(updateWorkout, w.id, i, 1)}
                          >
                            <ArrowDown />
                          </button>
                          <button
                            aria-label="Remove exercise"
                            className="text-red-400"
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
              Add exercise
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
          </section>
        ))}
        <button className="btn-secondary w-full" onClick={addDay}>
          <Plus />
          Add workout day
        </button>
      </div>
      {!program.workouts.length && (
        <p className="mt-3 text-center text-slate-400">
          Add at least one workout day before saving.
        </p>
      )}
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
      aria-label="Choose exercise"
      className="fixed inset-0 z-40 flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-4"
    >
      <div className="modal-surface max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] sm:max-w-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/[.06]">
          <div>
            <p className="eyebrow">{t('exerciseLibrary')}</p>
            <h2 className="text-2xl font-black">{t('addMovement')}</h2>
          </div>
          <button aria-label="Close exercise picker" className="icon-button" onClick={onClose}>
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
                <select
                  aria-label="Filter by category"
                  className="field"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as typeof category)}
                >
                  <option value="all">{t('allCategories')}</option>
                  {['push', 'pull', 'legs', 'core', 'mobility', 'skill'].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by difficulty"
                  className="field"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
                >
                  <option value="all">{t('allLevels')}</option>
                  <option value="beginner">{t('beginner')}</option>
                  <option value="intermediate">{t('intermediate')}</option>
                  <option value="advanced">{t('advanced')}</option>
                </select>
              </div>
            </div>
            <div className="max-h-[50dvh] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <p className="mb-2 text-xs font-bold text-slate-500">{results.length} MOVEMENTS</p>
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
                  Create custom exercise: “{query.trim()}”
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
        <label><span className="label">{t('measurementType')}</span><select className="field" value={measurementType} onChange={(event) => setMeasurementType(event.target.value as MeasurementType)}><option value="reps">{t('repetitionsMeasurement')}</option><option value="duration">{t('durationMeasurement')}</option><option value="weighted_reps">{t('weightedRepsMeasurement')}</option></select></label>
        <label><span className="label">{t('difficulty')}</span><select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="beginner">{t('beginner')}</option><option value="intermediate">{t('intermediate')}</option><option value="advanced">{t('advanced')}</option></select></label>
      </div>
      <label className="block"><span className="label">{t('movementFamily')}</span><input className="field" value={movementFamily} onChange={(event) => setMovementFamily(event.target.value)} /></label>
      <label className="block"><span className="label">{t('category')}</span><select className="field" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory)}>{['push', 'pull', 'legs', 'core', 'mobility', 'skill'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
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
  update,
}: {
  we: WorkoutExercise;
  exercise?: Exercise;
  update: (p: Partial<WorkoutExercise>) => void;
}) {
  const { t } = useI18n();
  const measurementType = we.measurementType ?? exercise?.measurementType ?? 'reps';
  const targetLabel = measurementType === 'duration' ? t('targetDuration') : t('repetitions');
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <Num label={t('sets')} value={we.targetSets} set={(v) => update({ targetSets: v })} />
      <Num label={`${targetLabel} · ${t('minimum')}`} value={we.targetMin} set={(v) => update({ targetMin: v })} />
      <Num label={`${targetLabel} · ${t('maximum')}`} value={we.targetMax} set={(v) => update({ targetMax: v })} />
      {measurementType === 'weighted_reps' && (
        <Num
          label={t('targetAddedWeight')}
          value={we.targetAddedWeightKg ?? 0}
          set={(v) => update({ targetAddedWeightKg: v })}
          min={0}
          step={0.5}
        />
      )}
      <Num label={t('restSeconds')} value={we.restSeconds} set={(v) => update({ restSeconds: v })} />
      <label>
        <span className="label">{t('note')}</span>
        <input
          className="field"
          value={we.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
function Num({ label, value, set, min = 1, step = 1 }: { label: string; value: number; set: (v: number) => void; min?: number; step?: number }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        className="field"
        value={value}
        onChange={(e) => set(Math.max(min, +e.target.value))}
      />
    </label>
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
