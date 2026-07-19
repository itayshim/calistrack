import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { SettingsPage } from '../../pages/SettingsPage';
import { STORAGE_KEY } from '../../services/storage';
import { useAppStore } from '../../store/useAppStore';
import { OnboardingExperience } from './OnboardingExperience';

function RouteSurface() {
  const location = useLocation();
  return (
    <>
      <output data-testid="current-route">{location.pathname}</output>
      <div data-tour-id="dashboard">Dashboard surface</div>
      <div data-tour-id="exercise-library">Exercise library surface</div>
      <div data-tour-id="programs">Programs surface</div>
      <div data-tour-id="nav-workout">Workout navigation</div>
      <div data-tour-id="progress">Progress surface</div>
      <div data-tour-id="settings">Settings surface</div>
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

  it('starts an eight-step tour and navigates automatically between route definitions', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Train with structure' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByTestId('current-route')).toHaveTextContent('/exercises'));
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('tour-spotlight')).toBeInTheDocument());
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
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
  });

  it('finishes all eight steps and persists completion', async () => {
    const user = userEvent.setup();
    renderExperience();
    await user.click(screen.getByRole('button', { name: 'Start tour' }));
    const expectedTitles = [
      'Your training hub',
      'Explore every movement',
      'Build your routine',
      'Stay focused while training',
      'See your work add up',
      'Make CalisTrack yours',
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
});
