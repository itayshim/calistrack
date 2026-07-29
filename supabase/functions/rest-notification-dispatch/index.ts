import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('REST_NOTIFICATION_CRON_SECRET');
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
  const { data: due, error } = await client
    .from('scheduled_rest_notifications')
    .select('id, completion_id, workout_id, language, push_subscriptions!inner(subscription, enabled)')
    .eq('status', 'scheduled')
    .eq('push_subscriptions.enabled', true)
    .lte('scheduled_for', new Date().toISOString())
    .limit(100);
  if (error) return new Response('Dispatch failed', { status: 500 });
  let sent = 0;
  for (const item of due ?? []) {
    const { data: claimed } = await client
      .from('scheduled_rest_notifications')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    if (!claimed) continue;
    const he = item.language === 'he';
    const payload = JSON.stringify({
      completionId: item.completion_id,
      workoutId: item.workout_id,
      title: he ? 'המנוחה הסתיימה' : 'Rest complete',
      body: he ? 'הגיע הזמן לסט הבא.' : 'Time for your next set.',
    });
    try {
      const relation = item.push_subscriptions as unknown as {
        subscription: webpush.PushSubscription;
      };
      await webpush.sendNotification(relation.subscription, payload);
      await client.from('scheduled_rest_notifications').update({ status: 'sent' }).eq('id', item.id);
      sent += 1;
    } catch {
      await client.from('scheduled_rest_notifications').update({ status: 'failed' }).eq('id', item.id);
    }
  }
  return Response.json({ sent });
});
