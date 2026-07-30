import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createInitialData } from './data/seed';
import { restAlertService } from './services/restAlert';
import { backgroundNotificationService } from './services/backgroundNotifications';
import { storageService } from './services/storage';
import { useAppStore } from './store/useAppStore';

describe('application startup', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });
  it('loads the redesigned dashboard without falling into the error boundary', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /Build strength/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
  it('restores an already-ended timer visually without retroactively claiming foreground delivery', async () => {
    const data = createInitialData();
    data.settings.restCompletionSound = 'sharp-alert';
    data.settings.restAlertRepeatCount = 3;
    data.restTimer = {
      id: 'completed-rest',
      endsAt: Date.now() - 10,
      duration: 1,
      pausedRemaining: null,
    };
    storageService.saveAppData(data);
    const play = vi.spyOn(restAlertService, 'play').mockResolvedValue();
    const mark = vi
      .spyOn(backgroundNotificationService, 'markForegroundCompletionHandled')
      .mockResolvedValue(true);
    render(
      <StrictMode>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('calistrack.app.v1') ?? '{}').restTimer.id).toBeNull(),
    );
    expect(play).not.toHaveBeenCalled();
    expect(mark).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('calistrack.app.v1') ?? '{}').restTimer.id).toBeNull();
  });
  it('uses a sound changed while the current rest period is still running', async () => {
    const data = createInitialData();
    data.settings.restCompletionSound = 'classic';
    data.restTimer = {
      id: 'active-rest',
      endsAt: Date.now() + 150,
      duration: 1,
      pausedRemaining: null,
    };
    storageService.saveAppData(data);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const play = vi.spyOn(restAlertService, 'play').mockResolvedValue();
    render(<MemoryRouter><App /></MemoryRouter>);
    await waitFor(() => expect(useAppStore.getState().hydrated).toBe(true));
    useAppStore.getState().setSettings({
      ...useAppStore.getState().settings,
      restCompletionSound: 'gym-buzzer',
      restAlertRepeatCount: 2,
    });
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(play).toHaveBeenCalledWith(expect.objectContaining({
      soundId: 'gym-buzzer',
      repeatCount: 2,
    }));
  });

  it('does not mark or play a completion while the client is hidden', async () => {
    const data = createInitialData();
    data.settings.backgroundTimerNotifications = true;
    data.restTimer = {
      id: 'background-rest',
      endsAt: Date.now() + 100,
      duration: 1,
      pausedRemaining: null,
    };
    storageService.saveAppData(data);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    vi.spyOn(backgroundNotificationService, 'reconcile').mockResolvedValue({
      status: 'enabled',
      permission: 'granted',
      browserSubscription: true,
      backendRegistration: true,
    });
    vi.spyOn(backgroundNotificationService, 'sync').mockResolvedValue();
    const cancel = vi.spyOn(backgroundNotificationService, 'cancel').mockResolvedValue();
    const mark = vi
      .spyOn(backgroundNotificationService, 'markForegroundCompletionHandled')
      .mockResolvedValue(true);
    const play = vi.spyOn(restAlertService, 'play').mockResolvedValue();
    render(<MemoryRouter><App /></MemoryRouter>);
    await waitFor(() => expect(useAppStore.getState().restTimer.id).toBeNull());
    expect(mark).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('marks the exact completion only after a visible focused foreground alert is attempted', async () => {
    const data = createInitialData();
    data.settings.backgroundTimerNotifications = true;
    data.restTimer = {
      id: 'foreground-rest',
      endsAt: Date.now() + 100,
      duration: 1,
      pausedRemaining: null,
    };
    storageService.saveAppData(data);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(backgroundNotificationService, 'reconcile').mockResolvedValue({
      status: 'enabled',
      permission: 'granted',
      browserSubscription: true,
      backendRegistration: true,
    });
    vi.spyOn(backgroundNotificationService, 'sync').mockResolvedValue();
    const mark = vi
      .spyOn(backgroundNotificationService, 'markForegroundCompletionHandled')
      .mockResolvedValue(true);
    const play = vi.spyOn(restAlertService, 'play').mockResolvedValue();
    render(<MemoryRouter><App /></MemoryRouter>);
    await waitFor(() => expect(mark).toHaveBeenCalledOnce());
    expect(play).toHaveBeenCalledOnce();
    expect(mark).toHaveBeenCalledWith(expect.objectContaining({
      completionId: 'foreground-rest',
      visibilityState: 'visible',
      hasFocus: true,
    }));
  });
});
