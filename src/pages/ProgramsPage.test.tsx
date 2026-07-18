import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';
import { ProgramsPage } from './ProgramsPage';

const program: Program = {
  id: 'program-one',
  name: 'Strength plan',
  createdAt: '2026-07-01',
  updatedAt: '2026-07-01',
  workouts: [{
    id: 'workout-one',
    programId: 'program-one',
    name: 'Workout A',
    scheduledDays: [1],
    exercises: [{
      id: 'target-one',
      exerciseId: 'builtin-push-up',
      order: 0,
      targetSets: 3,
      targetMin: 8,
      targetMax: 12,
      restSeconds: 60,
      measurementType: 'reps',
      notes: 'Controlled',
    }],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  }],
};

function renderPrograms() {
  return render(
    <MemoryRouter initialEntries={['/program']}>
      <I18nProvider>
        <Routes>
          <Route path="/program" element={<ProgramsPage />} />
          <Route path="/program/:id" element={<div>Program editor</div>} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('program management actions', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      ...createInitialData(),
      programs: [structuredClone(program)],
      activeProgramId: 'program-one',
      hydrated: true,
      toast: null,
    });
  });

  it('opens an action menu instead of navigating and Edit opens the editor', async () => {
    const user = userEvent.setup();
    renderPrograms();
    await user.click(screen.getByRole('button', { name: /Program actions/ }));
    const menu = screen.getByRole('menu', { name: 'Program actions' });
    expect(within(menu).getByRole('menuitem', { name: 'Edit program' })).toBeInTheDocument();
    expect(screen.queryByText('Program editor')).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Edit program' }));
    expect(screen.getByText('Program editor')).toBeInTheDocument();
  });

  it('renames without changing workout contents', async () => {
    const user = userEvent.setup();
    renderPrograms();
    const before = structuredClone(useAppStore.getState().programs[0].workouts);
    await user.click(screen.getByRole('button', { name: /Program actions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename program' }));
    const input = screen.getByLabelText('Program name');
    await user.clear(input);
    await user.type(input, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(useAppStore.getState().programs[0].name).toBe('New name');
    expect(useAppStore.getState().programs[0].workouts).toEqual(before);
  });

  it('duplicates deeply with independent IDs without copying active or history state', async () => {
    const originalHistory = [{
      id: 'history',
      workoutName: 'Workout A',
      startedAt: '2026-07-01',
      completedAt: '2026-07-01',
      status: 'completed' as const,
      currentExerciseIndex: 0,
      exercises: [],
    }];
    useAppStore.setState({ workoutSessions: originalHistory });
    const user = userEvent.setup();
    renderPrograms();
    await user.click(screen.getByRole('button', { name: /Program actions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate program' }));
    const state = useAppStore.getState();
    expect(state.programs).toHaveLength(2);
    expect(state.programs[1].name).toBe('Strength plan — Copy');
    expect(state.programs[1].id).not.toBe(state.programs[0].id);
    expect(state.programs[1].workouts[0].id).not.toBe(state.programs[0].workouts[0].id);
    expect(state.programs[1].workouts[0].exercises[0].id).not.toBe(state.programs[0].workouts[0].exercises[0].id);
    expect(state.activeProgramId).toBe('program-one');
    expect(state.workoutSessions).toEqual(originalHistory);
  });

  it('sets an inactive program active and clears active state when it is deleted', async () => {
    const second = { ...structuredClone(program), id: 'program-two', name: 'Second', workouts: [] };
    useAppStore.setState({ programs: [program, second] });
    const user = userEvent.setup();
    renderPrograms();
    const menus = screen.getAllByRole('button', { name: /Program actions/ });
    await user.click(menus[1]);
    await user.click(screen.getByRole('menuitem', { name: 'Set as active program' }));
    expect(useAppStore.getState().activeProgramId).toBe('program-two');
    await user.click(screen.getAllByRole('button', { name: /Program actions/ })[1]);
    await user.click(screen.getByRole('menuitem', { name: 'Delete program' }));
    expect(screen.getByText(/without an active program/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete program' }));
    expect(useAppStore.getState().activeProgramId).toBeNull();
    expect(useAppStore.getState().programs).toHaveLength(1);
  });
});
