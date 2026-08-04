import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement } from 'react';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import { isTabActive } from '../utils/navigation';
import { AppLayout } from './AppLayout';

describe('navigation route matching', () => {
  afterEach(cleanup);
  it.each(['/program', '/program/new', '/program/program-id'])(
    'activates only Program on %s',
    (path) => {
      expect(isTabActive('/program', path)).toBe(true);
      expect(isTabActive('/workout', path)).toBe(false);
    },
  );

  it.each(['/workout', '/workout/session-id'])('activates only Workout on %s', (path) => {
    expect(isTabActive('/workout', path)).toBe(true);
    expect(isTabActive('/program', path)).toBe(false);
  });

  it('shows a persistent mobile return entry only while a workout is active', () => {
    const initial = createInitialData();
    useAppStore.setState({
      ...initial,
      hydrated: true,
      activeWorkout: {
        id: 'active-session',
        programId: 'program',
        workoutName: 'Workout',
        startedAt: '2026-08-04T10:00:00Z',
        status: 'active',
        currentExerciseIndex: 0,
        exercises: [],
      },
    });
    render(createElement(MemoryRouter, { initialEntries: ['/settings'] },
      createElement(I18nProvider, null,
        createElement(Routes, null,
          createElement(Route, { element: createElement(AppLayout) },
            createElement(Route, { path: '/settings', element: createElement('div', null, 'Settings content') }),
          ),
        ),
      ),
    ));
    const entry = screen.getByTestId('active-workout-return');
    expect(entry).toHaveAttribute('href', '/workout/active-session');
    expect(screen.getByText('Settings content').closest('main')).toHaveClass('has-active-workout');
    act(() => useAppStore.setState({ activeWorkout: null }));
    expect(screen.queryByTestId('active-workout-return')).not.toBeInTheDocument();
  });
});
