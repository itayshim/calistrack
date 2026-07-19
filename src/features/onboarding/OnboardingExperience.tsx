import { Compass, Play, RotateCcw, X } from 'lucide-react';
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { useAppStore } from '../../store/useAppStore';
import { TourDirectionalIcon } from './TourDirectionalIcon';
import { chooseTourCardPlacement, type TourCardPlacement } from './tourPlacement';
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
    let settleFrame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
      if (cancelled || !target || !isVisibleInViewport(target)) return;
      const rect = target.getBoundingClientRect();
      const padding = 7;
      const left = Math.max(7, rect.left - padding);
      const top = Math.max(7, rect.top - padding);
      const right = Math.min(window.innerWidth - 7, rect.right + padding);
      const bottom = Math.min(window.innerHeight - 7, rect.bottom + padding);
      setSpotlight({
        top,
        left,
        width: right - left,
        height: bottom - top,
        borderRadius: window.getComputedStyle(target).borderRadius || '1rem',
      });
      setReadyStepId(step.id);
    };

    const prepare = () => {
      const resolved = resolveTourTarget(step.targets);
      if (!resolved) return false;
      if (target !== resolved.element) {
        resizeObserver?.disconnect();
        target = resolved.element;
        setActiveTargetId(resolved.targetId);
        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(measure);
          resizeObserver.observe(target);
        }
      }
      const targetRect = target.getBoundingClientRect();
      const largeOnMobile = window.innerWidth < 640 && targetRect.height > 150;
      target.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: largeOnMobile ? 'start' : 'center',
        inline: 'nearest',
      });
      window.cancelAnimationFrame(settleFrame);
      settleFrame = window.requestAnimationFrame(() => window.requestAnimationFrame(measure));
      return true;
    };

    const initialFrame = window.requestAnimationFrame(() => {
      setSpotlight(null);
      setActiveTargetId(undefined);
      if (step.targets?.length) prepare();
    });

    const mutationObserver = new MutationObserver(prepare);
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
    const retry = window.setInterval(prepare, 80);
    const skipMissing = window.setTimeout(() => {
      if (!target && !cancelled) {
        skipUnavailableTargetedStep(stepIndex);
      }
    }, 1600);
    const onLayout = () => {
      if (!target || !isVisibleInViewport(target)) prepare();
      else measure();
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('orientationchange', onLayout);
    window.addEventListener('scroll', onLayout, true);
    void document.fonts?.ready.then(onLayout);

    return () => {
      cancelled = true;
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(skipMissing);
      window.cancelAnimationFrame(initialFrame);
      window.cancelAnimationFrame(settleFrame);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('orientationchange', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [location.pathname, skipUnavailableTargetedStep, step, stepIndex, tourActive]);

  useEffect(() => {
    if (!tourActive || step.placement === 'center' || readyStepId !== step.id || !spotlight) return;
    let frame = 0;
    const measureCard = () => {
      const card = dialogRef.current;
      const layer = layerRef.current;
      if (!card || !layer) return;
      const cardRect = card.getBoundingClientRect();
      const layerStyle = window.getComputedStyle(layer);
      const bottomNavigation = Array.from(document.querySelectorAll<HTMLElement>('.mobile-bottom-nav')).find(
        isVisibleInViewport,
      );
      const next = chooseTourCardPlacement(
        {
          ...spotlight,
          right: spotlight.left + spotlight.width,
          bottom: spotlight.top + spotlight.height,
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
          bottomNavigationTop: bottomNavigation?.getBoundingClientRect().top,
        },
      );
      setCardPlacement((current) => {
        const positioned = { ...next, stepId: step.id };
        return current &&
          current.stepId === positioned.stepId &&
          current.top === positioned.top &&
          current.left === positioned.left &&
          current.width === positioned.width &&
          current.compact === positioned.compact
          ? current
          : positioned;
      });
    };
    frame = window.requestAnimationFrame(measureCard);
    const observer = 'ResizeObserver' in window ? new ResizeObserver(measureCard) : undefined;
    if (dialogRef.current) {
      observer?.observe(dialogRef.current);
    }
    window.addEventListener('resize', measureCard);
    window.addEventListener('orientationchange', measureCard);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measureCard);
      window.removeEventListener('orientationchange', measureCard);
    };
  }, [readyStepId, spotlight, step.id, step.placement, tourActive]);

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
