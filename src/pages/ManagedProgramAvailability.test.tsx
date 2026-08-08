import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { beginnerCalisthenics12Week } from '../features/programs/beginnerCalisthenics12Week';
import { compileManagedWorkout } from '../features/programs/managedProgram';
import { installManagedPrograms } from '../services/managedPrograms';
import { useAppStore } from '../store/useAppStore';
import { ManagedProgramPage } from './ManagedProgramPage';
import { ProgramsPage } from './ProgramsPage';

const key = beginnerCalisthenics12Week.key;
const unavailable = [{
  contentType: 'managed_program' as const,
  builtinKey: key,
  availability: 'unpublished' as const,
  updatedAt: '2026-08-08T00:00:00.000Z',
}];

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={[`/programs/managed/${key}`]}>
      <I18nProvider>
        <Routes><Route path="/programs/managed/:programKey" element={<ManagedProgramPage />} /></Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('built-in Managed Program public availability', () => {
  beforeEach(() => {
    useAppStore.setState({ ...createInitialData(), hydrated: true });
    installManagedPrograms([]);
  });
  afterEach(() => {
    cleanup();
    installManagedPrograms([]);
  });

  it('removes an unpublished built-in from the normal catalogue', () => {
    render(<MemoryRouter><I18nProvider><ProgramsPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByText(beginnerCalisthenics12Week.nameEn)).toBeInTheDocument();
    act(() => installManagedPrograms([], unavailable));
    expect(screen.queryByText(beginnerCalisthenics12Week.nameEn)).not.toBeInTheDocument();
  });

  it('does not expose an unavailable direct route to a user without an enrollment', () => {
    installManagedPrograms([], unavailable);
    renderDetail();
    expect(screen.getByRole('heading', { name: 'Program unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enroll/ })).not.toBeInTheDocument();
  });

  it('keeps an existing enrollment readable but blocks new progression', () => {
    useAppStore.setState({ managedProgramEnrollments: [{
      id: 'enrollment', programKey: key, programVersion: 1, startDate: '2026-08-01',
      currentWeekKey: beginnerCalisthenics12Week.weeks[0].key,
      completedWorkoutKeys: [], skippedWorkoutKeys: [], preferredWeekdays: [],
      status: 'active', detached: false,
    }] });
    installManagedPrograms([], unavailable);
    renderDetail();
    expect(screen.getByText('This Program is no longer publicly available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start workout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Advance to next week' })).not.toBeInTheDocument();
  });

  it('does not destroy an active workout or completed history when availability changes', () => {
    const definition = beginnerCalisthenics12Week;
    const firstWeek = definition.weeks[0];
    const firstWorkout = firstWeek.workouts[0];
    const store = useAppStore.getState();
    store.startWorkout(compileManagedWorkout(definition, firstWeek.key, firstWorkout.key, store.exercises));
    const activeId = useAppStore.getState().activeWorkout?.id;
    const history = [{
      id: 'history', workoutName: 'Historical Program workout', startedAt: '2026-08-01',
      completedAt: '2026-08-01', status: 'completed' as const, currentExerciseIndex: 0,
      exercises: [], managedProgramLink: { source: 'managed_program' as const, programKey: key, version: 1, weekKey: firstWeek.key, workoutKey: firstWorkout.key },
    }];
    useAppStore.setState({ workoutSessions: history });
    installManagedPrograms([], unavailable);
    expect(useAppStore.getState().activeWorkout?.id).toBe(activeId);
    expect(useAppStore.getState().workoutSessions).toEqual(history);
  });
});
