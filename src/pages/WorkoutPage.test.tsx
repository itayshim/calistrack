import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import type { MeasurementType, WorkoutSession, WorkoutSet } from '../types';
import { WorkoutPage } from './WorkoutPage';
import { restAlertService } from '../services/restAlert';
import { timerCueService } from '../services/timerCue';
import { createFrontLeverWorkout } from '../features/skills/frontLever';

const active = (exerciseId: string, measurementType: MeasurementType): WorkoutSession => ({
  id: 'active',
  programId: 'program-current',
  workoutTemplateId: 'workout-current',
  workoutName: 'Training',
  startedAt: '2026-07-17T10:00:00.000Z',
  status: 'active',
  currentExerciseIndex: 0,
  exercises: [
    {
      id: 'active-exercise',
      exerciseId,
      measurementType,
      target: {
        id: 'target',
        exerciseId,
        order: 0,
        targetSets: 3,
        targetMin: measurementType === 'duration' ? 20 : 5,
        targetMax: measurementType === 'duration' ? 30 : 8,
        restSeconds: 60,
        measurementType,
      },
      sets: [],
      skipped: false,
    },
  ],
});

const history = (
  exerciseId: string,
  measurementType: MeasurementType,
  sets: WorkoutSet[],
): WorkoutSession => ({
  id: 'history',
  programId: 'program-current',
  workoutTemplateId: 'workout-current',
  workoutName: 'Earlier',
  startedAt: '2026-07-12T10:00:00.000Z',
  completedAt: '2026-07-12T10:30:00.000Z',
  status: 'completed',
  currentExerciseIndex: 0,
  exercises: [
    {
      id: 'history-exercise',
      exerciseId,
      measurementType,
      sets,
      skipped: false,
    },
  ],
});

