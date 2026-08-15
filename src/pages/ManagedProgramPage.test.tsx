import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { beginnerCalisthenics12Week } from '../features/programs/beginnerCalisthenics12Week';
import { installManagedPrograms } from '../services/managedPrograms';
import { storageService } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import type { ManagedProgramEnrollment } from '../types';
import { ManagedProgramPage } from './ManagedProgramPage';

const program = beginnerCalisthenics12Week;
const enrollment = (): ManagedProgramEnrollment => ({ id: 'enrollment-1', programKey: program.key, programVersion: program.version, startDate: '2026-08-01', currentWeekKey: program.weeks[0].key, completedWorkoutKeys: [], successfulWorkoutKeys: [], skippedWorkoutKeys: [], preferredWeekdays: [], status: 'active', detached: false });

function renderPage(language: 'en' | 'he' = 'en') {
  useAppStore.setState((state) => ({ settings: { ...state.settings, language } }));
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  return render(<MemoryRouter initialEntries={[`/programs/managed/${program.key}`]}><I18nProvider><Routes><Route path="/programs/managed/:programKey" element={<ManagedProgramPage />} /><Route path="/workout/:id" element={<div>Workout runner</div>} /></Routes></I18nProvider></MemoryRouter>);
}

describe('Managed Program progression UX', () => {
  beforeEach(() => {
    installManagedPrograms([]);
    useAppStore.setState({ ...createInitialData(), hydrated: true, managedProgramEnrollments: [enrollment()] });
  });
  afterEach(cleanup);

  it('previews an available workout without mutating progress', async () => {
    const user = userEvent.setup();
    renderPage();
    const before = structuredClone(useAppStore.getState().managedProgramEnrollments);
    const next = screen.getByTestId('current-week-summary');
    await user.click(within(next).getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog', { name: /Full Body A/ })).toBeInTheDocument();
    expect(screen.getByText('Full-body strength')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Close preview' })[0]);
    expect(useAppStore.getState().managedProgramEnrollments).toEqual(before);
  });

  it('allows previewing a locked future workout without starting it', async () => {
    const user = userEvent.setup();
    renderPage();
    const locked = document.querySelector('[data-workout-state="locked"]') as HTMLElement;
    await user.click(within(locked).getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(useAppStore.getState().activeWorkout).toBeNull();
    expect(useAppStore.getState().managedProgramEnrollments[0].completedWorkoutKeys).toEqual([]);
  });

  it('persists Skip, distinguishes it from completion, and selects the next workout', async () => {
    const user = userEvent.setup();
    renderPage();
    const upNext = document.querySelector('[data-workout-state="up_next"]') as HTMLElement;
    await user.click(within(upNext).getByRole('button', { name: 'Skip' }));
    const stored = useAppStore.getState().managedProgramEnrollments[0];
    expect(stored.skippedWorkoutKeys).toContain(`${program.weeks[0].key}:${program.weeks[0].workouts[0].key}`);
    expect(stored.completedWorkoutKeys).toEqual([]);
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-workout-state="up_next"]')).toHaveLength(1);
  });

  it('starts the exact selected workout with immutable managed provenance', async () => {
    const user = userEvent.setup();
    renderPage();
    const upNext = document.querySelector('[data-workout-state="up_next"]') as HTMLElement;
    await user.click(within(upNext).getByRole('button', { name: 'Play' }));
    expect(await screen.findByText('Workout runner')).toBeInTheDocument();
    expect(useAppStore.getState().activeWorkout?.managedProgramLink).toMatchObject({ programKey: program.key, version: program.version, weekKey: program.weeks[0].key, workoutKey: program.weeks[0].workouts[0].key, enrollmentId: 'enrollment-1' });
  });

  it('renders real lock reasons and Hebrew RTL states', async () => {
    renderPage('he');
    expect((await screen.findAllByText(/כדי לפתוח/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('נעול').length).toBeGreaterThan(0);
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('shows a Repeat decision and preserves the completed attempt', async () => {
    const user = userEvent.setup();
    const keys = program.weeks[0].workouts.filter((workout) => workout.required !== false).map((workout) => `${program.weeks[0].key}:${workout.key}`);
    useAppStore.setState({ managedProgramEnrollments: [{ ...enrollment(), completedWorkoutKeys: keys, assessedWorkoutKeys: keys }] });
    renderPage();
    expect(await screen.findByText('Repeating this stage may be useful')).toBeInTheDocument();
    expect(screen.getAllByText('Completed below target')).toHaveLength(keys.length);
    await user.click(screen.getByRole('button', { name: 'Repeat Week 1' }));
    const stored = useAppStore.getState().managedProgramEnrollments[0];
    expect(stored.currentWeekKey).toBe(program.weeks[0].key);
    expect(stored.stageAttempts).toHaveLength(2);
    expect(stored.stageAttempts?.[0]).toMatchObject({ decision: 'repeated', completedWorkoutKeys: keys });
    expect(storageService.loadAppData().managedProgramEnrollments[0].stageAttempts).toHaveLength(2);
  });

  it('continues to the next stage after an Advance recommendation', async () => {
    const user = userEvent.setup();
    const keys = program.weeks[0].workouts.filter((workout) => workout.required !== false).map((workout) => `${program.weeks[0].key}:${workout.key}`);
    useAppStore.setState({ managedProgramEnrollments: [{ ...enrollment(), completedWorkoutKeys: keys, successfulWorkoutKeys: keys, assessedWorkoutKeys: keys }] });
    renderPage();
    expect(await screen.findByText('Ready for the next stage')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue to Week 2' }));
    expect(useAppStore.getState().managedProgramEnrollments[0].currentWeekKey).toBe(program.weeks[1].key);
  });
});
