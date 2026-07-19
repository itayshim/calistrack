import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import { signInAdmin, supabaseRequest } from '../../services/supabase';
import { AdminLayout } from './AdminLayout';
import { AdminExercisesPage } from './AdminExercisesPage';

const SESSION_KEY = 'calistrack.admin.session';

function setSession(expiresAt = Date.now() + 3_600_000) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    accessToken: 'admin-token',
    refreshToken: 'refresh-token',
    expiresAt,
    userId: 'admin-1',
  }));
}

function renderAdmin(child: React.ReactNode = <div>Protected administrator content</div>) {
  return render(
    <MemoryRouter initialEntries={['/admin/exercises']}>
      <I18nProvider>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="exercises" element={child} />
          </Route>
          <Route path="/admin/login" element={<div>Administrator login page</div>} />
          <Route path="/" element={<div>Application home</div>} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('administrator session experience', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), hydrated: true });
    document.documentElement.dir = 'ltr';
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
  afterEach(cleanup);

  it('shows only one creation action on the exercise manager', () => {
    setSession();
    renderAdmin(<AdminExercisesPage />);
    expect(screen.getByTestId('admin-safe-area-shell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'New shared exercise' })).not.toBeInTheDocument();
  });

  it('sign out immediately locks and unmounts the administrator UI', async () => {
    setSession();
    const user = userEvent.setup();
    renderAdmin();
    expect(screen.getByText('Protected administrator content')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Administrator session expired' });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByText('Protected administrator content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('a protected 401 response immediately opens the blocking recovery dialog', async () => {
    setSession();
    renderAdmin();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'jwt_expired' }), { status: 401 }),
    );
    await expect(supabaseRequest('/rest/v1/global_exercises', {}, 'admin-token')).rejects.toMatchObject({ status: 401 });
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByText('Protected administrator content')).not.toBeInTheDocument();
  });

  it('offers working sign-in and return-to-app recovery actions', async () => {
    setSession();
    const user = userEvent.setup();
    const view = renderAdmin();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(screen.getByText('Administrator login page')).toBeInTheDocument();
    view.unmount();

    setSession();
    renderAdmin();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await user.click(screen.getByRole('button', { name: 'Return to app' }));
    expect(screen.getByText('Application home')).toBeInTheDocument();
  });

  it('restores protected content after a successful authentication event without refreshing', async () => {
    setSession();
    const user = userEvent.setup();
    renderAdmin();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        user: { id: 'admin-1' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }));
    await signInAdmin('admin@example.com', 'password');
    expect(await screen.findByText('Protected administrator content')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('traps focus, ignores Escape, and renders localized RTL recovery content', async () => {
    useAppStore.setState((state) => ({ settings: { ...state.settings, language: 'he' } }));
    document.documentElement.dir = 'rtl';
    setSession();
    const user = userEvent.setup();
    renderAdmin();
    await user.click(screen.getByRole('button', { name: 'התנתקות' }));
    const dialog = screen.getByRole('alertdialog', { name: 'פג תוקף החיבור למערכת הניהול' });
    const signIn = within(dialog).getByRole('button', { name: 'התחברות מחדש' });
    const returnToApp = within(dialog).getByRole('button', { name: 'חזרה לאפליקציה' });
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(signIn).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(returnToApp).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();
  });

  it('handles refresh-token failure without exposing a raw auth error', async () => {
    setSession(Date.now() + 30_000);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error_code: 'refresh_token_not_found' }), { status: 400 }),
    );
    renderAdmin();
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Your administrator session has expired.');
    expect(dialog).not.toHaveTextContent('refresh_token_not_found');
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toBeNull());
  });
});
