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
  disconnect(): void;
  start(when?: number): void;
  stop(when?: number): void;
  onended: ((event: Event) => void) | null;
}

interface GainLike {
  gain: AudioParamLike;
  connect(destination: unknown): void;
  disconnect(): void;
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

const diagnostic = (event: string, state: string, result?: string) => {
  if (import.meta.env.DEV) {
    console.debug('[timer-cue]', { event, contextState: state, result });
  }
};

export class TimerCueService {
  private context: AudioContextLike | null = null;
  private activeOscillators = new Set<OscillatorLike>();
  private generation = 0;

  constructor(private readonly createContext: ContextFactory = defaultContextFactory) {}

  async unlock(enabled = true) {
    if (!enabled) return false;
    try {
      const context = this.ensureContext();
      if (context.state === 'suspended') await context.resume();
      this.primeSilently(context);
      diagnostic('audio_unlocked', context.state, 'ready');
      return context.state === 'running';
    } catch {
      diagnostic('audio_unlock', this.context?.state ?? 'unavailable', 'rejected');
      return false;
    }
  }

  async playRoundCompletion(enabled = true) {
    this.cancelActiveCue();
    if (!enabled) return;
    const generation = this.generation;
    try {
      const context = this.ensureContext();
      diagnostic('cue_requested', context.state);
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation || context.state !== 'running') {
        diagnostic('cue_completed', context.state, 'rejected');
        return;
      }
      const start = context.currentTime + 0.02;
      this.scheduleTone(context, start, 0.15, 440);
      this.scheduleTone(context, start + 0.27, 0.15, 494);
      this.scheduleTone(context, start + 0.54, 0.62, 523, true);
      diagnostic('cue_completed', context.state, 'scheduled');
    } catch {
      diagnostic('cue_completed', this.context?.state ?? 'unavailable', 'rejected');
    }
  }

  stop() {
    this.cancelActiveCue();
  }

  async dispose() {
    this.cancelActiveCue();
    const context = this.context;
    this.context = null;
    if (!context || context.state === 'closed') return;
    try {
      await context.close();
    } catch {
      // Audio cleanup is best-effort.
    }
  }

  private ensureContext() {
    if (!this.context || this.context.state === 'closed') {
      this.context = this.createContext();
    }
    return this.context;
  }

  private primeSilently(context: AudioContextLike) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.001);
  }

  private scheduleTone(
    context: AudioContextLike,
    start: number,
    duration: number,
    frequency: number,
    finalTone = false,
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.025);
    gain.gain.setValueAtTime(0.28, start + Math.max(0.03, duration - 0.09));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    this.activeOscillators.add(oscillator);
    oscillator.onended = () => {
      this.activeOscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
      if (finalTone) diagnostic('cue_nodes_released', context.state, 'complete');
    };
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private cancelActiveCue() {
    this.generation += 1;
    for (const oscillator of this.activeOscillators) {
      oscillator.onended = null;
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {
        // The node may already have ended.
      }
    }
    this.activeOscillators.clear();
  }
}

export const timerCueService = new TimerCueService();
