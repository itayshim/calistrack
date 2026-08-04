import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { compileManagedWorkout } from '../../features/programs/managedProgram';
import { getManagedProgram } from '../../services/managedPrograms';
import { useAppStore } from '../../store/useAppStore';
import { AdminProgramPreviewPage } from './AdminProgramBuilderPage';

function renderPreview(language: 'en' | 'he' = 'en') {
  useAppStore.setState({ ...createInitialData(), hydrated: true, settings: { ...createInitialData().settings, language } });
  return render(<MemoryRouter initialEntries={['/admin/programs/beginner-calisthenics-12-week/preview']}><I18nProvider><Routes><Route path="/admin/programs/:programKey/preview" element={<AdminProgramPreviewPage />} /><Route path="/admin/programs/:programKey/test/:weekKey/:workoutKey" element={<div>QA runner</div>} /></Routes></I18nProvider></MemoryRouter>);
}

describe('Administrator Managed Program preview', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(cleanup);

  it('renders the full phase and 12-week hierarchy with summary and validation', async () => {
    renderPreview();
    expect(await screen.findByRole('heading', { name: '12-Week Beginner Calisthenics' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-validation-banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Strength Split and Skill Introduction' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Advanced Beginner Strength and Skill Practice' })).toBeInTheDocument();
    for (let week = 1; week <= 12; week += 1) {
      expect(screen.getByRole('button', { name: `Week ${week} · Expand` })).toBeInTheDocument();
    }
    expect(screen.getAllByText('3', { selector: 'dd' }).length).toBeGreaterThan(0);
  });

  it('uses localized exercise names with stable keys as secondary metadata and semantic targets', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByRole('heading', { name: 'Foundation' });
    await user.click(screen.getByRole('button', { name: 'Week 1 · Expand' }));
    const workout = screen.getAllByRole('button', { name: 'Run QA workout' })[0].closest('section')!;
    expect(within(workout).getAllByText('Jumping Jacks').length).toBeGreaterThan(0);
    expect(within(workout).getAllByText('jumping-jacks').length).toBeGreaterThan(0);
    expect(within(workout).getAllByText('Done / Skip').length).toBeGreaterThan(0);
    expect(within(workout).getAllByText('No rest').length).toBeGreaterThan(0);
    expect(within(workout).getAllByText(/6–8 reps/).length).toBeGreaterThan(0);
  });

  it('starts the exact QA workout with preview provenance', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByRole('heading', { name: 'Foundation' });
    await user.click(screen.getByRole('button', { name: 'Week 1 · Expand' }));
    await user.click(screen.getAllByRole('button', { name: 'Run QA workout' })[0]);
    expect(await screen.findByText('QA runner')).toBeInTheDocument();
    expect(useAppStore.getState().activeWorkout?.managedProgramLink).toMatchObject({ programKey: 'beginner-calisthenics-12-week', weekKey: 'week-1', preview: true });
  });

  it('protects a real active workout from a QA preview collision', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByRole('heading', { name: 'Foundation' });
    const definition = getManagedProgram('beginner-calisthenics-12-week')!.definition;
    const realTemplate = compileManagedWorkout(definition, 'week-1', 'day-a', useAppStore.getState().exercises);
    expect(useAppStore.getState().startWorkout(realTemplate)).toBe(true);
    const sessionId = useAppStore.getState().activeWorkout?.id;
    await user.click(screen.getByRole('button', { name: 'Week 1 · Expand' }));
    await user.click(screen.getAllByRole('button', { name: 'Run QA workout' })[0]);
    expect(useAppStore.getState().activeWorkout?.id).toBe(sessionId);
    expect(useAppStore.getState().activeWorkout?.managedProgramLink?.preview).not.toBe(true);
    expect(useAppStore.getState().toast).toMatch(/active workout/i);
  });

  it('renders localized RTL preview controls', async () => {
    renderPreview('he');
    expect(await screen.findByRole('heading', { name: 'תוכנית קליסטניקס למתחילים – 12 שבועות' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'פתיחת כל השבועות' })).toBeInTheDocument();
    expect(screen.getByLabelText('חיפוש תרגיל')).toBeInTheDocument();
  });
});
