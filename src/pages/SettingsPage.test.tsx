import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { STORAGE_KEY } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import { SettingsPage } from './SettingsPage';
import { restAlertService } from '../services/restAlert';

describe('numeric editing preference', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), hydrated: true, toast: null });
  });

  it('is disabled by default and persists immediately when enabled', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><SettingsPage /></I18nProvider></MemoryRouter>);
    const toggle = screen.getByRole('checkbox', { name: 'Allow empty numeric fields while editing' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(useAppStore.getState().settings.allowEmptyNumericFields).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').settings.allowEmptyNumericFields).toBe(true);
  });

  it('renders the localized Hebrew preference and description', () => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, language: 'he' } });
    render(<MemoryRouter><I18nProvider><SettingsPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByRole('checkbox', { name: 'אפשר להשאיר שדות מספריים ריקים בזמן עריכה' })).toBeInTheDocument();
    expect(screen.getByText(/מאפשר למחוק זמנית/)).toBeInTheDocument();
  });
});

describe('rest timer alert settings', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), hydrated: true, toast: null });
  });

  it('selects, previews, and persists a bundled sound immediately', async () => {
    const user = userEvent.setup();
    const preview = vi.spyOn(restAlertService, 'preview').mockResolvedValue();
    render(<MemoryRouter><I18nProvider><SettingsPage /></I18nProvider></MemoryRouter>);
    useAppStore.getState().setOnboardingCompleted(true);
    await user.click(screen.getByRole('combobox', { name: 'Rest completion sound' }));
    await user.click(screen.getByRole('option', { name: /Gym Buzzer/ }));
    expect(useAppStore.getState().settings.restCompletionSound).toBe('gym-buzzer');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').settings.restCompletionSound)
      .toBe('gym-buzzer');
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
    expect(preview).toHaveBeenCalledWith('gym-buzzer');

    await user.click(screen.getByRole('button', { name: 'Play preview' }));
    expect(preview).toHaveBeenLastCalledWith('gym-buzzer');
  });

  it('persists repeat and vibration controls and renders Hebrew RTL labels', async () => {
    const user = userEvent.setup();
    vi.spyOn(restAlertService, 'preview').mockResolvedValue();
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, language: 'he' },
    });
    render(<MemoryRouter><I18nProvider><SettingsPage /></I18nProvider></MemoryRouter>);
    useAppStore.getState().setOnboardingCompleted(true);
    expect(screen.getByRole('heading', { name: 'התראות טיימר המנוחה' })).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'חזרה על ההתראה' }));
    await user.click(screen.getByRole('option', { name: 'שלוש פעמים' }));
    expect(useAppStore.getState().settings.restAlertRepeatCount).toBe(3);
    const vibration = screen.getByRole('checkbox', { name: /רטט בסיום המנוחה/ });
    await user.click(vibration);
    expect(useAppStore.getState().settings.restTimerVibration).toBe(false);
    expect(useAppStore.getState().settings.onboardingCompleted).toBe(true);
    expect(screen.getByText('זמינות הרטט תלויה במכשיר ובדפדפן.')).toBeInTheDocument();
  });
});
