import { describe, expect, it } from 'vitest';
import { buildRestNotificationRequest } from './backgroundNotifications';

describe('background rest notification scheduling', () => {
  it('uses the absolute timer timestamp and includes completion and workout identities', () => {
    expect(
      buildRestNotificationRequest(
        { id: 'rest-1', endsAt: 1_800_000_000_000, duration: 75, pausedRemaining: null },
        'workout-1',
        'he',
      ),
    ).toEqual({
      action: 'schedule',
      completionId: 'rest-1',
      workoutId: 'workout-1',
      scheduledFor: new Date(1_800_000_000_000).toISOString(),
      language: 'he',
    });
  });

  it('turns a skipped or paused timer into cancellation rather than a stale delivery', () => {
    expect(
      buildRestNotificationRequest(
        { id: null, endsAt: null, duration: 75, pausedRemaining: null },
        'workout-1',
        'en',
      ),
    ).toMatchObject({ action: 'cancel', completionId: null, scheduledFor: null });
  });
});
