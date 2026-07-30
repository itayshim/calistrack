/* global self, URL */
const handledRestCompletions = new Set();

self.addEventListener('message', (event) => {
  if (event.data?.type === 'REST_COMPLETION_HANDLED' && event.data.completionId) {
    handledRestCompletions.add(event.data.completionId);
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = event.data?.json?.() ?? {};
      const completionId = payload.completionId;
      if (!completionId || handledRestCompletions.has(completionId)) return;
      await self.registration.showNotification(payload.title ?? 'Rest complete', {
        body: payload.body ?? 'Time for your next set.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `rest-${completionId}`,
        renotify: false,
        data: {
          completionId,
          url: payload.workoutId ? `/workout/${payload.workoutId}` : '/',
        },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
