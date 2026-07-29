import type { RestSoundId } from '../types';
import type { TranslationKey } from '../locales/translations';

export interface RestSoundDefinition {
  id: RestSoundId;
  assetPath: string | null;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  spacingMs: number;
}

export const REST_SOUND_REGISTRY: readonly RestSoundDefinition[] = [
  { id: 'classic', assetPath: '/audio/rest-classic.wav', nameKey: 'restSoundClassic', descriptionKey: 'restSoundClassicDescription', spacingMs: 650 },
  { id: 'bell', assetPath: '/audio/rest-bell.wav', nameKey: 'restSoundBell', descriptionKey: 'restSoundBellDescription', spacingMs: 900 },
  { id: 'digital-beep', assetPath: '/audio/rest-digital-beep.wav', nameKey: 'restSoundDigitalBeep', descriptionKey: 'restSoundDigitalBeepDescription', spacingMs: 650 },
  { id: 'double-beep', assetPath: '/audio/rest-double-beep.wav', nameKey: 'restSoundDoubleBeep', descriptionKey: 'restSoundDoubleBeepDescription', spacingMs: 900 },
  { id: 'gym-buzzer', assetPath: '/audio/rest-gym-buzzer.wav', nameKey: 'restSoundGymBuzzer', descriptionKey: 'restSoundGymBuzzerDescription', spacingMs: 1200 },
  { id: 'sharp-alert', assetPath: '/audio/rest-sharp-alert.wav', nameKey: 'restSoundSharpAlert', descriptionKey: 'restSoundSharpAlertDescription', spacingMs: 750 },
  { id: 'chime', assetPath: '/audio/rest-chime.wav', nameKey: 'restSoundChime', descriptionKey: 'restSoundChimeDescription', spacingMs: 1000 },
  { id: 'silent', assetPath: null, nameKey: 'restSoundSilent', descriptionKey: 'restSoundSilentDescription', spacingMs: 0 },
] as const;

const soundIds = new Set<RestSoundId>(REST_SOUND_REGISTRY.map((sound) => sound.id));

export function normalizeRestSoundId(value: unknown): RestSoundId {
  return typeof value === 'string' && soundIds.has(value as RestSoundId)
    ? (value as RestSoundId)
    : 'classic';
}

export function getRestSound(value: unknown): RestSoundDefinition {
  const id = normalizeRestSoundId(value);
  return REST_SOUND_REGISTRY.find((sound) => sound.id === id) ?? REST_SOUND_REGISTRY[0];
}
