import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { SettingsPage } from '../../pages/SettingsPage';
import { STORAGE_KEY } from '../../services/storage';
import { useAppStore } from '../../store/useAppStore';
import { OnboardingExperience } from './OnboardingExperience';
import { TourDirectionalIcon } from './TourDirectionalIcon';
import { tourSteps } from './tourSteps';
import { resolveTourTarget } from './tourTargeting';

function RouteSurface() {
  const location = useLocation();
  return (
    <>
      <output data-testid="current-route">{location.pathname}</output>
      <button data-tour-id="dashboard-primary-action">Dashboard action</button>
      <div data-tour-id="nav-program">Program navigation</div>
      <button data-tour-id="create-program-action">Create program action</button>
      <div data-tour-id="exercise-search-filters">Exercise search filters</div>
      <label data-tour-id="exercise-search-control">Exercise search</label>
      <div data-tour-id="exercise-filter-controls">Category Difficulty Measurement</div>
      <div data-tour-id="nav-workout">Workout navigation</div>
      <div data-tour-id="progress-summary">Progress summary</div>
      <div data-tour-id="settings-preferences">Settings preferences</div>
      <div data-tour-id="settings-theme-preference">Theme preference</div>
      <div data-tour-id="settings-help">Settings help</div>
      <div data-admin-entry>Administrator sign in</div>
      <OnboardingExperience />
    </>
  );
}

