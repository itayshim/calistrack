import { afterEach, describe, expect, it, vi } from 'vitest';
import { REST_SOUND_REGISTRY, getRestSound, normalizeRestSoundId } from './restSounds';
import { RestAlertService } from './restAlert';

function audioHarness() {
  const audio = {
    src: '',
    currentTime: 0,
    preload: '',
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    onended: null as ((event: Event) => void) | null,
  };
  return { audio, factory: vi.fn(() => audio) };
}

describe('rest sound registry', () => {
  it('contains all eight stable sound choices and safely falls back to Classic', () => {
    expect(REST_SOUND_REGISTRY.map((sound) => sound.id)).toEqual([
      'classic', 'bell', 'digital-beep', 'double-beep',
      'gym-buzzer', 'sharp-alert', 'chime', 'silent',
    ]);
    expect(normalizeRestSoundId('removed-sound')).toBe('classic');
    expect(getRestSound('silent').assetPath).toBeNull();
  });
});

describe('rest alert playback', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
  ] as const)('plays repeat count %s exactly %s time(s)', async (repeatCount, expected) => {
    vi.useFakeTimers();
    const { audio, factory } = audioHarness();
    const service = new RestAlertService(factory);
    const completion = service.play({
      soundId: 'classic',
      repeatCount,
      vibrationEnabled: false,
    });
    await vi.runAllTimersAsync();
    await completion;
    expect(audio.play).toHaveBeenCalledTimes(expected);
  });

  it('stops a previous preview before playing a new selection', async () => {
    const { audio, factory } = audioHarness();
    const service = new RestAlertService(factory);
    await service.preview('bell');
    await service.preview('sharp-alert');
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.src).toContain('rest-sharp-alert.wav');
  });

  it('never creates or plays audio for Silent', async () => {
    const { factory } = audioHarness();
    const service = new RestAlertService(factory);
    await service.preview('silent');
    expect(factory).not.toHaveBeenCalled();
  });

  it('vibrates only when enabled and safely supports missing vibration APIs', async () => {
    const vibrate = vi.fn(() => true);
    const first = audioHarness();
    await new RestAlertService(first.factory, vibrate).play({
      soundId: 'silent',
      repeatCount: 2,
      vibrationEnabled: true,
    });
    expect(vibrate).toHaveBeenCalledWith([200, 120, 200]);

    const second = audioHarness();
    await new RestAlertService(second.factory, vibrate).play({
      soundId: 'silent',
      repeatCount: 1,
      vibrationEnabled: false,
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    await expect(new RestAlertService(second.factory, undefined).play({
      soundId: 'silent',
      repeatCount: 1,
      vibrationEnabled: true,
    })).resolves.toBeUndefined();
  });

  it('does not expose an automatic audio-unlock path and releases the player after playback', async () => {
    const { audio, factory } = audioHarness();
    const service = new RestAlertService(factory);
    expect('unlock' in service).toBe(false);
    await service.play({ soundId: 'gym-buzzer', repeatCount: 1, vibrationEnabled: false });
    expect(audio.play).toHaveBeenCalledOnce();
    audio.onended?.(new Event('ended'));
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(audio.src).toBe('');
  });
});
