import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { beginnerProgram, createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { WorkoutSession } from '../types';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';
import { SettingsPage } from './SettingsPage';

const completedSession: WorkoutSession = {
  id: 'session-1',
  workoutName: 'try',
  startedAt: '2026-07-17T10:00:00Z',
  completedAt: '2026-07-17T10:20:00Z',
  status: 'completed',
  currentExerciseIndex: 0,
  difficultyRating: 4,
  exercises: [{
    id: 'exercise-session-1',
    exerciseId: 'builtin-push-up',
    skipped: false,
    sets: [{ id: 'set-1', setNumber: 1, value: 10, completed: true }],
  }],
};

function renderPage(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <I18nProvider>{page}</I18nProvider>
    </MemoryRouter>,
  );
}

describe('remaining Hebrew localization and administrator entry', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createInitialData(),
      hydrated: true,
      programs: [beginnerProgram],
      workoutSessions: [completedSession],
      settings: { ...createInitialData().settings, language: 'he' },
    });
  });
  afterEach(cleanup);

  it('localizes the dashboard while preserving user-created workout content', () => {
    renderPage(<DashboardPage />);
    expect(screen.getByText('השבוע')).toBeInTheDocument();
    expect(screen.getByText('מתוך')).toBeInTheDocument();
    expect(screen.getByText('היעד הנוכחי')).toBeInTheDocument();
    expect(screen.getByText('שיא אישי')).toBeInTheDocument();
    expect(screen.getByText('האימון האחרון')).toBeInTheDocument();
    expect(screen.getByText('try')).toBeInTheDocument();
    expect(screen.queryByText('This week')).not.toBeInTheDocument();
    expect(screen.queryByText('Current goal')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'יעד אימונים שבועי' }).closest('.surface-panel'))
      .toBeInTheDocument();
  });

  it('localizes history metrics and navigation', () => {
    renderPage(<HistoryPage />);
    expect(screen.getByText('דק׳')).toBeInTheDocument();
    expect(screen.getByText('סטים')).toBeInTheDocument();
    expect(screen.getByText('מאמץ')).toBeInTheDocument();
    expect(screen.queryByText(/Effort/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bmin\b/)).not.toBeInTheDocument();
  });

  it('offers an in-app administrator sign-in entry from settings', () => {
    renderPage(<SettingsPage />);
    const entry = screen.getByRole('link', { name: 'כניסת מנהל' });
    expect(entry).toHaveAttribute('href', '/admin/login');
  });
});
