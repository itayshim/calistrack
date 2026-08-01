import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import { AdminSkillQaPage } from './AdminSkillQaPage';

describe('administrator Skill QA', () => {
  afterEach(cleanup);
  beforeEach(() => useAppStore.setState({ ...createInitialData(), hydrated: true }));
  it('shows all six levels regardless of user unlock progress and passes validation', () => {
    render(<MemoryRouter><I18nProvider><AdminSkillQaPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByText('Content validation passed')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Run test workout' })).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Half Front Lever' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Full Front Lever' })).toBeInTheDocument();
  });
  it('renders localized Hebrew QA content in RTL data mode', () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, settings: { ...initial.settings, language: 'he' }, hydrated: true });
    render(<MemoryRouter><I18nProvider><AdminSkillQaPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByText('אימות התוכן עבר בהצלחה')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'הפעלת אימון בדיקה' })).toHaveLength(6);
  });
});
