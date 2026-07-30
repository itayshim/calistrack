import { describe, expect, it, vi } from 'vitest';
import { TimerCueService } from './timerCue';

function contextHarness() {
  const oscillators: Array<{
    type: OscillatorType;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
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
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('does not create audio when timer sounds are disabled', async () => {
    const factory = vi.fn(() => contextHarness().context);
    await new TimerCueService(factory).playRoundCompletion(false);
    expect(factory).not.toHaveBeenCalled();
  });

  it('closes the prior cue before scheduling another one', async () => {
    const first = contextHarness();
    const second = contextHarness();
    const factory = vi.fn()
      .mockReturnValueOnce(first.context)
      .mockReturnValueOnce(second.context);
    const service = new TimerCueService(factory);
    await service.playRoundCompletion();
    await service.playRoundCompletion();
    expect(first.context.close).toHaveBeenCalledOnce();
    expect(second.oscillators).toHaveLength(3);
  });
});
