// Reminders → local notifications (via service worker when available) + in-app toasts.
// Web push from a server is not needed for reminders; they fire while the app/PWA is open
// and catch up on next launch. iOS: notifications require the PWA added to Home Screen (iOS 16.4+).
import { load, save } from './store.js';
import { loadEvents, getEvent } from './data.js';
import { minsLabel } from './time.js';

let timers = [];
export const supported = () => 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export async function requestPermission() {
  if (!supported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function notify(title, body, url = 'index.html', tag) {
  document.dispatchEvent(new CustomEvent('aiec:notify', { detail: { title, body, url } }));
  if (permission() !== 'granted') return;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const opts = { body, tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { url } };
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (e) { console.warn('notify failed', e); }
}

export async function rescheduleAll() {
  timers.forEach(clearTimeout); timers = [];
  await loadEvents();
  const plans = load('plans', {});
  const fired = load('fired', {});
  const now = Date.now();
  let changed = false;
  for (const [id, plan] of Object.entries(plans)) {
    const ev = getEvent(id);
    if (!ev || ev.fmt === 'on-demand') continue;
    for (const m of plan.r || []) {
      const key = `${id}@${m}`;
      if (fired[key]) continue;
      const at = +ev.start - m * 6e4;
      const delta = at - now;
      const fire = () => {
        notify(ev.title, `Starts in ${minsLabel(m)} · ${ev.org || ''}`.trim(), `event.html?id=${encodeURIComponent(id)}`, key);
        const f = load('fired', {}); f[key] = Date.now(); save('fired', f);
      };
      if (delta <= 0 && delta > -30 * 6e4) { fire(); changed = true; }
      else if (delta > 0 && delta < 2 ** 31 - 1) timers.push(setTimeout(fire, delta));
    }
  }
  // prune fired keys older than 7 days to keep cookies small
  for (const [k, t] of Object.entries(fired)) if (now - t > 7 * 864e5) { delete fired[k]; changed = true; }
  if (changed) save('fired', { ...load('fired', {}), ...fired });
}
