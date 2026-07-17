import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { Program } from '../types';
import { ProgramEditorPage } from './ProgramEditorPage';

function renderEditor(path = '/program/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <Routes>
          <Route path="/program/new" element={<ProgramEditorPage />} />
          <Route path="/program/:id" element={<ProgramEditorPage />} />
          <Route path="/program" element={<div>Programs</div>} />
        </Routes>
      </I18nProvider>
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
    const hold = screen.getByRole('group', { name: 'Target hold' });
    expect(within(hold).getByLabelText('Target hold Minimum')).toBeInTheDocument();
    expect(within(hold).getByLabelText('Target hold Maximum')).toBeInTheDocument();
    expect(within(hold).getByText('seconds')).toBeInTheDocument();
    expect(hold.querySelector('[dir="ltr"]')).toBeInTheDocument();
  });
  it('shows decimal added-weight targets only for weighted repetitions', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add workout day' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.type(screen.getByPlaceholderText('Search squats, dips, handstands...'), 'Weighted Pull-Up');
    await user.click(screen.getAllByRole('button', { name: /Weighted Pull-Up/ })[0]);
    expect(screen.getByRole('group', { name: 'Target reps' })).toBeInTheDocument();
    const weight = screen.getByLabelText('Added weight');
    expect(weight).toHaveAttribute('step', '0.5');
    expect(weight).toHaveAttribute('min', '0');
    expect(weight.closest('label')).toHaveTextContent('kg');
  });

  it('keeps regular repetition targets in one grouped range without a weight field', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add workout day' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    await user.type(screen.getByPlaceholderText('Search squats, dips, handstands...'), 'Pull-Up');
    await user.click(screen.getByRole('button', { name: 'Pull-UpPull-Up · intermediate' }));
    const reps = screen.getByRole('group', { name: 'Target reps' });
    expect(within(reps).getByLabelText('Target reps Minimum')).toBeInTheDocument();
    expect(within(reps).getByLabelText('Target reps Maximum')).toBeInTheDocument();
    expect(screen.queryByLabelText('Added weight')).not.toBeInTheDocument();
    expect(reps.parentElement).toHaveClass('grid-cols-1', 'md:grid-cols-2');
  });

  it('renders compact weighted controls with natural Hebrew labels and isolated ranges', () => {
    const now = '2026-01-01';
    const program: Program = {
      id: 'hebrew-program',
      name: 'תוכנית',
      createdAt: now,
      updatedAt: now,
      workouts: [{
        id: 'hebrew-workout',
        programId: 'hebrew-program',
        name: 'אימון',
        scheduledDays: [1],
        createdAt: now,
        updatedAt: now,
        exercises: [{
          id: 'weighted-target',
          exerciseId: 'builtin-weighted-pull-up',
          order: 0,
          targetSets: 3,
          targetMin: 8,
          targetMax: 12,
          targetAddedWeightKg: 10,
          restSeconds: 75,
          measurementType: 'weighted_reps',
        }],
      }],
    };
    useAppStore.setState({
      programs: [program],
      settings: { ...useAppStore.getState().settings, language: 'he' },
    });
    renderEditor('/program/hebrew-program');
    const reps = screen.getByRole('group', { name: 'טווח חזרות' });
    expect(reps.querySelector('[dir="ltr"]')).toBeInTheDocument();
    expect(screen.getByLabelText('משקל נוסף').closest('label')).toHaveTextContent('ק״ג');
    expect(screen.getByLabelText('מנוחה').closest('label')).toHaveTextContent('שניות');
  });
});
