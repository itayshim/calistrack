import { beforeEach, describe, expect, it, vi } from 'vitest';

const functionRequest = vi.fn();
vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  supabasePublicFunctionRequest: (...args: unknown[]) => functionRequest(...args),
  SupabaseApiError: class SupabaseApiError extends Error {
    constructor(public code: string, public status: number) {
      super(code);
    }
  },
}));

import {
  BackgroundNotificationService,
  buildRestNotificationRequest,
} from './backgroundNotifications';

const makeSubscription = (applicationServerKey = new Uint8Array([1, 2, 3])) => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  return {
    endpoint: 'https://push.example/device',
    options: { applicationServerKey: applicationServerKey.buffer },
    toJSON: () => ({ keys: { p256dh: 'public-key', auth: 'auth-key' } }),
    unsubscribe,
  } as unknown as PushSubscription & { unsubscribe: ReturnType<typeof vi.fn> };
};

const installPushEnvironment = (subscription: PushSubscription | null) => {
  let current = subscription;
  const subscribe = vi.fn(async () => {
    current = makeSubscription();
    return current;
  });
  const getSubscription = vi.fn(async () => current);
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
  });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
  });
  return { getSubscription, subscribe, get current() { return current; } };
};

describe('background rest notification scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_WEB_PUSH_PUBLIC_KEY', 'AQID');
  });

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

  it('turns a skipped timer into cancellation rather than a stale delivery', () => {
    expect(
      buildRestNotificationRequest(
        { id: null, endsAt: null, duration: 75, pausedRemaining: null },
        'workout-1',
        'en',
      ),
    ).toMatchObject({ action: 'cancel', completionId: null, scheduledFor: null });
  });

  it('reports permission granted without a browser subscription as device unregistered', async () => {
    installPushEnvironment(null);
    await expect(new BackgroundNotificationService().reconcile()).resolves.toMatchObject({
      status: 'device-unregistered',
      permission: 'granted',
      browserSubscription: false,
      backendRegistration: false,
    });
  });

  it('distinguishes a browser subscription from a missing backend registration', async () => {
    installPushEnvironment(makeSubscription());
    functionRequest.mockResolvedValueOnce({ registered: false });
    await expect(new BackgroundNotificationService().reconcile(false)).resolves.toMatchObject({
      status: 'server-unregistered',
      browserSubscription: true,
      backendRegistration: false,
    });
  });

  it('repairs a missing or deleted backend row and becomes fully enabled', async () => {
    installPushEnvironment(makeSubscription());
    functionRequest.mockResolvedValueOnce({ registered: false }).mockResolvedValueOnce({ ok: true });
    await expect(new BackgroundNotificationService().reconcile()).resolves.toMatchObject({
      status: 'enabled',
      browserSubscription: true,
      backendRegistration: true,
    });
    expect(functionRequest).toHaveBeenLastCalledWith(
      'rest-notification-schedule',
      expect.objectContaining({ action: 'register' }),
    );
  });

  it('never reports enabled when backend registration fails and allows retry', async () => {
    installPushEnvironment(makeSubscription());
    functionRequest
      .mockResolvedValueOnce({ registered: false })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true });
    const service = new BackgroundNotificationService();
    await expect(service.reconcile()).resolves.toMatchObject({ status: 'server-unregistered' });
    await expect(service.enable()).resolves.toMatchObject({ status: 'enabled' });
  });

  it('disables idempotently when browser and backend registrations are already absent', async () => {
    installPushEnvironment(null);
    functionRequest.mockRejectedValueOnce(new Error('not found'));
    await expect(new BackgroundNotificationService().disable()).resolves.toMatchObject({
      status: 'device-unregistered',
      browserSubscription: false,
      backendRegistration: false,
    });
  });

  it('unsubscribes the browser even when backend cleanup is missing', async () => {
    const subscription = makeSubscription();
    installPushEnvironment(subscription);
    functionRequest.mockRejectedValueOnce(new Error('not found'));
    await new BackgroundNotificationService().disable();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it('replaces a subscription created with an obsolete VAPID key', async () => {
    const stale = makeSubscription(new Uint8Array([9, 9, 9]));
    const environment = installPushEnvironment(stale);
    functionRequest.mockResolvedValue({ ok: true });
    await expect(new BackgroundNotificationService().enable()).resolves.toMatchObject({
      status: 'enabled',
    });
    expect(stale.unsubscribe).toHaveBeenCalledOnce();
    expect(environment.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
  });

  it('detects VAPID rotation during reconciliation and removes the stale subscription', async () => {
    const stale = makeSubscription(new Uint8Array([9, 9, 9]));
    installPushEnvironment(stale);
    functionRequest.mockResolvedValue({ ok: true });
    await expect(new BackgroundNotificationService().reconcile()).resolves.toMatchObject({
      status: 'device-unregistered',
      browserSubscription: false,
      backendRegistration: false,
    });
    expect(stale.unsubscribe).toHaveBeenCalledOnce();
    expect(functionRequest).toHaveBeenCalledWith(
      'rest-notification-schedule',
      expect.objectContaining({ action: 'disable' }),
    );
  });
});
