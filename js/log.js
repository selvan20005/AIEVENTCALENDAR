// Activity log — last 60 entries in cookies (small, rolling). Shown in Settings → Logs.
import { load, save } from './store.js';

const MAX = 60;
// entry: [timestamp, level, category, message]
export const LEVELS = { info: 'Info', warn: 'Warning', error: 'Error' };

export function log(category, message, level = 'info') {
  try {
    const list = load('logs', []);
    list.push([Date.now(), level, category, String(message).slice(0, 120)]);
    save('logs', list.slice(-MAX));
    document.dispatchEvent(new CustomEvent('aiec:log'));
  } catch {}
}
export const getLogs = () => load('logs', []).slice().reverse().map(([t, level, category, message]) => ({ t, level, category, message }));
export const clearLogs = () => save('logs', []);

// Capture uncaught errors once per page.
let hooked = false;
export function captureErrors() {
  if (hooked) return; hooked = true;
  addEventListener('error', e => log('error', `${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`, 'error'));
  addEventListener('unhandledrejection', e => log('error', e.reason?.message || String(e.reason), 'error'));
}
