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
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge, EmptyState, ProgressBar } from '../components/ui';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';

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
  const [menuProgram, setMenuProgram] = useState<Program | null>(null);
  const [renameTarget, setRenameTarget] = useState<Program | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const launch = (workout: Program['workouts'][number]) => {
    start(workout);
    nav(`/workout/${useAppStore.getState().activeWorkout?.id}`);
  };
  const openRename = (program: Program) => {
    setMenuProgram(null);
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
              <button
                type="button"
                aria-label={`${t('programActions')}: ${program.name}`}
                aria-haspopup="menu"
                aria-expanded={menuProgram?.id === program.id}
                className="icon-button shrink-0"
                onClick={() => setMenuProgram(program)}
              >
                <MoreHorizontal />
              </button>
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

      <ProgramActionSheet
        program={menuProgram}
        active={menuProgram?.id === activeProgramId}
        close={() => setMenuProgram(null)}
        edit={() => {
          if (!menuProgram) return;
          const id = menuProgram.id;
          setMenuProgram(null);
          nav(`/program/${id}`);
        }}
        rename={() => menuProgram && openRename(menuProgram)}
        duplicate={() => {
          if (menuProgram) duplicateProgram(menuProgram.id);
          setMenuProgram(null);
        }}
        activate={() => {
          if (menuProgram) setActiveProgram(menuProgram.id);
          setMenuProgram(null);
        }}
        remove={() => {
          setDeleteTarget(menuProgram);
          setMenuProgram(null);
        }}
      />

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

function ProgramActionSheet({
  program, active, close, edit, rename, duplicate, activate, remove,
}: {
  program: Program | null;
  active: boolean;
  close: () => void;
  edit: () => void;
  rename: () => void;
  duplicate: () => void;
  activate: () => void;
  remove: () => void;
}) {
  const { t } = useI18n();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!program) return;
    first.current?.focus();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && close();
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [close, program]);
  if (!program) return null;
  const actions = [
    { label: t('editProgramAction'), icon: Pencil, action: edit, ref: first },
    { label: t('renameProgram'), icon: Pencil, action: rename },
    { label: t('duplicateProgram'), icon: Copy, action: duplicate },
    ...(!active ? [{ label: t('setActiveProgram'), icon: CheckCircle2, action: activate }] : []),
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section role="menu" aria-label={t('programActions')} className="modal-surface max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-[2rem]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="eyebrow">{t('programActions')}</p><h2 className="truncate text-2xl font-black">{program.name}</h2></div>
          <button className="icon-button" aria-label={t('close')} onClick={close}><X /></button>
        </div>
        <div className="space-y-2">
          {actions.map(({ label, icon: Icon, action, ref }) => (
            <button ref={ref} role="menuitem" key={label} className="btn-secondary w-full justify-start" onClick={action}><Icon size={19} />{label}</button>
          ))}
          <button role="menuitem" className="btn-danger w-full justify-start" onClick={remove}><Trash2 size={19} />{t('deleteProgram')}</button>
        </div>
      </section>
    </div>
  );
}
