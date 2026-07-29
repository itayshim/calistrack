import type { RestAlertRepeatCount, RestSoundId } from '../types';
import { getRestSound } from './restSounds';

interface AudioPlayer {
  src: string;
  currentTime: number;
  muted: boolean;
  preload: string;
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
}

type AudioFactory = () => AudioPlayer;
type Vibrate = (pattern: number | number[]) => boolean;

export interface RestAlertOptions {
  soundId: RestSoundId;
  repeatCount: RestAlertRepeatCount;
  vibrationEnabled: boolean;
}

export class RestAlertService {
  private audio: AudioPlayer | null = null;
  private timers = new Set<number>();
  private generation = 0;

  constructor(
    private readonly createAudio: AudioFactory = () => new Audio(),
    private readonly vibrate: Vibrate | undefined =
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
        ? navigator.vibrate.bind(navigator)
        : undefined,
  ) {}

  preload(soundId: RestSoundId) {
    const sound = getRestSound(soundId);
    if (!sound.assetPath) return;
    const audio = this.ensureAudio();
    if (audio.src !== this.absolute(sound.assetPath)) {
      audio.src = sound.assetPath;
      audio.preload = 'auto';
      audio.load();
    }
  }

  async unlock(soundId: RestSoundId) {
    const sound = getRestSound(soundId);
    if (!sound.assetPath) return;
    const audio = this.ensureAudio();
    audio.src = sound.assetPath;
    audio.preload = 'auto';
    audio.load();
    audio.muted = true;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Browsers may still reject silent initialization. A later explicit preview can unlock it.
    } finally {
      audio.muted = false;
    }
  }

  play(options: RestAlertOptions): Promise<void> {
    this.stop();
    const sound = getRestSound(options.soundId);
    const generation = this.generation;
    if (options.vibrationEnabled) {
      try {
        this.vibrate?.(options.repeatCount === 1 ? [250] : [200, 120, 200]);
      } catch {
        // Vibration support is optional.
      }
    }
    if (!sound.assetPath) return Promise.resolve();
    const audio = this.ensureAudio();
    audio.src = sound.assetPath;
    audio.preload = 'auto';
    audio.load();
    const playOnce = async () => {
      if (generation !== this.generation) return;
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
    };
    const tasks: Promise<void>[] = [playOnce()];
    for (let index = 1; index < options.repeatCount; index += 1) {
      tasks.push(new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.timers.delete(timer);
          void playOnce().then(resolve, reject);
        }, sound.spacingMs * index);
        this.timers.add(timer);
      }));
    }
    return Promise.all(tasks).then(() => undefined);
  }

  preview(soundId: RestSoundId): Promise<void> {
    return this.play({ soundId, repeatCount: 1, vibrationEnabled: false });
  }

  stop() {
    this.generation += 1;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  private ensureAudio() {
    this.audio ??= this.createAudio();
    return this.audio;
  }

  private absolute(path: string) {
    return typeof window === 'undefined' ? path : new URL(path, window.location.href).href;
  }
}

export const restAlertService = new RestAlertService();
