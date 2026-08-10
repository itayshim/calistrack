import { Maximize2, PersonStanding, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../types';
import { getExerciseVisual, isExerciseVisualRegistryReady, useExerciseVisualRegistry } from '../services/exerciseVisuals';
import { useI18n } from '../hooks/useI18n';

type Variant = 'compact' | 'workout' | 'detail' | 'admin' | 'instructional';
const sizes: Record<Variant, string> = { compact: 'h-12 w-12', workout: 'h-20 w-20', detail: 'h-28 w-28 sm:h-32 sm:w-32', admin: 'h-24 w-24', instructional: 'w-full max-w-2xl' };
const imagePadding: Record<Variant, string> = { compact: 'p-0.5', workout: 'p-1', detail: 'p-1.5', admin: 'p-1.5', instructional: 'p-2 sm:p-3' };
export function ExerciseVisual({
  exercise,
  variant = 'compact',
  decorative = true,
  hideFallback = false,
  expandable = false,
  className = '',
}: {
  exercise?: Exercise;
  variant?: Variant;
  decorative?: boolean;
  hideFallback?: boolean;
  expandable?: boolean;
  className?: string;
}) {
  useExerciseVisualRegistry();
  const { language, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const visual = getExerciseVisual(exercise);
  const label = (language === 'he' ? exercise?.nameHe : exercise?.nameEn) ?? '';
  const instructional = variant === 'instructional';
  const ready = isExerciseVisualRegistryReady();
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setExpanded(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [expanded]);
  if (instructional && !ready) return <span data-exercise-visual-loading role="status" aria-label={t('loading')} className={`block h-44 w-full max-w-2xl animate-pulse rounded-2xl bg-slate-950/5 dark:bg-white/[.06] ${className}`} />;
  if (hideFallback && !visual.src) return null;
  const visualContent = (
    <span data-exercise-visual data-visual-source={visual.source} data-visual-variant={variant} className={`${sizes[variant]} grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950/5 text-slate-600 dark:border-white/10 dark:bg-white/[.06] dark:text-slate-300 ${className}`}>
      {visual.src ? <img src={visual.src} alt={decorative ? '' : label} aria-hidden={decorative || undefined} loading={variant === 'workout' || instructional ? 'eager' : 'lazy'} className={`${instructional ? 'max-h-[min(46dvh,32rem)]' : 'h-full'} w-full object-contain ${imagePadding[variant]}`} onError={(event) => { event.currentTarget.hidden = true; if (hideFallback) event.currentTarget.parentElement?.setAttribute('hidden', ''); else event.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} /> : null}
      <span hidden={Boolean(visual.src)} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}><PersonStanding className="h-8 w-8" strokeWidth={1.7} /></span>
      {instructional && expandable && visual.src && <span className="pointer-events-none absolute bottom-3 end-3 grid h-9 w-9 place-items-center rounded-full bg-slate-950/75 text-white"><Maximize2 size={17} aria-hidden="true" /></span>}
    </span>
  );
  return (
    <>
      {instructional && expandable && visual.src ? <button type="button" className="relative mx-auto block w-full max-w-2xl rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={`${t('expandExerciseVisual')}: ${label}`} onClick={() => setExpanded(true)}>{visualContent}</button> : visualContent}
      {expanded && visual.src && createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-8" onMouseDown={(event) => event.target === event.currentTarget && setExpanded(false)}>
          <section role="dialog" aria-modal="true" aria-label={`${t('exerciseVisual')}: ${label}`} className="modal-surface relative flex max-h-full w-full max-w-5xl items-center justify-center rounded-2xl p-3 sm:p-5">
            <button type="button" className="icon-button absolute end-3 top-3 z-10 bg-white/90 dark:bg-slate-950/90" aria-label={t('dismiss')} onClick={() => setExpanded(false)}><X /></button>
            <img src={visual.src} alt={label} className="max-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-full object-contain" />
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
