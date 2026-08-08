import pushUp from './push-up.svg';
import pullUp from './pull-up.svg';
import parallelBarDip from './parallel-bar-dip.svg';
import hollowBodyHold from './hollow-body-hold.svg';
import handstand from './handstand.svg';
import type { ExerciseVisualAsset } from '../../../types';

export const pilotExerciseVisuals = [
  { stableKey: 'push-up', src: pushUp, fileSizeBytes: 659 },
  { stableKey: 'pull-up', src: pullUp, fileSizeBytes: 766 },
  { stableKey: 'parallel-bar-dip', src: parallelBarDip, fileSizeBytes: 871 },
  { stableKey: 'hollow-body-hold', src: hollowBodyHold, fileSizeBytes: 574 },
  { stableKey: 'handstand', src: handstand, fileSizeBytes: 695 },
].map((visual): ExerciseVisualAsset => ({
  ...visual,
  mimeType: 'image/svg+xml',
  format: 'svg',
  viewBox: '0 0 256 256',
}));
