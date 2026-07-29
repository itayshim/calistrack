import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { builtInExercises } from '../data/exercises';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { Exercise, WorkoutSession } from '../types';
import { ProgressPage } from './ProgressPage';

const byName = (name: string) =>
  builtInExercises.find((exercise) => exercise.nameEn === name)!;

function completedSession(
  id: string,
  exercise: Exercise,
  completedAt: string,
  value: number,
): WorkoutSession {
  const set =
    exercise.measurementType === 'duration'
      ? { durationSeconds: value }
      : exercise.measurementType === 'weighted_reps'
        ? { reps: 6, addedWeightKg: value }
        : { reps: value };
  return {
    id,
    workoutName: 'Workout',
    startedAt: completedAt,
    completedAt,
    status: 'completed',
    currentExerciseIndex: 0,
    exercises: [{
      id: `${id}-exercise`,
      exerciseId: exercise.id,
      measurementType: exercise.measurementType,
      skipped: false,
      sets: [{ id: `${id}-set`, setNumber: 1, completed: true, ...set }],
    }],
  };
}

describe('Progress exercise scope', () => {
  const pushUp = byName('Push-Up');
  const pullUp = byName('Pull-Up');
  const squat = byName('Bodyweight Squat');

  beforeEach(() => {
    const data = createInitialData();
    useAppStore.setState({
      ...data,
      exercises: [pushUp, pullUp, squat],
      workoutSessions: [
        completedSession('older', pushUp, '2026-07-20T10:00:00Z', 10),
        completedSession('recent', pullUp, '2026-07-27T10:00:00Z', 7),
      ],
      hydrated: true,
      toast: null,
    });
  });
  afterEach(cleanup);

  it('defaults to history, selects the most recent exercise, and excludes unperformed exercises', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><ProgressPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'With history' })).toHaveAttribute('aria-pressed', 'true');
    const selector = screen.getByRole('combobox', { name: 'Exercise' });
    expect(selector).toHaveTextContent('Pull-Up');
    await user.click(selector);
    const listbox = screen.getByRole('listbox', { name: 'Exercise' });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Pull-Up');
    expect(options[0]).toHaveTextContent('Last performed');
    expect(screen.queryByRole('option', { name: /Bodyweight Squat/ })).not.toBeInTheDocument();
  });

  it('reveals unperformed exercises in All exercises and shows their explicit empty state', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><ProgressPage /></I18nProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'All exercises' }));
    const selector = screen.getByRole('combobox', { name: 'Exercise' });
    await user.click(selector);
    await user.click(screen.getByRole('option', { name: 'Bodyweight Squat' }));
    expect(screen.getByRole('heading', { name: 'No progress for this exercise yet' })).toBeInTheDocument();
  });

  it('searches only inside the selected scope', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><ProgressPage /></I18nProvider></MemoryRouter>);
    const selector = screen.getByRole('combobox', { name: 'Exercise' });
    await user.click(selector);
    await user.type(screen.getByPlaceholderText('Search exercises'), 'squat');
    expect(screen.queryByRole('option', { name: 'Bodyweight Squat' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'All exercises' }));
    await user.click(selector);
    await user.type(screen.getByPlaceholderText('Search exercises'), 'squat');
    expect(screen.getByRole('option', { name: 'Bodyweight Squat' })).toBeInTheDocument();
  });

  it('shows a dedicated empty state when the account has no completed history', () => {
    useAppStore.setState({ workoutSessions: [] });
    render(<MemoryRouter><I18nProvider><ProgressPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'No exercise progress yet' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Exercise' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View program' })).toHaveAttribute('href', '/program');
  });

  it('renders the scope and empty state in Hebrew RTL content', () => {
    useAppStore.setState({
      workoutSessions: [],
      settings: { ...useAppStore.getState().settings, language: 'he' },
    });
    render(<MemoryRouter><I18nProvider><ProgressPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'עם היסטוריה' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'עדיין אין התקדמות בתרגילים' })).toBeInTheDocument();
  });
});