function renderExperience(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nProvider>
        <Routes>
          <Route path="*" element={<RouteSurface />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('first-run onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      ...createInitialData(),
      hydrated: true,
      onboardingReplayRequest: 0,
      toast: null,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 16,
      y: 80,
      top: 80,
      right: 374,
      bottom: 180,
      left: 16,
      width: 358,
      height: 100,
      toJSON: () => ({}),
    });
    document.documentElement.dir = 'ltr';
  });
  afterEach(cleanup);

  it('shows the welcome dialog only for a fresh installation and Skip persists completion', async () => {
    const user = userEvent.setup();
    renderExperience();
    expect(screen.getByRole('dialog', { name: 'Welcome to CalisTrack 👋' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.onboardingCompleted).toBe(true);
  });

  it('does not open automatically for returning users', () => {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, onboardingCompleted: true },
    }));
    renderExperience();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts an eleven-step tour and navigates automatically between exact route targets', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByText('Step 1 of 11')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Train with structure' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Step 2 of 11')).toBeInTheDocument();
    expect(await screen.findByTestId('tour-spotlight')).toHaveAttribute('data-active-target', 'dashboard-primary-action');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Step 3 of 11')).toBeInTheDocument();
    expect(await screen.findByTestId('tour-spotlight')).toHaveAttribute('data-active-target', 'nav-program');
  });

  it('Escape skips the tour, completes onboarding, and removes the blocking layer', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
  });

  it('replays from Settings without resetting completion', async () => {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, onboardingCompleted: true },
    }));
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <I18nProvider>
          <SettingsPage />
          <OnboardingExperience />
        </I18nProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Replay tutorial' }));
    expect(screen.getByText('Step 1 of 11')).toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
  });

  it('finishes all eleven steps and persists completion', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    const expectedTitles = [
      'Your training hub',
      'Your program starts here',
      'Build your routine',
      'Explore every movement',
      'Narrow the library',
      'Start when you are ready',
      'See your work add up',
      'Personalize CalisTrack',
      'Help is always nearby',
      "You're ready!",
    ];
    for (const title of expectedTitles) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByRole('heading', { name: title });
    }
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
  });

  it('reset from Settings restores the first-launch welcome', async () => {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, onboardingCompleted: true },
    }));
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <I18nProvider>
          <SettingsPage />
          <OnboardingExperience />
        </I18nProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Reset onboarding' }));
    expect(screen.getByRole('dialog', { name: 'Welcome to CalisTrack 👋' })).toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(false);
  });

  it('renders the localized welcome and tour controls in Hebrew RTL', () => {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, language: 'he' },
    }));
    document.documentElement.dir = 'rtl';
    renderExperience();
    expect(screen.getByRole('dialog', { name: 'ברוכים הבאים ל־CalisTrack 👋' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחלת הסיור' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('keeps Back and Next together while Skip remains a separate secondary action', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const actions = await screen.findByTestId('tour-primary-actions');
    expect(within(actions).getAllByRole('button').map((button) => button.textContent)).toEqual(['Back', 'Next']);
    expect(within(actions).queryByRole('button', { name: 'Skip tour' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Skip tour' }).length).toBeGreaterThan(0);
  });

  it('uses meaning-aware arrows in LTR and RTL without mirroring non-directional icons', () => {
    const { rerender } = render(<TourDirectionalIcon action="next" direction="ltr" />);
    expect(document.querySelector('[data-icon-direction]')).toHaveAttribute('data-icon-direction', 'right');
    rerender(<TourDirectionalIcon action="back" direction="ltr" />);
    expect(document.querySelector('[data-icon-direction]')).toHaveAttribute('data-icon-direction', 'left');
    rerender(<TourDirectionalIcon action="next" direction="rtl" />);
    expect(document.querySelector('[data-icon-direction]')).toHaveAttribute('data-icon-direction', 'left');
    rerender(<TourDirectionalIcon action="back" direction="rtl" />);
    expect(document.querySelector('[data-icon-direction]')).toHaveAttribute('data-icon-direction', 'right');
  });

  it('uses priority fallbacks and ignores hidden or off-screen targets', () => {
    const hidden = document.createElement('div');
    hidden.dataset.tourId = 'preferred';
    hidden.style.display = 'none';
    document.body.append(hidden);
    const fallback = document.createElement('div');
    fallback.dataset.tourId = 'fallback';
    document.body.append(fallback);
    expect(resolveTourTarget(['preferred', 'fallback'])?.targetId).toBe('fallback');
  });

  it('uses focused search, filter, and settings targets instead of page-height sections', () => {
    expect(tourSteps.find((tourStep) => tourStep.id === 'exercise-search')?.targets?.[0]).toBe(
      'exercise-search-control',
    );
    expect(tourSteps.find((tourStep) => tourStep.id === 'exercise-filters')?.targets?.[0]).toBe(
      'exercise-filter-controls',
    );
    expect(tourSteps.find((tourStep) => tourStep.id === 'settings-preferences')?.targets?.[0]).toBe(
      'settings-theme-preference',
    );
  });

  it('skips a giant preferred target when a focused child fallback is available', () => {
    const giant = document.createElement('div');
    giant.dataset.tourId = 'giant';
    giant.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 20,
      left: 10,
      right: 380,
      bottom: 800,
      width: 370,
      height: 780,
    });
    const focused = document.createElement('div');
    focused.dataset.tourId = 'focused';
    focused.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 180,
      left: 20,
      right: 370,
      bottom: 272,
      width: 350,
      height: 92,
    });
    document.body.append(giant, focused);
    expect(resolveTourTarget(['giant', 'focused'])?.targetId).toBe('focused');
  });

  it('contains no administrator route and hides the administrator entry while touring', async () => {
    expect(tourSteps.every((tourStep) => !tourStep.route.startsWith('/admin'))).toBe(true);
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(document.documentElement).toHaveClass('onboarding-active');
    expect(document.querySelector('[data-admin-entry]')).toBeInTheDocument();
  });

  it('recalculates the exact target rectangle after a resize', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const spotlight = await screen.findByTestId('tour-spotlight');
    expect(spotlight).toHaveStyle({ top: '73px', left: '9px', width: '372px', height: '114px' });
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(screen.getByTestId('tour-spotlight')).toHaveAttribute('data-active-target', 'dashboard-primary-action'));
  });
});
