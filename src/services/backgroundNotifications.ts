import type { RestTimerState } from '../types';
import { supabaseConfigured, supabasePublicFunctionRequest } from './supabase';

const DEVICE_TOKEN_KEY = 'calistrack.push.device-token';

export interface PushSupport {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
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

const serializeSubscription = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  };
};

export class BackgroundNotificationService {
  async enable(): Promise<NotificationPermission> {
    const support = getPushSupport();
    if (!support.supported || !supabaseConfigured) return 'denied';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey) throw new Error('Push is not configured');
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      }));
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      action: 'register',
      deviceToken: getDeviceToken(),
      subscription: serializeSubscription(subscription),
    });
    return permission;
  }

  async disable() {
    if (!getPushSupport().supported || !supabaseConfigured) return;
    await supabasePublicFunctionRequest('rest-notification-schedule', {
      action: 'disable',
      deviceToken: getDeviceToken(),
    });
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
