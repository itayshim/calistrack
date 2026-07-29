import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

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
      const subscription = body.subscription;
      if (!subscription?.endpoint || !subscription?.p256dh || !subscription?.auth) {
        return json({ code: 'invalid_subscription' }, 400);
      }
      const { error } = await client.from('push_subscriptions').upsert(
        {
          device_token_hash: deviceTokenHash,
          subscription,
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
      .select('id')
      .eq('device_token_hash', deviceTokenHash)
      .maybeSingle();
    if (!subscription) return json({ code: 'subscription_not_found' }, 404);
    if (body.action === 'disable') {
      await client.from('push_subscriptions').update({ enabled: false }).eq('id', subscription.id);
      await client
        .from('scheduled_rest_notifications')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('subscription_id', subscription.id)
        .eq('status', 'scheduled');
      return json({ ok: true });
    }
    if (body.action === 'schedule') {
      if (!body.completionId || !body.scheduledFor) return json({ code: 'invalid_schedule' }, 400);
      await client
        .from('scheduled_rest_notifications')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('subscription_id', subscription.id)
        .eq('status', 'scheduled')
        .neq('completion_id', body.completionId);
      const { error } = await client.from('scheduled_rest_notifications').upsert(
        {
          subscription_id: subscription.id,
          completion_id: body.completionId,
          workout_id: body.workoutId ?? null,
          language: body.language === 'he' ? 'he' : 'en',
          scheduled_for: body.scheduledFor,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id,completion_id' },
      );
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === 'handled' && body.completionId) {
      await client
        .from('scheduled_rest_notifications')
        .update({ status: 'handled', updated_at: new Date().toISOString() })
        .eq('subscription_id', subscription.id)
        .eq('completion_id', body.completionId)
        .in('status', ['scheduled', 'sending']);
      return json({ ok: true });
    }
    if (body.action === 'cancel') {
      await client
        .from('scheduled_rest_notifications')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('subscription_id', subscription.id)
        .eq('status', 'scheduled');
      return json({ ok: true });
    }
    return json({ code: 'invalid_action' }, 400);
  } catch {
    return json({ code: 'notification_request_failed' }, 500);
  }
});
