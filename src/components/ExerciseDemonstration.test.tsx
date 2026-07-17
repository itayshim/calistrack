import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { MemoryRouter } from 'react-router-dom';
import { builtInExercises } from '../data/exercises';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { Exercise } from '../types';
import { WorkoutPage } from '../pages/WorkoutPage';
import {
  ExerciseDemonstrationButton,
} from './ExerciseDemonstration';
import { hasExerciseDemonstration } from '../utils/exerciseLocalization';

const incline = builtInExercises.find((exercise) => exercise.nameEn === 'Incline Push-Up')!;
const exerciseWithMedia: Exercise = {
  ...incline,
  media: [
    {
      id: 'secondary',
      exerciseId: incline.id,
      mediaType: 'youtube',
      provider: 'youtube',
      externalUrl: 'https://youtu.be/abcdefghijk',
      title: 'Secondary view',
      sortOrder: 0,
      isPrimary: false,
      isPublished: true,
    },
    {
      id: 'primary',
      exerciseId: incline.id,
      mediaType: 'youtube',
      provider: 'youtube',
      externalUrl: 'https://youtu.be/lmnopqrstuv',
      title: 'Primary view',
      sortOrder: 5,
      isPrimary: true,
      isPublished: true,
    },
    {
      id: 'draft',
      exerciseId: incline.id,
      mediaType: 'youtube',
      provider: 'youtube',
      externalUrl: 'https://youtu.be/zyxwvutsrqp',
      title: 'Unpublished view',
      sortOrder: -1,
      isPrimary: false,
      isPublished: false,
    },
  ],
};

function renderButton(exercise = exerciseWithMedia) {
  return render(
    <I18nProvider>
      <ExerciseDemonstrationButton exercise={exercise} />
    </I18nProvider>,
  );
}

describe('exercise demonstration viewer', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createInitialData(),
      settings: { ...createInitialData().settings, language: 'en' },
    });
  });
  afterEach(cleanup);

  it('shows a demonstration action for Incline Push-Up and primary published media first', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'How to perform it' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Incline Push-Up' })).toBeInTheDocument();
    expect(within(dialog).getByTitle('Primary view')).toHaveAttribute(
      'src',
      expect.stringContaining('lmnopqrstuv'),
    );
    expect(within(dialog).queryByText('Unpublished view')).not.toBeInTheDocument();
    expect(dialog.className).toContain('max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)]');
  });

  it('does not expose an action without published media or useful instructions', () => {
    const empty = {
      ...incline,
      instructions: [],
      instructionsHe: [],
      media: [{ ...exerciseWithMedia.media![2] }],
    };
    expect(hasExerciseDemonstration(empty)).toBe(false);
    renderButton(empty);
    expect(screen.queryByRole('button', { name: 'How to perform it' })).not.toBeInTheDocument();
  });

  it('opens and closes without changing workout state', async () => {
    const user = userEvent.setup();
    const activeWorkout = {
      id: 'active-1',
      workoutName: 'My workout',
      startedAt: new Date().toISOString(),
      status: 'active' as const,
      currentExerciseIndex: 0,
      exercises: [{
        id: 'session-exercise',
        exerciseId: incline.id,
        sets: [],
        skipped: false,
      }],
    };
    useAppStore.setState({ activeWorkout });
    renderButton();
    await user.click(screen.getByRole('button', { name: 'How to perform it' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(useAppStore.getState().activeWorkout).toEqual(activeWorkout);
  });

  it('preserves the entered set value when opened from an active workout', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      exercises: [exerciseWithMedia],
      activeWorkout: {
        id: 'active-workout',
        workoutName: 'User workout',
        startedAt: new Date().toISOString(),
        status: 'active',
        currentExerciseIndex: 0,
        exercises: [{
          id: 'active-exercise',
          exerciseId: exerciseWithMedia.id,
          target: {
            id: 'target-1',
            exerciseId: exerciseWithMedia.id,
            order: 0,
            targetSets: 3,
            targetMin: 8,
            targetMax: 12,
            restSeconds: 60,
          },
          sets: [],
          skipped: false,
        }],
      },
    });
    render(
      <MemoryRouter>
        <I18nProvider><WorkoutPage /></I18nProvider>
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/reps.*Set 1/i);
    await user.type(input, '11');
    await user.click(screen.getByRole('button', { name: 'How to perform it' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(input).toHaveValue(11);
    expect(screen.getByText('User workout')).toBeInTheDocument();
  });

  it('renders the Hebrew action and localized exercise name', async () => {
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, language: 'he' },
    });
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'איך מבצעים' }));
    expect(screen.getByRole('heading', { name: incline.nameHe })).toBeInTheDocument();
  });
});
