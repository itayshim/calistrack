import type { RestTimerState } from '../types';
import {
  SupabaseApiError,
  supabaseConfigured,
  supabasePublicFunctionRequest,
} from './supabase';

const DEVICE_TOKEN_KEY = 'calistrack.push.device-token';

export type PushRegistrationStatus =
  | 'unsupported'
  | 'permission-default'
  | 'permission-denied'
  | 'device-unregistered'
  | 'server-unregistered'
  | 'enabled'
  | 'enabling'
  | 'disabling'
  | 'error';

export interface PushRegistrationState {
  status: PushRegistrationStatus;
  permission: NotificationPermission | 'unsupported';
  browserSubscription: boolean;
  backendRegistration: boolean;
  errorCategory?: 'configuration' | 'browser' | 'registration' | 'network';
}

export interface PushSupport {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
}

interface RegistrationStatusResponse {
  registered: boolean;
}

export const buildRestNotificationRequest = (
  timer: RestTimerState,
  workoutId: string | undefined,
  language: 'en' | 'he',
) => ({
  action: timer.id && timer.endsAt ? ('schedule' as const) : ('cancel' as const),
  completionId: timer.id,
  workoutId,
  scheduledFor: timer.endsAt ? new Date(timer.endsAt).toISOString() : null,
  language,
});

export const getPushSupport = (): PushSupport => ({
  supported:
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window,
  permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
});

const base64UrlToBytes = (value: string) => {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const getDeviceToken = () => {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
};

export const serializePushSubscription = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      auth: json.keys?.auth,
      p256dh: json.keys?.p256dh,
    },
  };
};

const sameApplicationServerKey = (
  subscription: PushSubscription,
  currentKey: Uint8Array,
) => {
  const storedKey = subscription.options.applicationServerKey;
  if (!storedKey) return false;
  const stored = new Uint8Array(storedKey);
  return stored.length === currentKey.length && stored.every((byte, index) => byte === currentKey[index]);
};

const state = (
  status: PushRegistrationStatus,
  permission: PushRegistrationState['permission'],
  browserSubscription = false,
  backendRegistration = false,
  errorCategory?: PushRegistrationState['errorCategory'],
): PushRegistrationState => ({
  status,
  permission,
  browserSubscription,
  backendRegistration,
  errorCategory,
});

export class BackgroundNotificationService {
  private async backendStatus(subscription: PushSubscription) {
    return supabasePublicFunctionRequest<RegistrationStatusResponse>(
      'rest-notification-schedule',
      {
        action: 'status',
        deviceToken: getDeviceToken(),
        subscription: serializePushSubscription(subscription),
      },
    );
  }

  private async register(subscription: PushSubscription) {
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      action: 'register',
      deviceToken: getDeviceToken(),
      subscription: serializePushSubscription(subscription),
    });
  }

  async reconcile(repairMissingBackend = true): Promise<PushRegistrationState> {
    const support = getPushSupport();
    if (!support.supported || !supabaseConfigured) {
      return state('unsupported', 'unsupported');
    }
    if (support.permission === 'default') return state('permission-default', 'default');
    if (support.permission === 'denied') return state('permission-denied', 'denied');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return state('device-unregistered', 'granted');
      const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
      if (
        publicKey &&
        !sameApplicationServerKey(subscription, base64UrlToBytes(publicKey))
      ) {
        await subscription.unsubscribe().catch(() => false);
        await this.disableBackend().catch(() => undefined);
        return state('device-unregistered', 'granted');
      }

      const status = await this.backendStatus(subscription);
      if (status.registered) return state('enabled', 'granted', true, true);
      if (!repairMissingBackend) return state('server-unregistered', 'granted', true);

      try {
        await this.register(subscription);
        return state('enabled', 'granted', true, true);
      } catch {
        return state('server-unregistered', 'granted', true, false, 'registration');
      }
    } catch (error) {
      return state(
        'error',
        'granted',
        false,
        false,
        error instanceof SupabaseApiError && error.status === 0 ? 'network' : 'browser',
      );
    }
  }

  async enable(): Promise<PushRegistrationState> {
    const support = getPushSupport();
    if (!support.supported || !supabaseConfigured) {
      return state('unsupported', 'unsupported');
    }

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission === 'denied') return state('permission-denied', permission);
    if (permission !== 'granted') return state('permission-default', permission);

    const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey) return state('error', permission, false, false, 'configuration');

    try {
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = base64UrlToBytes(publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (subscription && !sameApplicationServerKey(subscription, applicationServerKey)) {
        await subscription.unsubscribe().catch(() => false);
        await this.disableBackend().catch(() => undefined);
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await this.register(subscription);
      return state('enabled', permission, true, true);
    } catch (error) {
      const browserSubscription = Boolean(
        await navigator.serviceWorker.ready
          .then((registration) => registration.pushManager.getSubscription())
          .catch(() => null),
      );
      return state(
        'error',
        permission,
        browserSubscription,
        false,
        error instanceof SupabaseApiError ? 'registration' : 'browser',
      );
    }
  }

  private async disableBackend() {
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      action: 'disable',
      deviceToken: getDeviceToken(),
    });
  }

  async disable(): Promise<PushRegistrationState> {
    const support = getPushSupport();
    const permission = support.permission;
    if (!support.supported) return state('unsupported', 'unsupported');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe().catch(() => false);
    } catch {
      // Browser state is already effectively disabled. Backend cleanup still runs below.
    }
    if (supabaseConfigured) {
      await this.disableBackend().catch(() => undefined);
    }
    return state(
      permission === 'denied' ? 'permission-denied' : 'device-unregistered',
      permission,
    );
  }

  async sync(
    timer: RestTimerState,
    workoutId: string | undefined,
    language: 'en' | 'he',
  ) {
    if (!getPushSupport().supported || Notification.permission !== 'granted' || !supabaseConfigured) {
      return;
    }
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      deviceToken: getDeviceToken(),
      ...buildRestNotificationRequest(timer, workoutId, language),
    });
  }

  async markHandled(completionId: string) {
    if (!supabaseConfigured) return;
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      action: 'handled',
      deviceToken: getDeviceToken(),
      completionId,
    }).catch(() => undefined);
    navigator.serviceWorker?.controller?.postMessage({
      type: 'REST_COMPLETION_HANDLED',
      completionId,
    });
  }
}

export const backgroundNotificationService = new BackgroundNotificationService();
