import { Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAppStore } from '../store/useAppStore';
import type { Difficulty, ExerciseCategory, MeasurementType } from '../types';
import { createId } from '../utils/id';
const categories: Record<string, string> = {
  all: 'All',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
  mobility: 'Mobility',
  skill: 'Skill',
};
const difficulties: Record<string, string> = {
  all: 'All levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
export function ExercisesPage() {
  const exercises = useAppStore((s) => s.exercises),
    add = useAppStore((s) => s.addExercise),
    del = useAppStore((s) => s.deleteExercise);
  const [q, setQ] = useState(''),
    [cat, setCat] = useState('all'),
    [diff, setDiff] = useState('all'),
    [measure, setMeasure] = useState('all'),
    [form, setForm] = useState(false),
    [remove, setRemove] = useState<string | null>(null);
  const list = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (e.nameHe.includes(q) || e.nameEn.toLowerCase().includes(q.toLowerCase())) &&
          (cat === 'all' || e.category === cat) &&
          (diff === 'all' || e.difficulty === diff) &&
          (measure === 'all' || e.measurementType === measure),
      ),
    [exercises, q, cat, diff, measure],
  );
  return (
    <>
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="eyebrow">MOVEMENT LIBRARY</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">Exercises</h1>
          <p className="mt-2 text-slate-400">Explore. Learn. Get stronger.</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(true)}>
          <Plus />
          Custom exercise
        </button>
      </div>
      <div className="mb-5 grid gap-3 rounded-3xl bg-white/[.035] p-4 md:grid-cols-4">
        <label>
          <span className="label">Search</span>
          <span className="relative block">
            <Search className="absolute right-3 top-2.5" size={20} />
            <input
              className="field pr-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name"
            />
          </span>
        </label>
        <Filter label="Category" value={cat} set={setCat} options={categories} />
        <Filter label="Difficulty" value={diff} set={setDiff} options={difficulties} />
        <Filter
          label="Measurement"
          value={measure}
          set={setMeasure}
          options={{ all: 'All', reps: 'Reps', time: 'Time' }}
        />
      </div>
      <p className="mb-3 text-sm text-slate-400">Found {list.length} exercises</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => (
          <article
            key={e.id}
            className="card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="flex justify-between">
              <span className="chip">{categories[e.category]}</span>
              {e.isCustom && (
                <button
                  aria-label={`Delete ${e.nameEn}`}
                  onClick={() => setRemove(e.id)}
                  className="text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <Link to={`/exercises/${e.id}`}>
              <div className="mb-5 mt-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-2xl font-black text-brand">
                {e.nameEn.slice(0, 1)}
              </div>
              <h2 className="mt-3 text-xl font-black tracking-tight group-hover:text-brand">
                {e.nameEn}
              </h2>
              <p dir="ltr" className="text-left text-sm text-slate-400">
                {e.nameEn}
              </p>
              <p className="mt-3 line-clamp-2">{e.description}</p>
              <div className="mt-3 flex gap-2 text-sm">
                <span>{difficulties[e.difficulty]}</span>
                <span>·</span>
                <span>{e.measurementType === 'reps' ? 'Reps' : 'seconds'}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
      {!list.length && (
        <div className="card py-10 text-center">No exercises found. Try changing the filters.</div>
      )}
      {form && (
        <ExerciseForm
          onClose={() => setForm(false)}
          onSave={(x) => {
            add(x);
            setForm(false);
          }}
        />
      )}
      <ConfirmDialog
        open={!!remove}
        title="Delete exercise?"
        description="The custom exercise will be removed from the library. Workout history will remain saved."
        onClose={() => setRemove(null)}
        onConfirm={() => remove && del(remove)}
      />
    </>
  );
}
function Filter({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="field" value={value} onChange={(e) => set(e.target.value)}>
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function ExerciseForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (e: ReturnType<typeof makeExercise>) => void;
}) {
  const [nameHe, setHe] = useState(''),
    [nameEn, setEn] = useState(''),
    [category, setCat] = useState<ExerciseCategory>('push'),
    [difficulty, setDiff] = useState<Difficulty>('beginner'),
    [measurementType, setM] = useState<MeasurementType>('reps'),
    [error, setError] = useState('');
  const save = () => {
    if (!nameHe.trim() || !nameEn.trim()) {
      setError('Please enter an exercise name');
      return;
    }
    onSave(makeExercise(nameHe, nameEn, category, difficulty, measurementType));
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create custom exercise"
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
    >
      <div className="card w-full max-w-lg">
        <h2 className="mb-4 text-xl font-black">New custom exercise</h2>
        <div className="space-y-3">
          <label>
            <span className="label">Exercise name</span>
            <input className="field" value={nameEn} onChange={(e) => setHe(e.target.value)} />
          </label>
          <label>
            <span className="label">English name</span>
            <input
              dir="ltr"
              className="field"
              value={nameEn}
              onChange={(e) => setEn(e.target.value)}
            />
          </label>
          <Filter
            label="Category"
            value={category}
            set={(v) => setCat(v as ExerciseCategory)}
            options={categories}
          />
          <Filter
            label="Difficulty"
            value={difficulty}
            set={(v) => setDiff(v as Difficulty)}
            options={difficulties}
          />
          <Filter
            label="Measurement type"
            value={measurementType}
            set={(v) => setM(v as MeasurementType)}
            options={{ reps: 'Reps', time: 'Time in seconds' }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-red-400">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn-primary" onClick={save}>
            Save
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
const makeExercise = (
  nameHe: string,
  nameEn: string,
  category: ExerciseCategory,
  difficulty: Difficulty,
  measurementType: MeasurementType,
) => ({
  id: createId(),
  nameHe,
  nameEn,
  category,
  difficulty,
  muscles: [category],
  measurementType,
  description: 'Custom exercise',
  instructions: ['Perform with control through a comfortable range'],
  commonMistakes: ['Moving too quickly'],
  isCustom: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
