import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Select } from '../components/SelectMenu';
import { useAppStore } from '../store/useAppStore';
import type { Difficulty, Exercise, ExerciseCategory, MeasurementType } from '../types';
import { createId } from '../utils/id';
import { searchExercises } from '../utils/exerciseSearch';
import { useI18n } from '../hooks/useI18n';
import { getExerciseName } from '../utils/exerciseLocalization';
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
    update = useAppStore((s) => s.updateExercise),
    del = useAppStore((s) => s.deleteExercise);
  const { language, t } = useI18n();
  const [q, setQ] = useState(''),
    [cat, setCat] = useState('all'),
    [diff, setDiff] = useState('all'),
    [measure, setMeasure] = useState('all'),
    [form, setForm] = useState(false),
    [edit, setEdit] = useState<string | null>(null),
    [remove, setRemove] = useState<string | null>(null);
  const list = useMemo(
    () =>
      searchExercises(exercises, q).filter(
        (e) =>
          (cat === 'all' || e.category === cat) &&
          (diff === 'all' || e.difficulty === diff) &&
          (measure === 'all' || e.measurementType === measure),
      ),
    [exercises, q, cat, diff, measure],
  );
  const groups = useMemo(
    () =>
      Array.from(new Set(list.map((exercise) => exercise.movementFamily ?? 'Other'))).map(
        (movementFamily) => ({
          movementFamily,
          exercises: list
            .filter((exercise) => (exercise.movementFamily ?? 'Other') === movementFamily)
            .sort((a, b) => (a.progressionOrder ?? 0) - (b.progressionOrder ?? 0)),
        }),
      ),
    [list],
  );
  return (
    <>
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="eyebrow">{t('movementLibrary')}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('exercises')}</h1>
          <p className="mt-2 text-slate-400">{t('exerciseLibrarySubtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(true)}>
          <Plus />
          {t('customExercise')}
        </button>
      </div>
      <div className="surface-subtle mb-5 grid gap-3 rounded-3xl p-4 md:grid-cols-4">
        <label>
          <span className="label">{t('search')}</span>
          <span className="relative block">
            <Search className="absolute end-3 top-2.5" size={20} />
            <input
              className="field pe-10"
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
          options={{
            all: t('all'),
            reps: t('repetitionsMeasurement'),
            duration: t('durationMeasurement'),
            weighted_reps: t('weightedRepsMeasurement'),
          }}
        />
      </div>
      <p className="mb-3 text-sm text-slate-400">Found {list.length} exercises</p>
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.movementFamily}>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="eyebrow">{t('movementFamilyLabel')}</p>
                <h2 className="text-2xl font-black">{group.movementFamily}</h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                <bdi>{group.exercises.length}</bdi> {t('progressions')}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.exercises.map((e) => (
          <article
            key={e.id}
            className="card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="flex justify-between">
              <span className="chip">{categories[e.category]}</span>
              {e.isCustom && (
                <div className="flex gap-2">
                  <button aria-label={`${t('editExerciseLabel')} ${getExerciseName(e, language)}`} onClick={() => setEdit(e.id)}><Pencil size={18} /></button>
                  <button aria-label={`${t('deleteExerciseLabel')} ${getExerciseName(e, language)}`} onClick={() => setRemove(e.id)} className="text-red-400"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
            <Link to={`/exercises/${e.id}`}>
              <div className="mb-5 mt-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-2xl font-black text-brand">
                {getExerciseName(e, language).slice(0, 1)}
              </div>
              <h2 className="mt-3 text-xl font-black tracking-tight group-hover:text-brand">
                {getExerciseName(e, language)}
              </h2>
              <p dir="ltr" className="text-left text-sm text-slate-400">
                {e.movementFamily}
              </p>
              <p className="mt-3 line-clamp-2">{e.description}</p>
              <div className="mt-3 flex gap-2 text-sm">
                <span>{difficulties[e.difficulty]}</span>
                <span>·</span>
                <span>
                  {e.measurementType === 'duration'
                    ? t('durationMeasurement')
                    : e.measurementType === 'weighted_reps'
                      ? t('weightedRepsMeasurement')
                      : t('repetitionsMeasurement')}
                </span>
              </div>
            </Link>
          </article>
        ))}
            </div>
          </section>
        ))}
      </div>
      {!list.length && (
        <div className="card py-10 text-center">{t('noExercisesFound')}</div>
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
      {edit && (
        <ExerciseForm
          initial={exercises.find((exercise) => exercise.id === edit)}
          onClose={() => setEdit(null)}
          onSave={(exercise) => {
            update(exercise);
            setEdit(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!remove}
        title={t('deleteExerciseQuestion')}
        description={t('deleteExerciseDescription')}
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
  return <Select label={label} value={value} onChange={set} options={Object.entries(options).map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel }))} />;
}
function ExerciseForm({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (e: Exercise) => void;
  initial?: Exercise;
}) {
  const { t } = useI18n();
  const [nameEn, setEn] = useState(initial?.nameEn ?? ''),
    [category, setCat] = useState<ExerciseCategory>(initial?.category ?? 'push'),
    [difficulty, setDiff] = useState<Difficulty>(initial?.difficulty ?? 'beginner'),
    [measurementType, setM] = useState<MeasurementType>(initial?.measurementType ?? 'reps'),
    [error, setError] = useState('');
  const save = () => {
    if (!nameEn.trim()) {
      setError(t('enterExerciseName'));
      return;
    }
    onSave(makeExercise(nameEn, category, difficulty, measurementType, initial));
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('createCustomExercise')}
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="card w-full max-w-lg">
        <h2 className="mb-4 text-xl font-black">{initial ? t('editCustomExercise') : t('newCustomExercise')}</h2>
        <div className="space-y-3">
          <label>
            <span className="label">{t('exerciseName')}</span>
            <input
              dir="ltr"
              className="field"
              value={nameEn}
              onChange={(e) => setEn(e.target.value)}
            />
          </label>
          <Filter
            label={t('category')}
            value={category}
            set={(v) => setCat(v as ExerciseCategory)}
            options={categories}
          />
          <Filter
            label={t('difficulty')}
            value={difficulty}
            set={(v) => setDiff(v as Difficulty)}
            options={difficulties}
          />
          <Filter
            label={t('measurementType')}
            value={measurementType}
            set={(v) => setM(v as MeasurementType)}
            options={{
              reps: t('repetitionsMeasurement'),
              duration: t('durationMeasurement'),
              weighted_reps: t('weightedRepsMeasurement'),
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-red-400">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn-primary" onClick={save}>
            {t('save')}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
const makeExercise = (
  nameEn: string,
  category: ExerciseCategory,
  difficulty: Difficulty,
  measurementType: MeasurementType,
  initial?: Exercise,
): Exercise => ({
  ...initial,
  id: initial?.id ?? createId(),
  nameHe: nameEn,
  nameEn,
  category,
  difficulty,
  muscles: [category],
  movementFamily: initial?.movementFamily ?? 'Custom',
  aliases: initial?.aliases ?? [],
  keywords: initial?.keywords ?? [category],
  progressionOrder: initial?.progressionOrder ?? 0,
  measurementType,
  description: 'Custom exercise',
  instructions: ['Perform with control through a comfortable range'],
  commonMistakes: ['Moving too quickly'],
  isCustom: true,
  createdAt: initial?.createdAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
