import { Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAppStore } from '../store/useAppStore';
export function HistoryDetailPage() {
  const { id } = useParams(),
    original = useAppStore((s) => s.workoutSessions.find((x) => x.id === id)),
    store = useAppStore(),
    nav = useNavigate(),
    [session, setSession] = useState(() => (original ? structuredClone(original) : null)),
    [remove, setRemove] = useState(false);
  if (!session) return <div className="card">Workout not found.</div>;
  return (
    <>
      <div className="flex justify-between">
        <div>
          <h1 className="page-title mb-1">{session.workoutName}</h1>
          <p className="mb-5 text-slate-400">
            {new Date(session.completedAt ?? session.startedAt).toLocaleString('en-US')}
          </p>
        </div>
        <button
          aria-label="Delete workout"
          className="btn-danger h-fit"
          onClick={() => setRemove(true)}
        >
          <Trash2 />
        </button>
      </div>
      <div className="space-y-4">
        {session.exercises.map((es, ei) => {
          const ex = store.exercises.find((e) => e.id === es.exerciseId);
          return (
            <section className="card" key={es.id}>
              <div className="flex justify-between">
                <h2 className="text-xl font-black">{ex?.nameEn ?? 'Deleted exercise'}</h2>
                {es.skipped && <span>Skipped</span>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {es.sets.map((st, si) => (
                  <label key={st.id}>
                    <span className="label">Set {st.setNumber}</span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      value={st.value}
                      onChange={(e) =>
                        setSession((s) => {
                          if (!s) return s;
                          const n = structuredClone(s);
                          n.exercises[ei].sets[si].value = +e.target.value;
                          return n;
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="label">Notes</span>
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
            <span className="label">General notes</span>
            <textarea
              className="field"
              value={session.notes ?? ''}
              onChange={(e) => setSession({ ...session, notes: e.target.value })}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Rate
              label="Difficulty"
              value={session.difficultyRating ?? 3}
              set={(v) => setSession({ ...session, difficultyRating: v })}
            />
            <Rate
              label="Feeling"
              value={session.feelingRating ?? 3}
              set={(v) => setSession({ ...session, feelingRating: v })}
            />
          </div>
        </section>
        <button
          className="btn-primary w-full"
          onClick={() => {
            store.updateSession(session);
            store.setToast('Changes saved and progress recalculated');
            nav('/history');
          }}
        >
          <Save />
          Save changes
        </button>
      </div>
      <ConfirmDialog
        open={remove}
        title="Delete workout"
        description="This affects charts and records and cannot be undone."
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
