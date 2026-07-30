import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  classifyPushResult,
  endpointHost,
  normalizePushSubscription,
  planFailedDelivery,
  readPushError,
  sanitizeDiagnostic,
  validateVapidConfiguration,
} from '../_shared/restPushDiagnostics.ts';

const MAX_ATTEMPTS = 5;

interface FailureSummary {
  notificationId: string;
  statusCode: number | null;
  reason: string;
}

const statusText = (statusCode: number | null) => {
  if (statusCode === 201) return 'Created';
  if (statusCode === 202) return 'Accepted';
  if (statusCode === 401) return 'Unauthorized';
  if (statusCode === 403) return 'Forbidden';
  if (statusCode === 404) return 'Not Found';
  if (statusCode === 410) return 'Gone';
  if (statusCode === 429) return 'Too Many Requests';
  if (statusCode !== null && statusCode >= 500) return 'Push Service Error';
  return '';
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const logTransition = (input: {
  notificationId: string;
  completionId: string;
  previousStatus: string;
  nextStatus: string;
  reason: string;
}) => console.log(JSON.stringify({
  event: 'rest_notification_transition',
  ...input,
  source: 'dispatch-function',
  timestamp: new Date().toISOString(),
}));

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('REST_NOTIFICATION_CRON_SECRET');
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return json({ code: 'unauthorized' }, 401);
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const subject = Deno.env.get('VAPID_SUBJECT') ?? '';
  const vapid = validateVapidConfiguration(publicKey, privateKey, subject);
  console.log(JSON.stringify({
    event: 'rest_push_configuration',
    valid: vapid.valid,
    publicKeyValid: vapid.publicKeyValid,
    privateKeyValid: vapid.privateKeyValid,
    subjectValid: vapid.subjectValid,
    publicKeyLength: vapid.publicKeyLength,
    privateKeyLength: vapid.privateKeyLength,
  }));
  if (!vapid.valid) return json({ code: 'invalid_vapid_configuration' }, 500);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ code: 'missing_server_configuration' }, 500);
  }

  try {
    const client = createClient(supabaseUrl, serviceRoleKey);
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: due, error } = await client
      .from('scheduled_rest_notifications')
      .select(
        'id, subscription_id, completion_id, workout_id, language, status, attempt_count, push_subscriptions!inner(subscription, enabled)',
      )
      .in('status', ['scheduled', 'retrying'])
      .eq('push_subscriptions.enabled', true)
      .lte('scheduled_for', nowIso)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .limit(100);
    if (error) {
      console.error(JSON.stringify({
        event: 'rest_push_dispatch_error',
        code: 'database_query_failed',
        message: sanitizeDiagnostic(error.message),
      }));
      return json({ code: 'database_unavailable' }, 500);
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let retrying = 0;
    let expiredSubscriptions = 0;
    const failures: FailureSummary[] = [];

    for (const item of due ?? []) {
      const attemptTimestamp = new Date().toISOString();
      const attemptCount = Number(item.attempt_count ?? 0) + 1;
      const { data: claimed, error: claimError } = await client
        .from('scheduled_rest_notifications')
        .update({
          status: 'sending',
          attempt_count: attemptCount,
          last_attempt_at: attemptTimestamp,
          next_attempt_at: null,
          last_transition_reason: 'dispatch_claimed',
          last_transition_source: 'dispatch-function',
          last_transition_at: attemptTimestamp,
          updated_at: attemptTimestamp,
        })
        .eq('id', item.id)
        .in('status', ['scheduled', 'retrying'])
        .select('id')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) continue;
      processed += 1;
      logTransition({
        notificationId: item.id,
        completionId: item.completion_id,
        previousStatus: item.status,
        nextStatus: 'sending',
        reason: 'dispatch_claimed',
      });

      const he = item.language === 'he';
      const payload = JSON.stringify({
        completionId: item.completion_id,
        workoutId: item.workout_id,
        title: he ? 'המנוחה הסתיימה' : 'Rest complete',
        body: he ? 'הגיע הזמן לסט הבא.' : 'Time for your next set.',
      });
      const relation = item.push_subscriptions as unknown as {
        subscription: unknown;
      };
      const rawSubscription = relation.subscription;
      const host = endpointHost(
        (rawSubscription as { endpoint?: unknown } | null)?.endpoint,
      );

      try {
        const normalized = normalizePushSubscription(rawSubscription);
        if (normalized.wasLegacy) {
          await client
            .from('push_subscriptions')
            .update({
              subscription: normalized.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.subscription_id);
        }
        const response = await webpush.sendNotification(
          normalized.subscription,
          payload,
        );
        const classification = classifyPushResult(null, response.statusCode);
        if (classification.disposition !== 'sent') {
          throw Object.assign(new Error('Unexpected push-service response'), {
            statusCode: response.statusCode,
            body: response.body,
          });
        }
        const { error: updateError } = await client
          .from('scheduled_rest_notifications')
          .update({
            status: 'sent',
            last_error_code: null,
            last_error_message: null,
            next_attempt_at: null,
            last_transition_reason: 'push_service_accepted',
            last_transition_source: 'dispatch-function',
            last_transition_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (updateError) throw updateError;
        sent += 1;
        logTransition({
          notificationId: item.id,
          completionId: item.completion_id,
          previousStatus: 'sending',
          nextStatus: 'sent',
          reason: 'push_service_accepted',
        });
        console.log(JSON.stringify({
          event: 'rest_push_delivery',
          notificationId: item.id,
          completionId: item.completion_id,
          subscriptionId: item.subscription_id,
          endpointHost: host,
          attemptTimestamp,
          pushResponseStatusCode: response.statusCode,
          pushResponseStatusText: statusText(response.statusCode),
          sanitizedResponseBody: sanitizeDiagnostic(response.body),
          errorName: null,
          errorMessage: null,
          subscriptionDisabled: false,
          finalDatabaseStatus: 'sent',
        }));
      } catch (error) {
        const parsed = readPushError(error);
        const classified = classifyPushResult(error);
        const plan = planFailedDelivery(classified, attemptCount, MAX_ATTEMPTS);
        const finalStatus = plan.finalStatus;
        const errorCode = plan.errorCode;
        const reason = sanitizeDiagnostic(
          errorCode === 'retry_exhausted'
            ? `Retry limit reached. ${classified.reason}`
            : classified.reason,
        );
        let subscriptionDisabled = false;

        if (plan.disableSubscription) {
          const { error: disableError } = await client
            .from('push_subscriptions')
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq('id', item.subscription_id);
          if (disableError) throw disableError;
          subscriptionDisabled = true;
          expiredSubscriptions += 1;
        }

        const nextAttemptAt =
          plan.retryAfterSeconds !== null
            ? new Date(Date.now() + plan.retryAfterSeconds * 1000).toISOString()
            : null;
        const { error: updateError } = await client
          .from('scheduled_rest_notifications')
          .update({
            status: finalStatus,
            last_error_code: errorCode,
            last_error_message: reason || sanitizeDiagnostic(parsed.message),
            next_attempt_at: nextAttemptAt,
            last_transition_reason: errorCode,
            last_transition_source: 'dispatch-function',
            last_transition_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (updateError) throw updateError;

        if (finalStatus === 'retrying') retrying += 1;
        else failed += 1;
        logTransition({
          notificationId: item.id,
          completionId: item.completion_id,
          previousStatus: 'sending',
          nextStatus: finalStatus,
          reason: errorCode,
        });
        failures.push({
          notificationId: item.id,
          statusCode: classified.statusCode,
          reason: reason || errorCode,
        });
        console.log(JSON.stringify({
          event: 'rest_push_delivery',
          notificationId: item.id,
          completionId: item.completion_id,
          subscriptionId: item.subscription_id,
          endpointHost: host,
          attemptTimestamp,
          pushResponseStatusCode: classified.statusCode,
          pushResponseStatusText:
            sanitizeDiagnostic(parsed.statusMessage) || statusText(classified.statusCode),
          sanitizedResponseBody: sanitizeDiagnostic(parsed.body),
          errorName: sanitizeDiagnostic(parsed.name),
          errorMessage: sanitizeDiagnostic(parsed.message),
          subscriptionDisabled,
          finalDatabaseStatus: finalStatus,
        }));
      }
    }

    return json({
      processed,
      sent,
      failed,
      retrying,
      expiredSubscriptions,
      failures,
    });
  } catch (error) {
    const parsed = readPushError(error);
    console.error(JSON.stringify({
      event: 'rest_push_dispatch_error',
      code: 'unhandled_dispatch_failure',
      errorName: parsed.name,
      errorMessage: parsed.message,
    }));
    return json({ code: 'dispatch_failed' }, 500);
  }
});