function renderWorkout(
  exerciseId: string,
  measurementType: MeasurementType,
  previousSets: WorkoutSet[] = [],
  language: 'en' | 'he' = 'en',
) {
  const initial = createInitialData();
  useAppStore.setState({
    ...initial,
    settings: { ...initial.settings, language },
    activeWorkout: active(exerciseId, measurementType),
    workoutSessions: previousSets.length
      ? [history(exerciseId, measurementType, previousSets)]
      : [],
    hydrated: true,
  });
  return render(
    <MemoryRouter>
      <I18nProvider>
        <WorkoutPage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('active workout previous performance and replacement UX', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  beforeEach(() => localStorage.clear());

  it('shows matching previous repetitions and copies without completing', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps', [
      { id: 'set-1', setNumber: 1, reps: 10, completed: true },
    ]);
    expect(screen.getAllByText('10 reps')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(10);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('records and restores a half repetition without rounding', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    const input = screen.getByLabelText(/Set 1/i);
    await user.type(input, '8.5');
    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].reps).toBe(8.5);
  });

  it('recovers the final repetitions input after an accidental Skip', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('button', { name: 'Back to workout' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to workout' }));
    expect(screen.getByLabelText(/Set 1/i)).toBeEnabled();
    await user.type(screen.getByLabelText(/Set 1/i), '8');
    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].reps).toBe(8);
  });

  it('does not play or initialize audio when a set is completed', async () => {
    const user = userEvent.setup();
    const play = vi.spyOn(restAlertService, 'play').mockResolvedValue();
    renderWorkout('builtin-pull-up', 'reps');
    await user.type(screen.getByLabelText(/Set 1/i), '8');
    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(play).not.toHaveBeenCalled();
    expect('unlock' in restAlertService).toBe(false);
  });

  it('excludes the countdown, applies two seconds, and preserves a manual duration override', async () => {
    const user = userEvent.setup();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    renderWorkout('builtin-l-sit', 'duration');
    expect(screen.getByText('3-second start countdown')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    now.mockReturnValue(27_000);
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByLabelText(/Recorded duration/)).toHaveValue(12);
    expect(screen.getByLabelText(/Recorded duration/)).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByText(/Measured/)).toBeInTheDocument();
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
    await user.clear(screen.getByLabelText(/Recorded duration/));
    expect(screen.getByLabelText(/Recorded duration/)).toHaveValue(null);
    await user.type(screen.getByLabelText(/Recorded duration/), '30');
    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].durationSeconds).toBe(30);
    now.mockRestore();
  });

  it('shows stable whole stopwatch seconds and rounds internal milliseconds on stop', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    renderWorkout('builtin-l-sit', 'duration');

    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    const stopwatchPanel = screen.getByRole('region', { name: 'Hold stopwatch' });
    expect(within(stopwatchPanel).getByText('3')).toBeInTheDocument();

    now.mockReturnValue(13_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(within(stopwatchPanel).getByText('00:00')).toBeInTheDocument();
    expect(within(stopwatchPanel).queryByText(/00:00\./)).not.toBeInTheDocument();

    now.mockReturnValue(17_600);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(within(stopwatchPanel).getByText('00:04')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByLabelText(/Recorded duration/)).toHaveValue(3);
  });

  it('uses the localized editable recorded-time field in Hebrew RTL', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    renderWorkout('builtin-l-sit', 'duration', [], 'he');
    fireEvent.click(screen.getByRole('button', { name: 'התחלת טיימר' }));
    now.mockReturnValue(18_000);
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'עצירה' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'עצירה' }));
    expect(screen.getByLabelText(/משך שנרשם/)).toHaveAttribute('inputmode', 'decimal');
  });

  it('plays exactly once only when an explicit duration countdown reaches zero', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const play = vi.spyOn(timerCueService, 'playRoundCompletion').mockResolvedValue();
    const unlock = vi.spyOn(timerCueService, 'unlock').mockResolvedValue(true);
    renderWorkout('builtin-l-sit', 'duration');
    fireEvent.click(screen.getByRole('button', { name: 'Start target countdown' }));
    expect(unlock).toHaveBeenCalledWith(true);
    expect(play).not.toHaveBeenCalled();
    const stopwatchPanel = screen.getByRole('region', { name: 'Hold stopwatch' });
    expect(within(stopwatchPanel).getByText('3')).toBeInTheDocument();

    now.mockReturnValue(12_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(within(stopwatchPanel).getByText('1')).toBeInTheDocument();
    expect(within(stopwatchPanel).queryByText('00:29')).not.toBeInTheDocument();

    now.mockReturnValue(13_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(within(stopwatchPanel).getByText('00:30')).toBeInTheDocument();

    now.mockReturnValue(43_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(play).toHaveBeenCalledOnce();
    expect(within(stopwatchPanel).getByText('00:00')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Hold time')[0]).toHaveValue(30);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
    const restId = useAppStore.getState().restTimer.id;
    expect(useAppStore.getState().restTimer.duration).toBe(60);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(play).toHaveBeenCalledOnce();
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
    expect(useAppStore.getState().restTimer.id).toBe(restId);
    now.mockRestore();
    vi.useRealTimers();
  });

  it('stops a target countdown early and drafts the precise achieved duration', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    vi.spyOn(timerCueService, 'unlock').mockResolvedValue(true);
    renderWorkout('builtin-l-sit', 'duration');
    fireEvent.click(screen.getByRole('button', { name: 'Start target countdown' }));
    now.mockReturnValue(30_420);
    await act(async () => vi.advanceTimersByTimeAsync(500));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByLabelText(/Hold time/)).toHaveValue(17.42);
    expect(screen.getByLabelText(/Hold time/)).toHaveAttribute('inputmode', 'decimal');
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
    expect(useAppStore.getState().exerciseStopwatch.targetReached).toBe(false);
  });

  it('defaults previous performance and best to the current program with an all-programs toggle', async () => {
    const user = userEvent.setup();
    const current = history('builtin-l-sit', 'duration', [
      { id: 'current-set', setNumber: 1, durationSeconds: 18, completed: true },
    ]);
    const other = {
      ...history('builtin-l-sit', 'duration', [
        { id: 'other-set', setNumber: 1, durationSeconds: 40, completed: true },
      ]),
      id: 'other-history',
      programId: 'program-other',
      completedAt: '2026-07-13T10:30:00.000Z',
      startedAt: '2026-07-13T10:00:00.000Z',
    };
    renderWorkout('builtin-l-sit', 'duration');
    act(() => useAppStore.setState({ workoutSessions: [current, other] }));
    expect(screen.getByText('Program best').parentElement).toHaveTextContent('18 sec');
    await user.click(screen.getByRole('button', { name: 'All programs' }));
    expect(screen.getByText('All-programs best').parentElement).toHaveTextContent('40 sec');
  });

  it('starts target countdown immediately when preparation is Off and respects Silent', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const play = vi.spyOn(timerCueService, 'playRoundCompletion').mockResolvedValue();
    const unlock = vi.spyOn(timerCueService, 'unlock').mockResolvedValue(false);
    renderWorkout('builtin-l-sit', 'duration');
    act(() => {
      useAppStore.setState((state) => ({
        settings: {
          ...state.settings,
          timedExerciseStartCountdownSeconds: 0,
          restCompletionSound: 'silent',
        },
      }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start target countdown' }));
    expect(unlock).toHaveBeenCalledWith(false);
    const stopwatchPanel = screen.getByRole('region', { name: 'Hold stopwatch' });
    expect(within(stopwatchPanel).getByText('00:30')).toBeInTheDocument();
    now.mockReturnValue(40_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(play).toHaveBeenCalledWith(false);
  });

  it('places the single Complete set action above the stopwatch and saves target auto-fill edits', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    vi.spyOn(timerCueService, 'unlock').mockResolvedValue(true);
    vi.spyOn(timerCueService, 'playRoundCompletion').mockResolvedValue();
    renderWorkout('builtin-l-sit', 'duration');
    const completeButton = screen.getByRole('button', { name: 'Complete set' });
    const stopwatchPanel = screen.getByRole('region', { name: 'Hold stopwatch' });
    expect(screen.getAllByRole('button', { name: 'Complete set' })).toHaveLength(1);
    expect(
      completeButton.compareDocumentPosition(stopwatchPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Start target countdown' }));
    now.mockReturnValue(43_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(33_000);
    });
    const durationInput = screen.getAllByLabelText('Hold time')[0];
    expect(durationInput).toHaveValue(30);
    const restId = useAppStore.getState().restTimer.id;
    const playCount = vi.mocked(timerCueService.playRoundCompletion).mock.calls.length;
    fireEvent.change(durationInput, { target: { value: '27' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(durationInput).toHaveValue(27);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets[0].durationSeconds).toBe(27);
    expect(useAppStore.getState().restTimer.id).toBe(restId);
    expect(timerCueService.playRoundCompletion).toHaveBeenCalledTimes(playCount);
  });

  it('rejects unsupported rep precision with localized feedback', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    await user.type(screen.getByLabelText(/Set 1/i), '8.25');
    expect(screen.getByText('Reps must be entered in increments of 0.5.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete set' })).toBeDisabled();
  });

  it('preserves half reps in previous performance and weighted inputs', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-weighted-pull-up', 'weighted_reps', [
      { id: 'set-half', setNumber: 1, reps: 6.5, addedWeightKg: 7.5, completed: true },
    ]);
    expect(screen.getAllByText(/6.5 reps/)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText(/Set 1/i)).toHaveValue(6.5);
  });

  it('shows and copies duration performance', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-l-sit', 'duration', [
      { id: 'set-1', setNumber: 1, durationSeconds: 24, completed: true },
    ]);
    expect(screen.getAllByText('24 sec')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('Hold time — Set 1')).toHaveValue(24);
  });

  it('shows and copies weighted performance with decimal weight', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-weighted-pull-up', 'weighted_reps', [
      { id: 'set-1', setNumber: 1, reps: 6, addedWeightKg: 7.5, completed: true },
    ]);
    expect(screen.getAllByText(/6 reps/)).toHaveLength(2);
    expect(screen.getAllByText(/\+7.5 kg/)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(6);
    expect(screen.getByLabelText('Added weight (kg)')).toHaveValue(7.5);
  });

  it('shows a clear no-history state and disables historical copy', () => {
    renderWorkout('builtin-pull-up', 'reps');
    expect(screen.getAllByText('No previous performance')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Use previous workout' })).toBeDisabled();
  });

  it('copies the immediately preceding current-workout set', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    useAppStore.setState((state) => {
      const next = structuredClone(state.activeWorkout)!;
      next.exercises[0].sets = [{ id: 'current-1', setNumber: 1, reps: 8, completed: true }];
      return { activeWorkout: next };
    });
    await user.click(screen.getByRole('button', { name: 'Copy previous set' }));
    expect(screen.getByLabelText('reps — Set 2')).toHaveValue(8);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(1);
  });

  it('preserves copied input while opening and closing demonstration media', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps', [
      { id: 'set-1', setNumber: 1, reps: 9, completed: true },
    ]);
    await user.click(screen.getByRole('button', { name: 'Use previous workout' }));
    await user.click(screen.getByRole('button', { name: 'How to perform it' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByLabelText('reps — Set 1')).toHaveValue(9);
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('opens a viewport-contained ranked replacement sheet', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-weighted-pull-up', 'weighted_reps');
    await user.click(screen.getByRole('button', { name: 'Replace exercise' }));
    const sheet = screen.getByRole('dialog', { name: 'Replace exercise' });
    expect(sheet).toHaveClass('max-h-[min(90dvh,52rem)]', 'overflow-y-auto');
    expect(screen.getAllByText('Same movement family').length).toBeGreaterThan(0);
  });

  it('uses a solid elevated action surface for replacement confirmation', async () => {
    const user = userEvent.setup();
    renderWorkout('builtin-pull-up', 'reps');
    await user.click(screen.getByRole('button', { name: 'Replace exercise' }));
    await user.click(screen.getAllByRole('button', { name: /Chin-Up/i })[0]);
    const confirmation = screen.getByTestId('replacement-confirmation');
    expect(confirmation).toHaveClass('action-surface');
    expect(confirmation).toHaveClass('pb-[max(1rem,env(safe-area-inset-bottom))]');
    expect(
      within(confirmation).getByRole('button', { name: 'Replace only this workout' }),
    ).toHaveClass('action-surface-button');
  });

  it('renders Hebrew actions in RTL mode', () => {
    renderWorkout('builtin-pull-up', 'reps', [], 'he');
    expect(screen.getByRole('button', { name: 'השתמש באימון הקודם' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'החלפת תרגיל' })).toBeInTheDocument();
  });

  it('runs warm-up as an optional non-recorded phase with Done instead of Complete Set', async () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, hydrated: true });
    useAppStore.getState().startWorkout(createFrontLeverWorkout('tuck', initial.exercises, true));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <I18nProvider>
          <WorkoutPage />
        </I18nProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Start warm-up' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start warm-up' }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete Set' })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(useAppStore.getState().restTimer.endsAt).toBeNull();
    expect(useAppStore.getState().activeWorkout?.exercises[0].sets).toHaveLength(0);
  });

  it('skips the whole warm-up into the official first work exercise', async () => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, hydrated: true });
    useAppStore.getState().startWorkout(createFrontLeverWorkout('tuck', initial.exercises, true));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <I18nProvider>
          <WorkoutPage />
        </I18nProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Skip warm-up' }));
    expect(await screen.findByRole('heading', { name: 'Tuck Front Lever' })).toBeInTheDocument();
    expect(useAppStore.getState().activeWorkout?.skillWarmup?.status).toBe('skipped');
  });
});
