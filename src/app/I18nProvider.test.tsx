import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { I18nProvider } from './I18nProvider';

function Example() {
  const { t, direction } = useI18n();
  const settings = useAppStore((state) => state.settings);
  return <button dir={direction} onClick={() => useAppStore.getState().setSettings({ ...settings, language: 'he' })}>{t('settings')}</button>;
}

describe('localization', () => {
  it('switches to Hebrew immediately and persists the language setting', async () => {
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), hydrated: true });
    render(<I18nProvider><Example /></I18nProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'הגדרות' })).toHaveAttribute('dir', 'rtl');
    expect(JSON.parse(localStorage.getItem('calistrack.app.v1') ?? '{}').settings.language).toBe('he');
  });
});
