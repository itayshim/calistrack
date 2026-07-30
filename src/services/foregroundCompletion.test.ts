import { describe, expect, it } from 'vitest';
import { canHandleForegroundCompletion } from './foregroundCompletion';

const base = {
  expectedCompletionId: 'rest-current',
  activeCompletionId: 'rest-current',
  visibilityState: 'visible' as const,
  hasFocus: true,
  inactiveAtDeadline: false,
};

describe('foreground rest completion ownership', () => {
  it('allows only a visible focused client with the exact completion ID', () => {
    expect(canHandleForegroundCompletion(base)).toBe(true);
  });

  it('rejects hidden and unfocused clients', () => {
    expect(canHandleForegroundCompletion({ ...base, visibilityState: 'hidden' })).toBe(false);
    expect(canHandleForegroundCompletion({ ...base, hasFocus: false })).toBe(false);
  });

  it('rejects stale or unrelated completion IDs', () => {
    expect(
      canHandleForegroundCompletion({ ...base, activeCompletionId: 'rest-newer' }),
    ).toBe(false);
    expect(canHandleForegroundCompletion({ ...base, activeCompletionId: null })).toBe(false);
  });

  it('rejects a client that resumes after being inactive at the deadline', () => {
    expect(canHandleForegroundCompletion({ ...base, inactiveAtDeadline: true })).toBe(false);
  });
});
