import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import { AdminSkillQaPage } from './AdminSkillQaPage';

describe('administrator Skill QA', () => {
  afterEach(cleanup);
  beforeEach(() => useAppStore.setState({ ...createInitialData(), hydrated: true }));
  it('shows all six levels regardless of user unlock progress and passes validation', () => {
    render(<MemoryRouter initialEntries={['/admin/skills/front-lever']}><I18nProvider><Routes><Route path="/admin/skills/:skillKey" element={<AdminSkillQaPage />} /></Routes></I18nProvider></MemoryRouter>);
    expect(screen.getByText('Content validation passed')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Run test workout' })).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Half Front Lever' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Full Front Lever' })).toBeInTheDocument();
  });
  it('renders localized Hebrew QA content in RTL data mode', () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, settings: { ...initial.settings, language: 'he' }, hydrated: true });
    render(<MemoryRouter initialEntries={['/admin/skills/front-lever']}><I18nProvider><Routes><Route path="/admin/skills/:skillKey" element={<AdminSkillQaPage />} /></Routes></I18nProvider></MemoryRouter>);
    expect(screen.getByText('אימות התוכן עבר בהצלחה')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'הפעלת אימון בדיקה' })).toHaveLength(6);
  });
  it('shows all five Handstand Push-Up levels through the same QA route', () => {
    render(<MemoryRouter initialEntries={['/admin/skills/handstand-push-up']}><I18nProvider><Routes><Route path="/admin/skills/:skillKey" element={<AdminSkillQaPage />} /></Routes></I18nProvider></MemoryRouter>);
    expect(screen.getByText('Content validation passed')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Run test workout' })).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Negative Handstand Push-Up' })).toBeInTheDocument();
  });
});
