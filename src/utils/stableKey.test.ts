import { describe, expect, it } from 'vitest';
import { isValidStableKey, normalizeStableKey } from './stableKey';

describe('stable exercise keys', () => {
  it.each([
    ['L-Sit Pull-Up', 'l-sit-pull-up'],
    ['l_sit_pull_up', 'l-sit-pull-up'],
    ['  Weighted___Pull--Up  ', 'weighted-pull-up'],
    ['Push-Up! (Advanced)', 'push-up-advanced'],
  ])('normalizes %s to lowercase kebab-case', (input, expected) => {
    expect(normalizeStableKey(input)).toBe(expected);
  });

  it('accepts only database-compatible stable keys', () => {
    expect(isValidStableKey('l-sit-pull-up')).toBe(true);
    expect(isValidStableKey('l_sit_pull_up')).toBe(false);
    expect(isValidStableKey('-pull-up')).toBe(false);
  });
});
