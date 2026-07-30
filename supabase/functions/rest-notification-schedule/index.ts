import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  canForegroundHandleStatus,
  normalizePushSubscription,
} from '../_shared/restPushDiagnostics.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const logTransition = (input: {
  notificationId: string;
  completionId: string;
  previousStatus: string;
  nextStatus: string;
  reason: string;
  source: 'client' | 'schedule-function';
  visibilityState?: string;
  hasFocus?: boolean;
}) => console.log(JSON.stringify({
  event: 'rest_notification_transition',
  ...input,
  timestamp: new Date().toISOString(),
}));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405);
  try {
    const body = await request.json();
    if (typeof body.deviceToken !== 'string' || body.deviceToken.length < 20) {
      return json({ code: 'invalid_device' }, 400);
    }
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const deviceTokenHash = await hash(body.deviceToken);
    if (body.action === 'register') {
      let normalized;
      try {
        normalized = normalizePushSubscription(body.subscription);
      } catch {
        return json({ code: 'invalid_subscription' }, 400);
      }
      const { error } = await client.from('push_subscriptions').upsert(
        {
          device_token_hash: deviceTokenHash,
          subscription: normalized.subscription,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_token_hash' },
      );
      if (error) throw error;
      return json({ ok: true });
    }
    const { data: subscription } = await client
      .from('push_subscriptions')
      .select('id, enabled, subscription')
      .eq('device_token_hash', deviceTokenHash)
      .maybeSingle();
    if (body.action === 'status') {
      let provided;
      let saved;
      try {
        provided = normalizePushSubscription(body.subscription).subscription;
        saved = normalizePushSubscription(subscription?.subscription).subscription;
      } catch {
        return json({ registered: false });
      }
      return json({
        registered: Boolean(
          subscription?.enabled &&
            provided.endpoint === saved?.endpoint &&
            provided.keys.p256dh === saved?.keys.p256dh &&
            provided.keys.auth === saved?.keys.auth,
        ),
      });
    }
    if (body.action === 'disable' && !subscription) {
      return json({ ok: true });
    }
    if (!subscription) return json({ code: 'subscription_not_found' }, 404);
    if (body.action === 'disable') {
      await client.from('push_subscriptions').update({ enabled: false }).eq('id', subscription.id);
      const transitionAt = new Date().toISOString();
      const { data: pendingDisable } = await client
        .from('scheduled_rest_notifications')
        .select('id, status')
        .eq('subscription_id', subscription.id)
        .in('status', ['scheduled', 'retrying']);
      const { data: cancelled } = await client
        .from('scheduled_rest_notifications')
        .update({
          status: 'cancelled',
          handled_reason: 'notifications_disabled',
          last_transition_reason: 'notifications_disabled',
          last_transition_source: 'schedule-function',
          last_transition_at: transitionAt,
          updated_at: transitionAt,
        })
        .eq('subscription_id', subscription.id)
        .in('status', ['scheduled', 'retrying'])
        .select('id, completion_id');
      for (const item of cancelled ?? []) {
        logTransition({
          notificationId: item.id,
          completionId: item.completion_id,
          previousStatus:
            pendingDisable?.find((pending) => pending.id === item.id)?.status ?? 'unknown',
          nextStatus: 'cancelled',
          reason: 'notifications_disabled',
          source: 'schedule-function',
        });
      }
      return json({ ok: true });
    }
    if (body.action === 'schedule') {
      if (!body.completionId || !body.scheduledFor) return json({ code: 'invalid_schedule' }, 400);
      const transitionAt = new Date().toISOString();
      const { data: pendingReplace } = await client
        .from('scheduled_rest_notifications')
        .select('id, status')
        .eq('subscription_id', subscription.id)
        .in('status', ['scheduled', 'retrying'])
        .neq('completion_id', body.completionId);
      const { data: replaced } = await client
        .from('scheduled_rest_notifications')
        .update({
          status: 'replaced',
          handled_reason: 'rest_replaced',
          last_transition_reason: 'rest_replaced',
          last_transition_source: 'schedule-function',
          last_transition_at: transitionAt,
          updated_at: transitionAt,
        })
        .eq('subscription_id', subscription.id)
        .in('status', ['scheduled', 'retrying'])
        .neq('completion_id', body.completionId)
        .select('id, completion_id');
      for (const item of replaced ?? []) {
        logTransition({
          notificationId: item.id,
          completionId: item.completion_id,
          previousStatus:
            pendingReplace?.find((pending) => pending.id === item.id)?.status ?? 'unknown',
          nextStatus: 'replaced',
          reason: 'rest_replaced',
          source: 'schedule-function',
        });
      }
      const { data: existingScheduled } = await client
        .from('scheduled_rest_notifications')
        .select('status')
        .eq('subscription_id', subscription.id)
        .eq('completion_id', body.completionId)
        .maybeSingle();
      const { data: scheduled, error } = await client.from('scheduled_rest_notifications').upsert(
        {
          subscription_id: subscription.id,
          completion_id: body.completionId,
          workout_id: body.workoutId ?? null,
          language: body.language === 'he' ? 'he' : 'en',
          scheduled_for: body.scheduledFor,
          status: 'scheduled',
          attempt_count: 0,
          last_attempt_at: null,
          next_attempt_at: null,
          last_error_code: null,
          last_error_message: null,
          handled_reason: null,
          last_transition_reason: 'rest_scheduled',
          last_transition_source: 'schedule-function',
          last_transition_at: transitionAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id,completion_id' },
      ).select('id, completion_id').single();
      if (error) throw error;
      logTransition({
        notificationId: scheduled.id,
        completionId: scheduled.completion_id,
        previousStatus: existingScheduled?.status ?? 'none',
        nextStatus: 'scheduled',
        reason: 'rest_scheduled',
        source: 'schedule-function',
      });
      return json({ ok: true });
    }
    if (body.action === 'foreground_handled' && body.completionId) {
      if (
        body.visibilityState !== 'visible' ||
        body.hasFocus !== true ||
        typeof body.clientId !== 'string' ||
        !body.clientId ||
        typeof body.handledAt !== 'string' ||
        Number.isNaN(Date.parse(body.handledAt))
      ) {
        return json({ code: 'invalid_foreground_claim' }, 400);
      }
      const { data: pending } = await client
        .from('scheduled_rest_notifications')
        .select('id, completion_id, status')
        .eq('subscription_id', subscription.id)
        .eq('completion_id', body.completionId)
        .in('status', ['scheduled', 'retrying'])
        .maybeSingle();
      if (!pending) return json({ handled: false });
      if (!canForegroundHandleStatus(pending.status)) return json({ handled: false });
      const transitionAt = new Date().toISOString();
      const { data: handled } = await client
        .from('scheduled_rest_notifications')
        .update({
          status: 'foreground_handled',
          handled_reason: 'foreground_completion',
          last_transition_reason: 'foreground_completion',
          last_transition_source: 'client',
          last_transition_at: transitionAt,
          updated_at: transitionAt,
        })
        .eq('id', pending.id)
        .eq('status', pending.status)
        .select('id')
        .maybeSingle();
      if (handled) {
        logTransition({
          notificationId: pending.id,
          completionId: pending.completion_id,
          previousStatus: pending.status,
          nextStatus: 'foreground_handled',
          reason: 'foreground_completion',
          source: 'client',
          visibilityState: body.visibilityState,
          hasFocus: body.hasFocus,
        });
      }
      return json({ handled: Boolean(handled) });
    }
    if (body.action === 'cancel') {
      if (typeof body.completionId !== 'string' || !body.completionId) {
        return json({ code: 'invalid_completion' }, 400);
      }
      const reason = body.reason === 'rest_paused' ? 'rest_paused' : 'rest_cancelled';
      const transitionAt = new Date().toISOString();
      const { data: pendingCancel } = await client
        .from('scheduled_rest_notifications')
        .select('id, status')
        .eq('subscription_id', subscription.id)
        .eq('completion_id', body.completionId)
        .in('status', ['scheduled', 'retrying']);
      const { data: cancelled } = await client
        .from('scheduled_rest_notifications')
        .update({
          status: 'cancelled',
          handled_reason: reason,
          last_transition_reason: reason,
          last_transition_source: 'client',
          last_transition_at: transitionAt,
          updated_at: transitionAt,
        })
        .eq('subscription_id', subscription.id)
        .eq('completion_id', body.completionId)
        .in('status', ['scheduled', 'retrying'])
        .select('id, completion_id');
      for (const item of cancelled ?? []) {
        logTransition({
          notificationId: item.id,
          completionId: item.completion_id,
          previousStatus:
            pendingCancel?.find((pending) => pending.id === item.id)?.status ?? 'unknown',
          nextStatus: 'cancelled',
          reason,
          source: 'client',
        });
      }
      return json({ ok: true });
    }
    return json({ code: 'invalid_action' }, 400);
  } catch {
    return json({ code: 'notification_request_failed' }, 500);
  }
});
