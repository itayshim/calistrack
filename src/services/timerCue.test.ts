import { describe, expect, it, vi } from 'vitest';
import { TimerCueService } from './timerCue';

function contextHarness() {
  const oscillators: Array<{
    type: OscillatorType;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: ((event: Event) => void) | null;
  }> = [];
  const gains: Array<{
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const context = {
    currentTime: 1,
    destination: {},
    state: 'running',
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: 'sine' as OscillatorType,
        frequency: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as ((event: Event) => void) | null,
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => {
      const gain = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(gain);
      return gain;
    }),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { context, oscillators, gains };
}

describe('friendly target completion cue', () => {
  it('schedules two short warm tones followed by one longer tone', async () => {
    const { context, oscillators } = contextHarness();
    const service = new TimerCueService(() => context);
    await service.playRoundCompletion();

    expect(oscillators).toHaveLength(3);
    expect(oscillators.map((oscillator) => oscillator.frequency.value)).toEqual([440, 494, 523]);
    expect(oscillators.map((oscillator) => oscillator.start.mock.calls[0][0])).toEqual([
      1.02,
      1.29,
      1.56,
    ]);
    expect(oscillators.map((oscillator) =>
      Number((oscillator.stop.mock.calls[0][0] - oscillator.start.mock.calls[0][0]).toFixed(2)),
    )).toEqual([0.15, 0.15, 0.62]);
    oscillators[2].onended?.(new Event('ended'));
    expect(oscillators[2].disconnect).toHaveBeenCalledOnce();
    expect(context.close).not.toHaveBeenCalled();
  });

  it('unlocks and silently primes one reusable context during the start gesture', async () => {
    const { context, oscillators, gains } = contextHarness();
    context.state = 'suspended';
    context.resume.mockImplementation(async () => {
      context.state = 'running';
    });
    const factory = vi.fn(() => context);
    const service = new TimerCueService(factory);

    await expect(service.unlock()).resolves.toBe(true);
    expect(context.resume).toHaveBeenCalledOnce();
    expect(oscillators).toHaveLength(1);
    expect(gains[0].gain.value).toBe(0);
    await service.playRoundCompletion();
    expect(factory).toHaveBeenCalledOnce();
    expect(oscillators).toHaveLength(4);
  });

  it('does not create audio when timer sounds are disabled', async () => {
    const factory = vi.fn(() => contextHarness().context);
    await new TimerCueService(factory).playRoundCompletion(false);
    expect(factory).not.toHaveBeenCalled();
  });

  it('cancels prior cue nodes before scheduling another cue on the same context', async () => {
    const first = contextHarness();
    const factory = vi.fn(() => first.context);
    const service = new TimerCueService(factory);
    await service.playRoundCompletion();
    const priorOscillators = [...first.oscillators];
    await service.playRoundCompletion();
    expect(priorOscillators.every((oscillator) => oscillator.disconnect.mock.calls.length > 0))
      .toBe(true);
    expect(first.oscillators).toHaveLength(6);
    expect(factory).toHaveBeenCalledOnce();
  });
});
