import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { Program, WorkoutExercise, WorkoutTemplate } from '../types';
import { createId } from '../utils/id';
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function ProgramEditorPage() {
  const { id } = useParams(),
    existing = useAppStore((s) => s.programs.find((p) => p.id === id)),
    exercises = useAppStore((s) => s.exercises),
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
    updateWorkout(wid, (w) =>
      w.exercises.push({
        id: createId(),
        exerciseId: eid,
        order: w.exercises.length,
        targetSets: 3,
        targetMin: 8,
        targetMax: 12,
        restSeconds: 75,
      }),
    );
    setChooser(null);
  };
  const valid = program.name.trim() && program.workouts.length > 0;
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="page-title">{existing ? 'Edit program' : 'New program'}</h1>
        <button
          disabled={!valid}
          className="btn-primary"
          onClick={() => {
            save({ ...program, updatedAt: new Date().toISOString() });
            nav('/program');
          }}
        >
          <Save />
          Save
        </button>
      </div>
      <label className="card mb-4 block">
        <span className="label">Program name</span>
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
                aria-label="Workout day name"
                className="field text-lg font-black"
                value={w.name}
                onChange={(e) =>
                  updateWorkout(w.id, (x) => {
                    x.name = e.target.value;
                  })
                }
              />
              <button
                aria-label="Duplicate day"
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
              <legend className="label">Days of the week</legend>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((d, i) => (
                  <label
                    key={d}
                    className={`chip cursor-pointer ${w.scheduledDays.includes(i) ? 'border-brand bg-brand/10' : ''}`}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={w.scheduledDays.includes(i)}
                      onChange={() =>
                        updateWorkout(w.id, (x) => {
                          x.scheduledDays = x.scheduledDays.includes(i)
                            ? x.scheduledDays.filter((v) => v !== i)
                            : [...x.scheduledDays, i];
                        })
                      }
                    />
                    {d}
                  </label>
                ))}
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
                        <b>{e?.nameEn ?? 'Exercise unavailable'}</b>
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
              <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-line p-2">
                <input
                  className="field mb-2"
                  placeholder="Search exercises"
                  autoFocus
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    document
                      .querySelectorAll<HTMLElement>('[data-ex-name]')
                      .forEach((x) => (x.hidden = !x.dataset.exName?.includes(q)));
                  }}
                />
                {exercises.map((e) => (
                  <button
                    data-ex-name={`${e.nameEn} ${e.nameEn.toLowerCase()}`}
                    key={e.id}
                    className="block w-full rounded-lg p-2 text-left hover:bg-brand/10"
                    onClick={() => addExercise(w.id, e.id)}
                  >
                    {e.nameEn} <span className="text-sm text-slate-400">{e.nameEn}</span>
                  </button>
                ))}
              </div>
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
function TargetFields({
  we,
  update,
}: {
  we: WorkoutExercise;
  update: (p: Partial<WorkoutExercise>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <Num label="Sets" value={we.targetSets} set={(v) => update({ targetSets: v })} />
      <Num label="Minimum" value={we.targetMin} set={(v) => update({ targetMin: v })} />
      <Num label="Maximum" value={we.targetMax} set={(v) => update({ targetMax: v })} />
      <Num label="Rest (seconds)" value={we.restSeconds} set={(v) => update({ restSeconds: v })} />
      <label>
        <span className="label">Note</span>
        <input
          className="field"
          value={we.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
function Num({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        type="number"
        min="1"
        className="field"
        value={value}
        onChange={(e) => set(Math.max(1, +e.target.value))}
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
