import { describe, expect, it } from 'vitest';
import {
  classifyPushResult,
  canForegroundHandleStatus,
  endpointHost,
  MalformedSubscriptionError,
  normalizePushSubscription,
  planFailedDelivery,
  retryDelaySeconds,
  sanitizeDiagnostic,
  validateVapidConfiguration,
} from './restPushDiagnostics';

describe('rest push delivery diagnostics', () => {
  it('allows foreground handling only before dispatch atomically claims delivery', () => {
    expect(canForegroundHandleStatus('scheduled')).toBe(true);
    expect(canForegroundHandleStatus('retrying')).toBe(true);
    expect(canForegroundHandleStatus('sending')).toBe(false);
    expect(canForegroundHandleStatus('sent')).toBe(false);
    expect(canForegroundHandleStatus('foreground_handled')).toBe(false);
  });
  it('accepts canonical PushSubscriptionJSON and preserves nested keys', () => {
    const value = {
      endpoint: 'https://push.example/device',
      expirationTime: null,
      keys: { auth: 'auth-value', p256dh: 'p256dh-value' },
    };
    expect(normalizePushSubscription(value)).toEqual({
      subscription: value,
      wasLegacy: false,
    });
  });

  it('normalizes a legacy flat subscription for web-push and marks it for in-place repair', () => {
    expect(normalizePushSubscription({
      endpoint: 'https://push.example/device',
      auth: 'legacy-auth',
      p256dh: 'legacy-p256dh',
    })).toEqual({
      subscription: {
        endpoint: 'https://push.example/device',
        expirationTime: null,
        keys: { auth: 'legacy-auth', p256dh: 'legacy-p256dh' },
      },
      wasLegacy: true,
    });
  });

  it.each([
    [{ keys: { auth: 'a', p256dh: 'p' } }, 'endpoint'],
    [{ endpoint: 'https://push.example/device', keys: { p256dh: 'p' } }, 'auth'],
    [{ endpoint: 'https://push.example/device', keys: { auth: 'a' } }, 'p256dh'],
  ])('rejects malformed subscriptions with a safe missing-field reason', (value, field) => {
    expect(() => normalizePushSubscription(value)).toThrowError(
      expect.objectContaining<Partial<MalformedSubscriptionError>>({
        name: 'MalformedSubscriptionError',
        missingField: field as 'endpoint' | 'auth' | 'p256dh',
      }),
    );
  });

  it('classifies successful Web Push responses as sent', () => {
    expect(classifyPushResult(null, 201)).toMatchObject({
      disposition: 'sent',
      code: 'delivered',
      retryable: false,
    });
  });

  it('exposes a sanitized 403 VAPID failure without credentials', () => {
    const result = classifyPushResult({
      statusCode: 403,
      name: 'WebPushError',
      message: 'Forbidden for https://push.example/device/private-path',
      body: '{"auth":"secret-auth-key","reason":"invalid VAPID"}',
    });
    expect(result).toMatchObject({
      disposition: 'failed',
      statusCode: 403,
      code: 'vapid_authentication_failed',
    });
    expect(result.reason).not.toContain('secret-auth-key');
    expect(result.reason).toContain('[redacted]');
  });

  it('marks 410 as expired so the subscription can be disabled', () => {
    expect(classifyPushResult({ statusCode: 410, body: 'Gone' })).toMatchObject({
      disposition: 'expired',
      code: 'subscription_expired',
      retryable: false,
    });
  });

  it('classifies malformed subscription/encryption errors as permanent', () => {
    expect(classifyPushResult(new TypeError('Invalid p256dh key'))).toMatchObject({
      disposition: 'failed',
      code: 'malformed_subscription_or_encryption',
      retryable: false,
    });
  });

  it.each([429, 500, 503])('classifies status %s as retryable', (statusCode) => {
    expect(classifyPushResult({ statusCode, body: 'temporary' })).toMatchObject({
      disposition: 'retrying',
      statusCode,
      retryable: true,
    });
  });

  it('uses bounded retry delays so failures do not retry every cron invocation forever', () => {
    expect(retryDelaySeconds(1)).toBe(30);
    expect(retryDelaySeconds(2)).toBe(60);
    expect(retryDelaySeconds(20)).toBe(900);
  });

  it('rejects malformed or decorated VAPID configuration', () => {
    const encode = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const publicBytes = new Uint8Array(65).fill(1);
    publicBytes[0] = 4;
    const valid = validateVapidConfiguration(
      encode(publicBytes),
      encode(new Uint8Array(32).fill(2)),
      'mailto:admin@example.com',
    );
    expect(valid.valid).toBe(true);
    expect(validateVapidConfiguration(
      `${'A'.repeat(87)}=`,
      '"private key"',
      '<mailto:admin@example.com>',
    )).toMatchObject({
      valid: false,
      publicKeyValid: false,
      privateKeyValid: false,
      subjectValid: false,
    });
  });

  it('plans expired subscriptions for disabling and stops permanent failures', () => {
    expect(planFailedDelivery(classifyPushResult({ statusCode: 410 }), 1)).toMatchObject({
      finalStatus: 'failed',
      disableSubscription: true,
      retryAfterSeconds: null,
    });
    expect(planFailedDelivery(classifyPushResult({ statusCode: 403 }), 1)).toMatchObject({
      finalStatus: 'failed',
      disableSubscription: false,
      retryAfterSeconds: null,
    });
  });

  it('bounds retryable failures and permanently stops after five attempts', () => {
    const retryable = classifyPushResult({ statusCode: 429 });
    expect(planFailedDelivery(retryable, 1)).toMatchObject({
      finalStatus: 'retrying',
      retryAfterSeconds: 30,
    });
    expect(planFailedDelivery(retryable, 5)).toMatchObject({
      finalStatus: 'failed',
      errorCode: 'retry_exhausted',
      retryAfterSeconds: null,
    });
  });

  it('sanitizes endpoints, authorization, subscription keys, and long tokens', () => {
    const secret = 'x'.repeat(48);
    const sanitized = sanitizeDiagnostic(
      `https://push.example/full/device Bearer ${secret} {"p256dh":"${secret}","auth":"${secret}"}`,
    );
    expect(sanitized).not.toContain('push.example');
    expect(sanitized).not.toContain(secret);
    expect(sanitized).toContain('[redacted');
    expect(endpointHost('https://push.example/full/device')).toBe('push.example');
  });
});
