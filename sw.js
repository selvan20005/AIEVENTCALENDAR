// Version: 1.1.0
// Service worker: offline app shell + notification clicks.
const VERSION = 'aiec-v1.1.0';
const SHELL = [
  './', 'index.html', 'event.html', 'my-events.html', 'settings.html', 'login.html',
  'css/base.css', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png',
  'js/version.js', 'js/regions.js', 'js/store.js', 'js/state.js', 'js/time.js', 'js/data.js', 'js/auth.js', 'js/notify.js', 'js/plans.js', 'js/ics.js',
  'js/icons.js', 'js/components.js', 'js/ui.js', 'js/actions.js', 'js/calendar.js',
  'js/pages/index.js', 'js/pages/event.js', 'js/pages/my-events.js', 'js/pages/settings.js', 'js/pages/login.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // events feed: network first so weekly updates show up; everything else: cache first
  if (url.pathname.endsWith('/data/events.json')) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || 'index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(target); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
// Ready for real web push (needs a push server + VAPID keys):
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'AI events', body: 'New events this week' };
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: 'assets/icon-192.png', data: { url: d.url } }));
});
