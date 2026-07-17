import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';
import { ProgramEditorPage } from './ProgramEditorPage';

function renderEditor(path = '/program/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/program/new" element={<ProgramEditorPage />} />
        <Route path="/program/:id" element={<ProgramEditorPage />} />
        <Route path="/program" element={<div>Programs</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('program weekday selection', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), hydrated: true, toast: null });
  });

  it('selects multiple days, deselects one and saves the selection', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add workout day' }));
    const monday = screen.getByRole('button', { name: 'Select Monday' });
    await user.click(monday);
    await user.click(screen.getByRole('button', { name: 'Select Wednesday' }));
    expect(monday).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Deselect Monday' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(useAppStore.getState().programs[0].workouts[0].scheduledDays).toEqual([3]);
  });

  it('restores selected days when editing an existing program', () => {
    const program: Program = {
      id: 'saved-program',
      name: 'Saved program',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      workouts: [
        {
          id: 'saved-workout',
          programId: 'saved-program',
          name: 'Workout A',
          scheduledDays: [1, 5],
          exercises: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    };
    useAppStore.setState({ programs: [program] });
    renderEditor('/program/saved-program');
    expect(screen.getByRole('button', { name: 'Deselect Monday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Deselect Friday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('shows duration targets when a timed hold is added', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add workout day' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.type(screen.getByPlaceholderText('Search squats, dips, handstands...'), 'Tuck L-Sit');
    await user.click(screen.getAllByRole('button', { name: /Tuck L-Sit/ })[0]);
    expect(screen.getByText(/Target duration.*Minimum/)).toBeInTheDocument();
    expect(screen.getByText(/Target duration.*Maximum/)).toBeInTheDocument();
  });
  it('shows decimal added-weight targets only for weighted repetitions', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add workout day' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.type(screen.getByPlaceholderText('Search squats, dips, handstands...'), 'Weighted Pull-Up');
    await user.click(screen.getAllByRole('button', { name: /Weighted Pull-Up/ })[0]);
    const weight = screen.getByLabelText('Target added weight');
    expect(weight).toHaveAttribute('step', '0.5');
    expect(weight).toHaveAttribute('min', '0');
  });
});
