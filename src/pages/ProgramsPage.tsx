import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge, EmptyState, ProgressBar } from '../components/ui';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';
import { ActionMenu } from '../components/SelectMenu';

export function ProgramsPage() {
  const { t } = useI18n();
  const programs = useAppStore((s) => s.programs);
  const activeProgramId = useAppStore((s) => s.activeProgramId);
  const adopt = useAppStore((s) => s.adoptBeginner);
  const start = useAppStore((s) => s.startWorkout);
  const renameProgram = useAppStore((s) => s.renameProgram);
  const duplicateProgram = useAppStore((s) => s.duplicateProgram);
  const setActiveProgram = useAppStore((s) => s.setActiveProgram);
  const deleteProgram = useAppStore((s) => s.deleteProgram);
  const nav = useNavigate();
  const [renameTarget, setRenameTarget] = useState<Program | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const launch = (workout: Program['workouts'][number]) => {
    start(workout);
    nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const openRename = (program: Program) => {
    setRenameTarget(program);
    setRenameValue(program.name);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t('programEyebrow')}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('program')}</h1>
          <p className="mt-2 text-slate-400">{t('programSubtitle')}</p>
        </div>
        <Link aria-label={t('createProgram')} to="/program/new" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-ink shadow-glow">
          <Plus size={26} />
        </Link>
      </header>

      {!programs.length ? (
        <>
          <section className="relative overflow-hidden rounded-4xl bg-brand p-7 text-ink shadow-glow">
            <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
            <Badge>{t('recommendedStart')}</Badge>
            <h2 className="mt-6 text-4xl font-black tracking-[-.05em]">{t('beginnerProgramName')}</h2>
            <p className="mt-3 max-w-lg font-semibold opacity-70">{t('beginnerProgramDescription')}</p>
            <button className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 font-black text-white sm:w-auto" onClick={adopt}>
              <Copy size={18} />{t('useProgram')}
            </button>
          </section>
          <EmptyState icon={<Dumbbell size={34} />} title={t('preferOwnStructure')} description={t('customProgramDescription')} action={t('createCustomProgram')} onAction={() => nav('/program/new')} />
        </>
      ) : (
        programs.map((program) => (
          <section key={program.id}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone={program.id === activeProgramId ? 'brand' : 'neutral'}>
                  {program.id === activeProgramId ? t('activeProgram') : t('inactiveProgram')}
                </Badge>
                <h2 className="mt-2 break-words text-3xl font-black tracking-[-.04em]">{program.name}</h2>
              </div>
              <ActionMenu
                label={`${t('programActions')}: ${program.name}`}
                menuLabel={t('programActions')}
                trigger={<MoreHorizontal />}
                className="icon-button shrink-0"
                items={[
                  { id: 'edit', label: t('editProgramAction'), icon: <Pencil size={19} />, onSelect: () => nav(`/program/${program.id}`) },
                  { id: 'rename', label: t('renameProgram'), icon: <Pencil size={19} />, onSelect: () => openRename(program) },
                  { id: 'duplicate', label: t('duplicateProgram'), icon: <Copy size={19} />, onSelect: () => duplicateProgram(program.id) },
                  ...(program.id !== activeProgramId ? [{ id: 'activate', label: t('setActiveProgram'), icon: <CheckCircle2 size={19} />, onSelect: () => setActiveProgram(program.id) }] : []),
                  { id: 'delete', label: t('deleteProgram'), icon: <Trash2 size={19} />, destructive: true, onSelect: () => setDeleteTarget(program) },
                ]}
              />
            </div>
            <div className="space-y-3">
              {program.workouts.map((workout, index) => (
                <article key={workout.id} className="card p-0 transition hover:-translate-y-0.5">
                  <button onClick={() => launch(workout)} className="flex w-full items-center gap-4 p-5 text-start">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/15 text-lime-700 dark:bg-white/[.06] dark:text-brand">
                      <span className="text-xl font-black">{String.fromCharCode(65 + index)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-black">{workout.name}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
                        <CalendarDays size={14} /><span><bdi>{workout.exercises.length}</bdi> {t('exercisesCount')}</span>
                      </p>
                      <div className="mt-3"><ProgressBar value={0} label={`${workout.name} progress`} /></div>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-ink"><Play size={19} fill="currentColor" /></span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setRenameTarget(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="rename-program-title" className="modal-surface w-full max-w-sm rounded-4xl p-6">
            <h2 id="rename-program-title" className="text-2xl font-black">{t('renameProgramTitle')}</h2>
            <label className="mt-5 block">
              <span className="label">{t('programName')}</span>
              <input autoFocus className="field" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
              {!renameValue.trim() && <span className="mt-2 block text-sm font-bold text-red-500">{t('programNameRequired')}</span>}
            </label>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn-secondary" onClick={() => setRenameTarget(null)}>{t('cancel')}</button>
              <button className="btn-primary" disabled={!renameValue.trim()} onClick={() => {
                renameProgram(renameTarget.id, renameValue);
                setRenameTarget(null);
              }}>{t('save')}</button>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('deleteProgramTitle')}
        description={deleteTarget?.id === activeProgramId ? t('deleteActiveProgramDescription') : t('deleteProgramDescription')}
        confirmLabel={t('deleteProgram')}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteProgram(deleteTarget.id)}
      />
    </div>
  );
}
