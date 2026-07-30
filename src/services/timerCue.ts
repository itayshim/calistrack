interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, startTime: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
  exponentialRampToValueAtTime(value: number, endTime: number): void;
}

interface OscillatorLike {
  type: OscillatorType;
  frequency: AudioParamLike;
  connect(destination: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
  onended: ((event: Event) => void) | null;
}

interface GainLike {
  gain: AudioParamLike;
  connect(destination: unknown): void;
}

interface AudioContextLike {
  currentTime: number;
  destination: unknown;
  state: string;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  resume(): Promise<void>;
  close(): Promise<void>;
}

type ContextFactory = () => AudioContextLike;

const defaultContextFactory: ContextFactory = () => {
  const Context = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error('audio_unsupported');
  return new Context();
};

export class TimerCueService {
  private context: AudioContextLike | null = null;
  private generation = 0;

  constructor(private readonly createContext: ContextFactory = defaultContextFactory) {}

  async playRoundCompletion(enabled = true) {
    this.stop();
    if (!enabled) return;
    const generation = this.generation;
    let context: AudioContextLike | null = null;
    try {
      context = this.createContext();
      this.context = context;
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation) return;
      const start = context.currentTime + 0.02;
      this.scheduleTone(context, start, 0.15, 440);
      this.scheduleTone(context, start + 0.27, 0.15, 494);
      this.scheduleTone(context, start + 0.54, 0.62, 523, true);
    } catch {
      if (context) await this.release(context);
    }
  }

  stop() {
    this.generation += 1;
    if (this.context) void this.release(this.context);
  }

  private scheduleTone(
    context: AudioContextLike,
    start: number,
    duration: number,
    frequency: number,
    releaseAfter = false,
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.025);
    gain.gain.setValueAtTime(0.18, start + Math.max(0.03, duration - 0.09));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    if (releaseAfter) oscillator.onended = () => void this.release(context);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private async release(context: AudioContextLike) {
    if (this.context === context) this.context = null;
    if (context.state === 'closed') return;
    try {
      await context.close();
    } catch {
      // Short completion cues are best-effort on browsers with restricted audio.
    }
  }
}

export const timerCueService = new TimerCueService();
