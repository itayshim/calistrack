import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { MeasurementType, WorkoutSession, WorkoutSet } from '../types';
import { WorkoutPage } from './WorkoutPage';

const active = (exerciseId: string, measurementType: MeasurementType): WorkoutSession => ({
  id: 'active',
  workoutName: 'Training',
  startedAt: '2026-07-17T10:00:00.000Z',
  status: 'active',
  currentExerciseIndex: 0,
  exercises: [{
    id: 'active-exercise',
    exerciseId,
    measurementType,
    target: {
      id: 'target',
      exerciseId,
      order: 0,
      targetSets: 3,
      targetMin: measurementType === 'duration' ? 20 : 5,
      targetMax: measurementType === 'duration' ? 30 : 8,
      restSeconds: 60,
      measurementType,
    },
    sets: [],
    skipped: false,
  }],
});

const history = (
  exerciseId: string,
  measurementType: MeasurementType,
  sets: WorkoutSet[],
): WorkoutSession => ({
  id: 'history',
  workoutName: 'Earlier',
  startedAt: '2026-07-12T10:00:00.000Z',
  completedAt: '2026-07-12T10:30:00.000Z',
  status: 'completed',
  currentExerciseIndex: 0,
  exercises: [{
    id: 'history-exercise',
    exerciseId,
    measurementType,
    sets,
    skipped: false,
  }],
});

function renderWorkout(
  exerciseId: string,
  measurementType: MeasurementType,
  previousSets: WorkoutSet[] = [],
  language: 'en' | 'he' = 'en',
) {
  const initial = createInitialData();
  useAppStore.setState({
    ...initial,
    settings: { ...initial.settings, language },
    activeWorkout: active(exerciseId, measurementType),
    workoutSessions: previousSets.length
      ? [history(exerciseId, measurementType, previousSets)]
      : [],
    hydrated: true,
  });
  return render(
    <MemoryRouter>
      <I18nProvider><WorkoutPage /></I18nProvider>
    </MemoryRouter>,
  );
}

describe('active workout previous performance and replacement UX', () => {
  afterEach(cleanup);
  beforeEach(() => localStorage.clear());

  it('shows matching previous repetitions and copies without completing', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps', [
      { id: 'set-1', setNumber: 1, reps: 10, completed: true },
    ]);
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(10);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('shows and copies duration performance', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-l-sit', 'duration', [
      { id: 'set-1', setNumber: 1, durationSeconds: 24, completed: true },
    ]);
    expect(screen.getByText('24 sec')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('Hold time — Set 1')).toHaveValue(24);
  });

  it('shows and copies weighted performance with decimal weight', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-weighted-pull-up', 'weighted_reps', [
      { id: 'set-1', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true },
    ]);
    expect(screen.getByText(/6 reps/)).toBeInTheDocument();
    expect(screen.getByText(/\+7.5 kg/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(6);
    expect(screen.getByLabelText('Added weight (kg)')).toHaveValue(7.5);
  });

  it('shows a clear no-history state and disables historical copy', () => {
    renderWorkout('builtin-pull-up', 'reps');
    expect(screen.getByText('No previous performance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use previous workout' })).toBeDisabled();
  });

  it('copies the immediately preceding current-workout set', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    useAppStore.setState((state) => {
      const next = structuredClone(state.activeWorkout)!;
      next.exercises[0].sets = [{ id: 'current-1', setNumber: 1, reps: 8, completed: true }];
      return { activeWorkout: next };
    });
    await user.click(screen.getByRole('button', { name: 'Copy previous set' }));
    expect(screen.getByLabelText('reps — Set 2')).toHaveValue(8);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
  });

  it('preserves copied input while opening and closing demonstration media', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps', [
      { id: 'set-1', setNumber: 1, reps: 9, completed: true },
    ]);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    await user.click(screen.getByRole('button', { name: 'How to perform it' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(9);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('opens a viewport-contained ranked replacement sheet', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-weighted-pull-up', 'weighted_reps');
    await user.click(screen.getByRole('button', { name: 'Replace exercise' }));
    const sheet = screen.getByRole('dialog', { name: 'Replace exercise' });
    expect(sheet).toHaveClass('max-h-[min(90dvh,52rem)]', 'overflow-y-auto');
    expect(screen.getAllByText('Same movement family').length).toBeGreaterThan(0);
  });

  it('renders Hebrew actions in RTL mode', () => {
    renderWorkout('builtin-pull-up', 'reps', [], 'he');
    expect(screen.getByRole('button', { name: 'השתמש באימון הקודם' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'החלפת תרגיל' })).toBeInTheDocument();
  });
});
