import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { STORAGE_KEY } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import { SettingsPage } from './SettingsPage';

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
