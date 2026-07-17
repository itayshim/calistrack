import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
