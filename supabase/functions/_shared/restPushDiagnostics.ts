export interface PushErrorLike {
  name?: string;
  message?: string;
  statusCode?: number;
  status?: number;
  statusMessage?: string;
  statusText?: string;
  body?: unknown;
  headers?: unknown;
}

export interface CanonicalPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export class MalformedSubscriptionError extends Error {
  readonly code = 'malformed_push_subscription';

  constructor(public readonly missingField: 'endpoint' | 'auth' | 'p256dh') {
    super(`Push subscription is missing ${missingField}`);
    this.name = 'MalformedSubscriptionError';
  }
}

export const normalizePushSubscription = (
  value: unknown,
): { subscription: CanonicalPushSubscription; wasLegacy: boolean } => {
  if (!value || typeof value !== 'object') {
    throw new MalformedSubscriptionError('endpoint');
  }
  const candidate = value as {
    endpoint?: unknown;
    expirationTime?: unknown;
    auth?: unknown;
    p256dh?: unknown;
    keys?: { auth?: unknown; p256dh?: unknown };
  };
  if (typeof candidate.endpoint !== 'string' || !candidate.endpoint.trim()) {
    throw new MalformedSubscriptionError('endpoint');
  }
  try {
    const endpoint = new URL(candidate.endpoint);
    if (endpoint.protocol !== 'https:') throw new Error('not https');
  } catch {
    throw new MalformedSubscriptionError('endpoint');
  }
  const auth = candidate.keys?.auth ?? candidate.auth;
  const p256dh = candidate.keys?.p256dh ?? candidate.p256dh;
  if (typeof auth !== 'string' || !auth.trim()) {
    throw new MalformedSubscriptionError('auth');
  }
  if (typeof p256dh !== 'string' || !p256dh.trim()) {
    throw new MalformedSubscriptionError('p256dh');
  }
  return {
    subscription: {
      endpoint: candidate.endpoint,
      expirationTime:
        typeof candidate.expirationTime === 'number' ? candidate.expirationTime : null,
      keys: { auth, p256dh },
    },
    wasLegacy: !candidate.keys?.auth || !candidate.keys?.p256dh,
  };
};

export const subscriptionShapeDiagnostic = (value: unknown) => {
  const candidate = (value && typeof value === 'object' ? value : {}) as {
    endpoint?: unknown;
    auth?: unknown;
    p256dh?: unknown;
    keys?: { auth?: unknown; p256dh?: unknown };
  };
  const auth = candidate.keys?.auth ?? candidate.auth;
  const p256dh = candidate.keys?.p256dh ?? candidate.p256dh;
  return {
    endpointPresent: typeof candidate.endpoint === 'string' && candidate.endpoint.length > 0,
    authPresent: typeof auth === 'string' && auth.length > 0,
    p256dhPresent: typeof p256dh === 'string' && p256dh.length > 0,
    authLength: typeof auth === 'string' ? auth.length : 0,
    p256dhLength: typeof p256dh === 'string' ? p256dh.length : 0,
  };
};

export type DeliveryDisposition = 'sent' | 'expired' | 'retrying' | 'failed';

export interface DeliveryClassification {
  disposition: DeliveryDisposition;
  statusCode: number | null;
  code: string;
  reason: string;
  retryable: boolean;
}

const MAX_DIAGNOSTIC_LENGTH = 300;
const SECRET_FIELD_PATTERN =
  /("(?:auth|p256dh|authorization|private[_-]?key|endpoint)"\s*:\s*)"[^"]*"/gi;

