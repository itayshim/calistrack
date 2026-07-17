import { Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../hooks/useI18n';
import { getExerciseName } from '../utils/exerciseLocalization';
import {
  getSetAddedWeight,
  getSetDuration,
  getSetReps,
  normalizeMeasurementType,
} from '../utils/performance';
export function HistoryDetailPage() {
  const { t, language } = useI18n();
  const { id } = useParams(),
    original = useAppStore((s) => s.workoutSessions.find((x) => x.id === id)),
    store = useAppStore(),
    nav = useNavigate(),
    [session, setSession] = useState(() => (original ? structuredClone(original) : null)),
    [remove, setRemove] = useState(false);
  if (!session) return <div className="card">{t('workoutNotFound')}</div>;
  return (
    <>
      <div className="flex justify-between">
        <div>
          <h1 className="page-title mb-1">{session.workoutName}</h1>
          <p className="mb-5 text-slate-400">
            {new Date(session.completedAt ?? session.startedAt).toLocaleString(language === 'he' ? 'he-IL' : 'en-US')}
          </p>
        </div>
        <button
          aria-label={t('workoutDeleted')}
          className="btn-danger h-fit"
          onClick={() => setRemove(true)}
        >
          <Trash2 />
        </button>
      </div>
      <div className="space-y-4">
        {session.exercises.map((es, ei) => {
          const ex = store.exercises.find((e) => e.id === es.exerciseId);
          const measurementType = normalizeMeasurementType(
            es.measurementType ?? es.target?.measurementType ?? ex?.measurementType,
          );
          return (
            <section className="card" key={es.id}>
              <div className="flex justify-between">
                <h2 className="text-xl font-black">{ex ? getExerciseName(ex, language) : t('exerciseUnavailable')}</h2>
                {es.skipped && <span>{t('skipped')}</span>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {es.sets.map((st, si) => (
                  <label key={st.id}>
                    <span className="label">{t('set')} <bdi>{st.setNumber}</bdi></span>
                    <HistoryMetricInput
                      label={measurementType === 'duration' ? t('holdTime') : t('repetitionsMeasurement')}
                      value={measurementType === 'duration' ? getSetDuration(st, measurementType) ?? 0 : getSetReps(st, measurementType) ?? 0}
                      unit={measurementType === 'duration' ? t('seconds') : t('reps')}
                      onChange={(value) => setSession((current) => {
                        if (!current) return current;
                        const next = structuredClone(current);
                        if (measurementType === 'duration') next.exercises[ei].sets[si].durationSeconds = value;
                        else next.exercises[ei].sets[si].reps = value;
                        delete next.exercises[ei].sets[si].value;
                        return next;
                      })}
                    />
                    {measurementType === 'weighted_reps' && (
                      <HistoryMetricInput
                        label={t('addedWeightKg')}
                        value={getSetAddedWeight(st) ?? 0}
                        unit="kg"
                        step={0.5}
                        onChange={(value) => setSession((current) => {
                          if (!current) return current;
                          const next = structuredClone(current);
                          next.exercises[ei].sets[si].addedWeightKg = value;
                          return next;
                        })}
                      />
                    )}
                  </label>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="label">{t('notes')}</span>
                <textarea
                  className="field"
                  value={es.notes ?? ''}
                  onChange={(e) =>
                    setSession((s) => {
                      if (!s) return s;
                      const n = structuredClone(s);
                      n.exercises[ei].notes = e.target.value;
                      return n;
                    })
                  }
                />
              </label>
            </section>
          );
        })}
        <section className="card">
          <label>
            <span className="label">{t('generalNotes')}</span>
            <textarea
              className="field"
              value={session.notes ?? ''}
              onChange={(e) => setSession({ ...session, notes: e.target.value })}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Rate
              label={t('difficulty')}
              value={session.difficultyRating ?? 3}
              set={(v) => setSession({ ...session, difficultyRating: v })}
            />
            <Rate
              label={t('feelingQuestion')}
              value={session.feelingRating ?? 3}
              set={(v) => setSession({ ...session, feelingRating: v })}
            />
          </div>
        </section>
        <button
          className="btn-primary w-full"
          onClick={() => {
            store.updateSession(session);
            store.setToast(t('changesSaved'));
            nav('/history');
          }}
        >
          <Save />
          {t('saveChanges')}
        </button>
      </div>
      <ConfirmDialog
        open={remove}
        title={t('deleteWorkout')}
        description={t('deleteWorkoutDescription')}
        onClose={() => setRemove(false)}
        onConfirm={() => {
          store.deleteSession(session.id);
          nav('/history');
        }}
      />
    </>
  );
}
function Rate({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="field" value={value} onChange={(e) => set(+e.target.value)}>
        {[1, 2, 3, 4, 5].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function HistoryMetricInput({ label, value, unit, onChange, step = 1 }: { label: string; value: number; unit: string; onChange: (value: number) => void; step?: number }) {
  return (
    <span className="mt-1 flex items-center gap-2">
      <input
        aria-label={label}
        className="field"
        type="number"
        min="0"
        step={step}
        inputMode={step < 1 ? 'decimal' : 'numeric'}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
      />
      <span className="whitespace-nowrap text-sm text-slate-500">{unit}</span>
    </span>
  );
}
