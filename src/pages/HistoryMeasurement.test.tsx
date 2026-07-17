import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { builtInExercises } from '../data/exercises';
import { useAppStore } from '../store/useAppStore';
import type { WorkoutSession } from '../types';
import { HistoryDetailPage } from './HistoryDetailPage';

function renderHistory(session: WorkoutSession) {
  useAppStore.setState({
    ...createInitialData(),
    hydrated: true,
    workoutSessions: [session],
  });
  render(
    <MemoryRouter initialEntries={[`/history/${session.id}`]}>
      <I18nProvider>
        <Routes><Route path="/history/:id" element={<HistoryDetailPage />} /></Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('metric-specific workout history', () => {
  beforeEach(() => localStorage.clear());
  it('renders duration sets with seconds instead of repetitions', () => {
    const plank = builtInExercises.find((exercise) => exercise.nameEn === 'Plank')!;
    renderHistory({
      id: 'duration-history',
      workoutName: 'Hold workout',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:10:00Z',
      status: 'completed',
      currentExerciseIndex: 0,
      exercises: [{
        id: 'hold',
        exerciseId: plank.id,
        measurementType: 'duration',
        skipped: false,
        sets: [{ id: 'set', setNumber: 1, durationSeconds: 18, completed: true }],
      }],
    });
    expect(screen.getByLabelText('Hold time')).toHaveValue(18);
    expect(screen.getByText('seconds')).toBeInTheDocument();
  });
  it('renders repetitions and decimal added weight as separate historical values', () => {
    const weighted = builtInExercises.find((exercise) => exercise.nameEn === 'Weighted Pull-Up')!;
    renderHistory({
      id: 'weighted-history',
      workoutName: 'Weighted workout',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:10:00Z',
      status: 'completed',
      currentExerciseIndex: 0,
      exercises: [{
        id: 'weighted',
        exerciseId: weighted.id,
        measurementType: 'weighted_reps',
        skipped: false,
        sets: [{ id: 'set', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true }],
      }],
    });
    expect(screen.getByLabelText('Repetitions')).toHaveValue(6);
    expect(screen.getByLabelText('Added weight (kg)')).toHaveValue(7.5);
  });
});
