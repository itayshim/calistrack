import { ChevronLeft, ChevronRight, Compass, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { useAppStore } from '../../store/useAppStore';
import { tourSteps } from './tourSteps';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const findVisibleTarget = (target: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${target}"]`)).find(
    (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
    },
  );

export function OnboardingExperience() {
  const { t, direction } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const completed = useAppStore((state) => state.settings.onboardingCompleted);
  const programs = useAppStore((state) => state.programs);
  const activeWorkout = useAppStore((state) => state.activeWorkout);
  const replayRequest = useAppStore((state) => state.onboardingReplayRequest);
  const setCompleted = useAppStore((state) => state.setOnboardingCompleted);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const welcomeRef = useRef<HTMLElement>(null);
  const seenReplayRequest = useRef(replayRequest);
  const step = tourSteps[stepIndex];

  useEffect(() => {
    if (replayRequest !== seenReplayRequest.current) {
      seenReplayRequest.current = replayRequest;
      setStepIndex(0);
      setTourActive(true);
    }
  }, [replayRequest]);

  useEffect(() => {
    if (!tourActive || location.pathname === step.route) return;
    navigate(step.route);
  }, [location.pathname, navigate, step.route, tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let target: HTMLElement | undefined;
    const update = () => {
      target = step.target ? findVisibleTarget(step.target) : undefined;
      if (!target) {
        setSpotlight(null);
        return;
      }
      target.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      const rect = target.getBoundingClientRect();
      const width = Math.min(window.innerWidth - 16, rect.width + 16);
      setSpotlight({
        top: Math.max(8, rect.top - 8),
        left: Math.min(window.innerWidth - width - 8, Math.max(8, rect.left - 8)),
        width,
        height: Math.min(window.innerHeight - 16, rect.height + 16),
      });
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(update, 40);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [location.pathname, step.target, tourActive]);

  const welcomeOpen = !completed && !tourActive;
  useEffect(() => {
    if (!tourActive && !welcomeOpen) return;
    const container = tourActive ? dialogRef.current : welcomeRef.current;
    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const focusTimer = window.setTimeout(() => (focusable()[0] ?? container)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCompleted(true);
        setTourActive(false);
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (tourActive && event.key === 'ArrowRight' && direction === 'ltr') {
        setStepIndex((value) => Math.min(tourSteps.length - 1, value + 1));
      } else if (tourActive && event.key === 'ArrowLeft' && direction === 'ltr') {
        setStepIndex((value) => Math.max(0, value - 1));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [direction, setCompleted, stepIndex, tourActive, welcomeOpen]);

  const finalAction = useMemo(() => {
    if (activeWorkout) {
      return {
        label: t('continueWorkout'),
        route: `/workout/${activeWorkout.id}`,
        icon: <Play size={18} fill="currentColor" />,
      };
    }
    if (!programs.length) {
      return {
        label: t('createProgram'),
        route: '/program/new',
        icon: <Play size={18} />,
      };
    }
    return {
      label: t('browseExercises'),
      route: '/exercises',
      icon: <Compass size={18} />,
    };
  }, [activeWorkout, programs.length, t]);

  const finish = (route?: string) => {
    setCompleted(true);
    setTourActive(false);
    if (route) navigate(route);
  };

  if (!completed && !tourActive) {
    return (
      <div className="onboarding-overlay" role="presentation">
        <section
          ref={welcomeRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-welcome-title"
          aria-describedby="onboarding-welcome-description"
          className="modal-surface onboarding-welcome-card animate-rise w-full max-w-md rounded-4xl p-6 sm:p-8"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
            <Compass size={28} />
          </span>
          <h2 id="onboarding-welcome-title" className="mt-5 text-3xl font-black tracking-tight">
            {t('onboardingWelcomeTitle')}
          </h2>
          <p id="onboarding-welcome-description" className="mt-3 leading-relaxed text-slate-500 dark:text-slate-300">
            {t('onboardingWelcomeDescription')}
          </p>
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/[.06] dark:text-slate-300">
            {t('onboardingEstimatedTime')}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="btn-primary" autoFocus onClick={() => setTourActive(true)}>
              <Play size={18} fill="currentColor" />
              {t('startTour')}
            </button>
            <button className="btn-secondary" onClick={() => setCompleted(true)}>
              {t('skip')}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!tourActive) return null;

  const finalStep = stepIndex === tourSteps.length - 1;
  return (
    <div className="onboarding-tour-layer" aria-live="polite">
      <div className="onboarding-tour-blocker" aria-hidden="true" />
      {spotlight && (
        <div
          data-testid="tour-spotlight"
          className="onboarding-spotlight"
          style={spotlight}
          aria-hidden="true"
        />
      )}
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-description"
        className={`modal-surface onboarding-tour-card rounded-4xl p-5 sm:p-6 ${
          step.placement === 'center' ? 'onboarding-tour-card-center' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-brand">
            {t('tourStepProgress')
              .replace('{current}', String(stepIndex + 1))
              .replace('{total}', String(tourSteps.length))}
          </span>
          <button
            className="icon-button h-10 w-10"
            aria-label={t('skipTour')}
            onClick={() => finish()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {tourSteps.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index <= stepIndex ? 'bg-brand' : 'bg-slate-200 dark:bg-white/[.1]'
              }`}
            />
          ))}
        </div>
        <h2 id="tour-step-title" className="mt-5 text-2xl font-black tracking-tight">
          {t(step.titleKey)}
        </h2>
        <p id="tour-step-description" className="mt-2 leading-relaxed text-slate-500 dark:text-slate-300">
          {finalStep && programs.length ? t('tourReadyExistingDescription') : t(step.descriptionKey)}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {!finalStep && (
            <button
              className="btn-primary flex-1"
              onClick={() => setStepIndex((value) => Math.min(tourSteps.length - 1, value + 1))}
            >
              {t('next')}
              <ChevronRight className="directional-icon" size={18} />
            </button>
          )}
          {stepIndex > 0 && !finalStep && (
            <button
              className="btn-secondary"
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft className="directional-icon" size={18} />
              {t('back')}
            </button>
          )}
          {finalStep && (
            <button className="btn-primary w-full" onClick={() => finish(finalAction.route)}>
              {finalAction.icon}
              {finalAction.label}
            </button>
          )}
          {!finalStep && (
            <button className="min-h-12 px-3 text-sm font-black text-slate-500" onClick={() => finish()}>
              {t('skipTour')}
            </button>
          )}
        </div>
        {finalStep && (
          <button className="mt-3 min-h-11 w-full text-sm font-black text-slate-500" onClick={() => finish()}>
            <RotateCcw size={15} className="me-2 inline" />
            {t('finish')}
          </button>
        )}
      </section>
    </div>
  );
}
