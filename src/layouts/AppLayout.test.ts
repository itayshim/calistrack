import { describe, expect, it } from 'vitest';
import { isTabActive } from '../utils/navigation';

describe('navigation route matching', () => {
  it.each(['/program', '/program/new', '/program/program-id'])(
    'activates only Program on %s',
    (path) => {
      expect(isTabActive('/program', path)).toBe(true);
      expect(isTabActive('/workout', path)).toBe(false);
    },
  );

  it.each(['/workout', '/workout/session-id'])('activates only Workout on %s', (path) => {
    expect(isTabActive('/workout', path)).toBe(true);
    expect(isTabActive('/program', path)).toBe(false);
  });
});
