import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Exercise } from '../types';
import type { ManagedProgramWeek, ManagedProgramWorkoutDay } from '../features/programs/managedProgram';
import { getExerciseName } from '../utils/exerciseLocalization';
import { Badge } from './ui';

export function ManagedWorkoutPreviewDialog({
  week,
  workout,
  exercises,
  language,
  onClose,
}: {
  week: ManagedProgramWeek;
  workout: ManagedProgramWorkoutDay;
  exercises: Exercise[];
  language: 'en' | 'he';
  onClose: () => void;
}) {
  const l = (en: string, he: string) => language === 'he' ? he : en;
  const exerciseByKey = new Map(exercises.map((exercise) => [exercise.stableKey, exercise]));
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="managed-workout-preview-title" className="modal-surface max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-3xl sm:rounded-[2rem] sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div><p className="eyebrow">{l('Workout preview', 'תצוגת אימון')}</p><h2 id="managed-workout-preview-title" className="mt-1 text-2xl font-black" dir="auto">{language === 'he' ? workout.nameHe : workout.nameEn}</h2><p className="mt-1 text-sm text-slate-500" dir="auto">{language === 'he' ? week.nameHe : week.nameEn}</p></div>
        <button type="button" className="icon-button" aria-label={l('Close preview', 'סגירת התצוגה')} onClick={onClose}><X aria-hidden size={20} /></button>
      </div>
      {(language === 'he' ? workout.goalHe : workout.goalEn) && <p className="mt-4 text-slate-600 dark:text-slate-300">{language === 'he' ? workout.goalHe : workout.goalEn}</p>}
      <div className="mt-5 grid gap-4">
        {workout.sections.map((section) => <section key={section.key} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black" dir="auto">{language === 'he' ? section.nameHe : section.nameEn}</h3><Badge>{section.requiredForSuccess ? l('Required', 'חובה') : l('Optional', 'רשות')}</Badge></div>
          {(language === 'he' ? section.guidanceHe : section.guidanceEn) && <p className="mt-2 text-sm text-slate-500">{language === 'he' ? section.guidanceHe : section.guidanceEn}</p>}
          <div className="mt-3 grid gap-3">{section.exercises.map((prescription) => {
            const exercise = exerciseByKey.get(prescription.exerciseKey);
            const target = prescription.targetMin === prescription.targetMax ? `${prescription.targetMin}` : `${prescription.targetMin}–${prescription.targetMax}`;
            const unit = exercise?.measurementType === 'duration' ? l('sec', 'שניות') : l('reps', 'חזרות');
            return <article key={prescription.key} className="surface-subtle rounded-xl p-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><strong dir="auto">{exercise ? getExerciseName(exercise, language) : prescription.exerciseKey}</strong>{!prescription.required && <Badge>{l('Optional', 'רשות')}</Badge>}</div>
              <p className="mt-1 text-sm"><bdi>{prescription.sets} × {target} {unit}{prescription.addedWeightKg !== undefined ? ` · +${prescription.addedWeightKg} kg` : ''}</bdi>{prescription.perSide ? ` · ${l('each side', 'לכל צד')}` : ''}</p>
              <p className="mt-1 text-sm text-slate-500">{prescription.restSeconds > 0 ? <bdi>{prescription.restSeconds} {l('sec rest', 'שניות מנוחה')}</bdi> : l('No rest', 'ללא מנוחה')}</p>
              {(language === 'he' ? prescription.notesHe : prescription.notes) && <p className="mt-2 text-sm text-slate-500">{language === 'he' ? prescription.notesHe : prescription.notes}</p>}
              {(language === 'he' ? prescription.techniqueCueHe : prescription.techniqueCue) && <p className="mt-1 text-sm font-semibold">{language === 'he' ? prescription.techniqueCueHe : prescription.techniqueCue}</p>}
            </article>;
          })}</div>
        </section>)}
      </div>
      <button type="button" className="btn-primary mt-5 w-full" onClick={onClose}>{l('Close preview', 'סגירת התצוגה')}</button>
    </section>
  </div>;
}
