import { PersonStanding } from 'lucide-react';
import type { Exercise } from '../types';
import { getExerciseVisual, useExerciseVisualRegistry } from '../services/exerciseVisuals';

type Variant = 'compact' | 'workout' | 'detail' | 'admin';
const sizes: Record<Variant, string> = { compact: 'h-12 w-12', workout: 'h-20 w-20', detail: 'h-28 w-28 sm:h-32 sm:w-32', admin: 'h-24 w-24' };
const imagePadding: Record<Variant, string> = { compact: 'p-0.5', workout: 'p-1', detail: 'p-1.5', admin: 'p-1.5' };
export function ExerciseVisual({ exercise, variant = 'compact', decorative = true, className = '' }: { exercise?: Exercise; variant?: Variant; decorative?: boolean; className?: string }) {
  useExerciseVisualRegistry();
  const visual = getExerciseVisual(exercise);
  const label = exercise?.nameEn ?? '';
  return (
    <span data-exercise-visual data-visual-source={visual.source} className={`${sizes[variant]} grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950/5 text-slate-600 dark:border-white/10 dark:bg-white/[.06] dark:text-slate-300 ${className}`}>
      {visual.src ? <img src={visual.src} alt={decorative ? '' : label} aria-hidden={decorative || undefined} loading={variant === 'workout' ? 'eager' : 'lazy'} className={`h-full w-full object-contain ${imagePadding[variant]}`} onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} /> : null}
      <span hidden={Boolean(visual.src)} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}><PersonStanding className="h-8 w-8" strokeWidth={1.7} /></span>
    </span>
  );
}
