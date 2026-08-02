import { Compass, Play, RotateCcw, X } from 'lucide-react';
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { useAppStore } from '../../store/useAppStore';
import { TourDirectionalIcon } from './TourDirectionalIcon';
import { chooseTourCardPlacement, normalizeGeometry, sameSpotlightGeometry, stabilizeTourCardPlacement, type TourCardPlacement } from './tourPlacement';
import { tourSteps } from './tourSteps';
import { isVisibleInViewport, resolveTourTarget } from './tourTargeting';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
}

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
  const [readyStepId, setReadyStepId] = useState<string>();
  const [activeTargetId, setActiveTargetId] = useState<string>();
  const [cardPlacement, setCardPlacement] = useState<(TourCardPlacement & { stepId: string }) | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const welcomeRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<SpotlightRect | null>(null);
  const cardPlacementRef = useRef<(TourCardPlacement & { stepId: string }) | null>(null);
  const seenReplayRequest = useRef(replayRequest);
  const step = tourSteps[stepIndex];

  const goNext = useCallback((clickCount = 1) => {
    if (clickCount > 1) return;
    setStepIndex((value) => Math.min(tourSteps.length - 1, value + 1));
  }, []);

  const goBack = useCallback(() => {
    setStepIndex((value) => Math.max(0, value - 1));
  }, []);

  const skipUnavailableTargetedStep = useCallback((expectedIndex: number) => {
    setStepIndex((value) =>
      value === expectedIndex ? Math.min(tourSteps.length - 1, value + 1) : value,
    );
  }, []);

  const finishTour = useCallback((route?: string) => {
    setCompleted(true);
    setTourActive(false);
    if (route) navigate(route);
    window.setTimeout(() => {
      const restoreTarget = restoreFocusRef.current?.isConnected
        ? restoreFocusRef.current
        : document.querySelector<HTMLElement>('main button, main a[href]');
      restoreTarget?.focus();
    }, 0);
  }, [navigate, setCompleted]);

  const startTour = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStepIndex(0);
    setTourActive(true);
  }, []);

  useEffect(() => {
    if (replayRequest !== seenReplayRequest.current) {
      seenReplayRequest.current = replayRequest;
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setStepIndex(0);
      setTourActive(true);
    }
  }, [replayRequest]);

  useEffect(() => {
    document.documentElement.classList.toggle('onboarding-active', tourActive);
    return () => document.documentElement.classList.remove('onboarding-active');
  }, [tourActive]);

  useEffect(() => {
    if (!tourActive || step.type !== 'targeted' || location.pathname === step.route) return;
    navigate(step.route);
  }, [location.pathname, navigate, step.route, step.type, tourActive]);

  useEffect(() => {
    if (!tourActive || step.type !== 'targeted' || location.pathname !== step.route) return;
    let cancelled = false;
    let target: HTMLElement | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let measureFrame = 0;
    let settleFrame = 0;
    let discoveryTimer = 0;
    let hasScrolled = false;

    const measure = () => {
      if (cancelled || !target || !isVisibleInViewport(target)) return;
      const rect = target.getBoundingClientRect();
      const padding = 7;
      const left = normalizeGeometry(Math.max(7, rect.left - padding));
      const top = normalizeGeometry(Math.max(7, rect.top - padding));
      const right = normalizeGeometry(Math.min(window.innerWidth - 7, rect.right + padding));
      const bottom = normalizeGeometry(Math.min(window.innerHeight - 7, rect.bottom + padding));
      const next = {
        top,
        left,
        width: right - left,
        height: bottom - top,
        borderRadius: window.getComputedStyle(target).borderRadius || '1rem',
      };
      if (!sameSpotlightGeometry(spotlightRef.current, next) || spotlightRef.current?.borderRadius !== next.borderRadius) {
        spotlightRef.current = next;
        setSpotlight(next);
        window.dispatchEvent(new Event('onboarding-target-measured'));
      }
      setReadyStepId(step.id);
    };

    const scheduleMeasure = () => {
      if (measureFrame) return;
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        measure();
      });
    };

    const discover = () => {
      if (target?.isConnected) return true;
      const resolved = resolveTourTarget(step.targets);
      if (!resolved) return false;
      target = resolved.element;
      targetRef.current = target;
      setActiveTargetId(resolved.targetId);
      resizeObserver?.disconnect();
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(target);
      }
      if (!hasScrolled) {
        hasScrolled = true;
        const targetRect = target.getBoundingClientRect();
        target.scrollIntoView({ behavior: 'auto', block: window.innerWidth < 640 && targetRect.height > 150 ? 'start' : 'center', inline: 'nearest' });
      }
      settleFrame = window.requestAnimationFrame(() => window.requestAnimationFrame(scheduleMeasure));
      return true;
    };

    const initialFrame = window.requestAnimationFrame(() => {
      setSpotlight(null);
      spotlightRef.current = null;
      targetRef.current = null;
      cardPlacementRef.current = null;
      setCardPlacement(null);
      setActiveTargetId(undefined);
      if (step.targets?.length) discover();
    });

    const mutationObserver = new MutationObserver((mutations) => {
      if (target?.isConnected) return;
      if (mutations.every((mutation) => mutation.target instanceof Element && mutation.target.closest('.onboarding-tour-layer'))) return;
      discover();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    discoveryTimer = window.setInterval(() => {
      if (discover()) window.clearInterval(discoveryTimer);
    }, 100);
    const skipMissing = window.setTimeout(() => {
      if (!target && !cancelled) {
        skipUnavailableTargetedStep(stepIndex);
      }
    }, 1600);
    const onLayout = () => {
      if (!target?.isConnected) discover();
      else scheduleMeasure();
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('orientationchange', onLayout);
    window.addEventListener('scroll', onLayout, true);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      cancelled = true;
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.clearInterval(discoveryTimer);
      window.clearTimeout(skipMissing);
      window.cancelAnimationFrame(initialFrame);
      window.cancelAnimationFrame(settleFrame);
      window.cancelAnimationFrame(measureFrame);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('orientationchange', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [location.pathname, skipUnavailableTargetedStep, step, stepIndex, tourActive]);

  useEffect(() => {
    if (!tourActive || step.placement === 'center' || readyStepId !== step.id || !spotlightRef.current) return;
    let frame = 0;
    let resizeTimer = 0;
    const measureCard = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(commitCardMeasurement);
    };
    const commitCardMeasurement = () => {
      frame = 0;
      const card = dialogRef.current;
      const layer = layerRef.current;
      const activeSpotlight = spotlightRef.current;
      if (!card || !layer || !activeSpotlight) return;
      const cardRect = card.getBoundingClientRect();
      const layerStyle = window.getComputedStyle(layer);
      const rootStyle = window.getComputedStyle(document.documentElement);
      const navHeight = Number.parseFloat(rootStyle.getPropertyValue('--mobile-nav-height')) || 0;
      const mobileNavigationTop = window.innerWidth < 768 ? window.innerHeight - navHeight : undefined;
      const next = chooseTourCardPlacement(
        {
          ...activeSpotlight,
          right: activeSpotlight.left + activeSpotlight.width,
          bottom: activeSpotlight.top + activeSpotlight.height,
        },
        {
          width: Math.min(window.innerWidth < 640 ? window.innerWidth - 24 : 480, cardRect.width || 480),
          height: cardRect.height,
        },
        {
          width: window.innerWidth,
          height: window.innerHeight,
          safeTop: Number.parseFloat(layerStyle.paddingTop) || 0,
          safeRight: Number.parseFloat(layerStyle.paddingRight) || 0,
          safeBottom: Number.parseFloat(layerStyle.paddingBottom) || 0,
          safeLeft: Number.parseFloat(layerStyle.paddingLeft) || 0,
          bottomNavigationTop: mobileNavigationTop,
        },
      );
      setCardPlacement((current) => {
        const positioned = { ...next, top: normalizeGeometry(next.top), left: normalizeGeometry(next.left), width: normalizeGeometry(next.width), stepId: step.id };
        const stable = stabilizeTourCardPlacement(current, positioned);
        cardPlacementRef.current = stable;
        return stable;
      });
    };
    measureCard();
    const observer = 'ResizeObserver' in window ? new ResizeObserver(measureCard) : undefined;
    if (dialogRef.current) {
      observer?.observe(dialogRef.current);
    }
    const onViewportChange = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cardPlacementRef.current = null;
        setCardPlacement(null);
        measureCard();
      }, 80);
    };
    window.addEventListener('onboarding-target-measured', measureCard);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      observer?.disconnect();
      window.removeEventListener('onboarding-target-measured', measureCard);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [readyStepId, step.id, step.placement, tourActive]);

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
    const focusTimer = window.setTimeout(() => {
      if (tourActive) container?.focus();
      else (focusable()[0] ?? container)?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finishTour();
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
      } else if (tourActive && event.key === (direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft')) {
        goNext();
      } else if (tourActive && event.key === (direction === 'ltr' ? 'ArrowLeft' : 'ArrowRight')) {
        goBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [direction, finishTour, goBack, goNext, tourActive, welcomeOpen]);

  const finalAction = useMemo(() => {
    if (activeWorkout) return { label: t('continueWorkout'), route: `/workout/${activeWorkout.id}`, icon: <Play size={18} fill="currentColor" /> };
    if (!programs.length) return { label: t('createProgram'), route: '/program/new', icon: <Play size={18} /> };
    return { label: t('browseExercises'), route: '/exercises', icon: <Compass size={18} /> };
  }, [activeWorkout, programs.length, t]);

  if (welcomeOpen) {
    return (
      <div className="onboarding-overlay" role="presentation">
        <section ref={welcomeRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="onboarding-welcome-title" aria-describedby="onboarding-welcome-description" className="modal-surface onboarding-welcome-card animate-rise w-full max-w-md rounded-4xl p-6 sm:p-8">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"><Compass size={28} /></span>
          <h2 id="onboarding-welcome-title" className="mt-5 text-3xl font-black tracking-tight">{t('onboardingWelcomeTitle')}</h2>
          <p id="onboarding-welcome-description" className="mt-3 leading-relaxed text-slate-500 dark:text-slate-300">{t('onboardingWelcomeDescription')}</p>
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/[.06] dark:text-slate-300">{t('onboardingEstimatedTime')}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="btn-primary" autoFocus onClick={startTour}><Play size={18} fill="currentColor" />{t('startTour')}</button>
            <button className="btn-secondary" onClick={() => setCompleted(true)}>{t('skip')}</button>
          </div>
        </section>
      </div>
    );
  }

  if (!tourActive) return null;
  const finalStep = stepIndex === tourSteps.length - 1;
  const targetReady = step.type !== 'targeted' || readyStepId === step.id;
  const placementReady = step.placement === 'center' || cardPlacement?.stepId === step.id;

  return (
    <div ref={layerRef} className="onboarding-tour-layer" aria-live="polite">
      <div className={`onboarding-tour-blocker ${spotlight ? 'has-spotlight' : ''}`} aria-hidden="true" />
      {spotlight && <div data-testid="tour-spotlight" data-active-target={activeTargetId} className="onboarding-spotlight" style={spotlight} aria-hidden="true" />}
      {!targetReady ? (
        <div className="modal-surface onboarding-tour-loading" role="status">{t('preparingTourStep')}</div>
      ) : (
        <section
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-description"
          data-placement={step.placement === 'center' ? 'center' : cardPlacement?.side}
          data-overlap-ratio={cardPlacement?.overlapRatio}
          style={
            step.placement === 'center'
              ? undefined
              : {
                  top: cardPlacement?.top ?? 0,
                  left: cardPlacement?.left ?? 0,
                  bottom: 'auto',
                  right: 'auto',
                  width: cardPlacement?.width,
                  opacity: placementReady ? 1 : 0,
                }
          }
          className={`modal-surface onboarding-tour-card rounded-4xl ${
            step.placement === 'center' ? 'onboarding-tour-card-center' : 'onboarding-tour-card-positioned'
          } ${cardPlacement?.compact ? 'onboarding-tour-card-compact' : ''} p-5 sm:p-6`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-brand">{t('tourStepProgress').replace('{current}', String(stepIndex + 1)).replace('{total}', String(tourSteps.length))}</span>
            <button className="icon-button h-10 w-10" aria-label={t('skipTour')} onClick={() => finishTour()}><X size={18} /></button>
          </div>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {tourSteps.map((tourStep, index) => <span key={tourStep.id} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-brand' : 'bg-slate-200 dark:bg-white/[.1]'}`} />)}
          </div>
          <h2 id="tour-step-title" className="mt-5 text-2xl font-black tracking-tight">{t(step.titleKey)}</h2>
          <p id="tour-step-description" className="mt-2 leading-relaxed text-slate-500 dark:text-slate-300">{finalStep && programs.length ? t('tourReadyExistingDescription') : t(step.descriptionKey)}</p>
          {!finalStep ? (
            <>
              <div data-testid="tour-primary-actions" className="onboarding-tour-primary-actions mt-6">
                {stepIndex > 0 && <button className="btn-secondary" onClick={goBack}><TourDirectionalIcon action="back" direction={direction} />{t('back')}</button>}
                <button key={`next-${step.id}`} className="btn-primary" onClick={(event) => goNext(event.detail)}>{t('next')}<TourDirectionalIcon action="next" direction={direction} /></button>
              </div>
              <button className="onboarding-skip-action" onClick={() => finishTour()}>{t('skipTour')}</button>
            </>
          ) : (
            <>
              <button className="btn-primary mt-6 w-full" onClick={() => finishTour(finalAction.route)}>{finalAction.icon}{finalAction.label}</button>
              <button className="mt-3 min-h-11 w-full text-sm font-black text-slate-500" onClick={() => finishTour()}><RotateCcw size={15} className="me-2 inline" />{t('finish')}</button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
