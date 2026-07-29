import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createInitialData } from './data/seed';
import { restAlertService } from './services/restAlert';
import { storageService } from './services/storage';
import { useAppStore } from './store/useAppStore';

describe('application startup', () => {
  afterEach(() => vi.restoreAllMocks());
  it('loads the redesigned dashboard without falling into the error boundary', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /Build strength/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
  it('claims a completed rest period once in Strict Mode and uses the latest selected settings', async () => {
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
    render(
      <StrictMode>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </StrictMode>,
    );
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(play).toHaveBeenCalledWith({
      soundId: 'sharp-alert',
      repeatCount: 3,
      vibrationEnabled: true,
    });
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
});