export const sanitizeDiagnostic = (value: unknown): string => {
  let text =
    typeof value === 'string'
      ? value
      : value == null
        ? ''
        : (() => {
            try {
              return JSON.stringify(value);
            } catch {
              return String(value);
            }
          })();
  text = text
    .replace(SECRET_FIELD_PATTERN, '$1"[redacted]"')
    .replace(/https?:\/\/[^\s"',}]+/gi, '[redacted-url]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted-token]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  return text.slice(0, MAX_DIAGNOSTIC_LENGTH);
};

export const endpointHost = (endpoint: unknown): string => {
  if (typeof endpoint !== 'string') return 'invalid';
  try {
    return new URL(endpoint).hostname;
  } catch {
    return 'invalid';
  }
};

export const readPushError = (error: unknown): PushErrorLike => {
  if (!error || typeof error !== 'object') {
    return { name: 'Error', message: sanitizeDiagnostic(error) };
  }
  const candidate = error as PushErrorLike;
  return {
    name: sanitizeDiagnostic(candidate.name || 'Error'),
    message: sanitizeDiagnostic(candidate.message || 'Push delivery failed'),
    statusCode:
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : typeof candidate.status === 'number'
          ? candidate.status
          : undefined,
    body: sanitizeDiagnostic(candidate.body),
    statusMessage: sanitizeDiagnostic(candidate.statusMessage || candidate.statusText),
    headers: undefined,
  };
};

export const classifyPushResult = (
  error: unknown,
  responseStatus?: number,
): DeliveryClassification => {
  const parsed = readPushError(error);
  const statusCode = responseStatus ?? parsed.statusCode ?? null;
  const reason = sanitizeDiagnostic(parsed.body || parsed.message || 'Push delivery failed');
  if (statusCode === 201 || statusCode === 202) {
    return { disposition: 'sent', statusCode, code: 'delivered', reason: '', retryable: false };
  }
  if (statusCode === 404 || statusCode === 410) {
    return {
      disposition: 'expired',
      statusCode,
      code: 'subscription_expired',
      reason,
      retryable: false,
    };
  }
  if (statusCode === 429) {
    return { disposition: 'retrying', statusCode, code: 'rate_limited', reason, retryable: true };
  }
  if (statusCode !== null && statusCode >= 500) {
    return {
      disposition: 'retrying',
      statusCode,
      code: 'push_service_unavailable',
      reason,
      retryable: true,
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      disposition: 'failed',
      statusCode,
      code: 'vapid_authentication_failed',
      reason,
      retryable: false,
    };
  }
  return {
    disposition: 'failed',
    statusCode,
    code: 'malformed_subscription_or_encryption',
    reason,
    retryable: false,
  };
};

export interface VapidValidation {
  valid: boolean;
  publicKeyValid: boolean;
  privateKeyValid: boolean;
  subjectValid: boolean;
  publicKeyLength: number;
  privateKeyLength: number;
}

const decodeBase64Url = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
};

export const validateVapidConfiguration = (
  publicKey: string,
  privateKey: string,
  subject: string,
): VapidValidation => {
  const decodedPublicKey = decodeBase64Url(publicKey);
  const decodedPrivateKey = decodeBase64Url(privateKey);
  const publicKeyValid =
    decodedPublicKey?.length === 65 && decodedPublicKey[0] === 4;
  const privateKeyValid = decodedPrivateKey?.length === 32;
  const subjectValid =
    /^mailto:[^\s<>"']+@[^\s<>"']+$/.test(subject) ||
    /^https:\/\/[^\s<>"']+$/.test(subject);
  return {
    valid: publicKeyValid && privateKeyValid && subjectValid,
    publicKeyValid,
    privateKeyValid,
    subjectValid,
    publicKeyLength: publicKey.length,
    privateKeyLength: privateKey.length,
  };
};

export const retryDelaySeconds = (attemptCount: number) =>
  Math.min(15 * 60, 30 * 2 ** Math.max(0, attemptCount - 1));

export const planFailedDelivery = (
  classification: DeliveryClassification,
  attemptCount: number,
  maxAttempts = 5,
) => {
  const exhausted = classification.retryable && attemptCount >= maxAttempts;
  return {
    finalStatus:
      classification.disposition === 'retrying' && !exhausted
        ? ('retrying' as const)
        : ('failed' as const),
    errorCode: exhausted ? 'retry_exhausted' : classification.code,
    disableSubscription: classification.disposition === 'expired',
    retryAfterSeconds:
      classification.disposition === 'retrying' && !exhausted
        ? retryDelaySeconds(attemptCount)
        : null,
  };
};
