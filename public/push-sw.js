// Push notification handler for the service worker
// This file is imported by the generated Workbox SW via importScripts

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: event.data?.text() || 'New update available' };
  }

  // Use body-only content; let the OS/browser supply the app name automatically.
  const phrase = data.body || data.title || event.data?.text() || 'New update available';
  const title = '';
  const options = {
    body: phrase,
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: data.tag || 'private-notification',
    renotify: true,
    data: { url: data.url || '/p' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/p';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window
      return clients.openWindow(url);
    })
  );
});