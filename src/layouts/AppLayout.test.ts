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

  it('shows an in-flow return entry on normal pages and removes it when the workout ends', () => {
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
        exercises: [{ id: 'session-exercise', exerciseId: initial.exercises[0].id, sets: [], skipped: false }],
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
    expect(entry).toHaveTextContent('Workout in progress');
    expect(entry).toHaveTextContent('Exercise 1 of 1');
    act(() => useAppStore.setState({ activeWorkout: null }));
    expect(screen.queryByTestId('active-workout-return')).not.toBeInTheDocument();
  });

  it('hides the global banner and mobile navigation on the focused workout runner', () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, hydrated: true, activeWorkout: {
      id: 'active-session', workoutName: 'Workout', startedAt: '2026-08-04T10:00:00Z', status: 'active', currentExerciseIndex: 0,
      exercises: [{ id: 'session-exercise', exerciseId: initial.exercises[0].id, sets: [], skipped: false }],
    } });
    render(createElement(MemoryRouter, { initialEntries: ['/workout/active-session'] }, createElement(I18nProvider, null,
      createElement(Routes, null, createElement(Route, { element: createElement(AppLayout) },
        createElement(Route, { path: '/workout/:id', element: createElement('div', null, 'Runner') }),
      )),
    )));
    expect(screen.queryByTestId('active-workout-return')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('portals the mobile navigation to the document body outside the scrolling app shell', () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, hydrated: true, activeWorkout: null });
    const view = render(createElement(MemoryRouter, { initialEntries: ['/settings'] }, createElement(I18nProvider, null,
      createElement(Routes, null, createElement(Route, { element: createElement(AppLayout) },
        createElement(Route, { path: '/settings', element: createElement('div', null, 'Settings') }),
      )),
    )));
    const navigation = screen.getByTestId('mobile-bottom-navigation');
    expect(navigation.parentElement).toBe(document.body);
    expect(navigation).toHaveClass('mobile-bottom-nav');
    expect(view.container.querySelector('.mobile-bottom-nav')).not.toBeInTheDocument();
  });

  it('rejects preview and stale active-session pointers', () => {
    const initial = createInitialData();
    const base = { id: 'preview', workoutName: 'Preview', startedAt: '2026-08-04T10:00:00Z', status: 'active' as const, currentExerciseIndex: 0,
      exercises: [{ id: 'session-exercise', exerciseId: initial.exercises[0].id, sets: [], skipped: false }] };
    useAppStore.setState({ ...initial, hydrated: true, activeWorkout: { ...base, skillLink: { skillKey: 'front-lever', levelKey: 'level-1', templateVersion: 1, kind: 'workout', linkState: 'linked', preview: true } } });
    const view = render(createElement(MemoryRouter, { initialEntries: ['/settings'] }, createElement(I18nProvider, null,
      createElement(Routes, null, createElement(Route, { element: createElement(AppLayout) }, createElement(Route, { path: '/settings', element: createElement('div', null, 'Settings') }))),
    )));
    expect(screen.queryByTestId('active-workout-return')).not.toBeInTheDocument();
    act(() => useAppStore.setState({ activeWorkout: { ...base, exercises: [], currentExerciseIndex: 0 } }));
    expect(screen.queryByTestId('active-workout-return')).not.toBeInTheDocument();
    view.unmount();
  });
});
