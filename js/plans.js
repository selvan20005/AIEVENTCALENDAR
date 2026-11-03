// User's plans: attending / interested + reminder offsets. Persisted in cookies.
import { load, save } from './store.js';
import { prefs } from './state.js';
import { rescheduleAll } from './notify.js';

// { [eventId]: { s: 'going'|'maybe', r: [minutes...], t: savedAt } }
export const allPlans = () => load('plans', {});
export const getPlan = id => allPlans()[id] || null;

function commit(p) { save('plans', p); rescheduleAll(); document.dispatchEvent(new CustomEvent('aiec:plans')); }

export function setStatus(id, s, defaultReminder = prefs().defaultReminder) {
  const p = allPlans();
  if (!s) delete p[id];
  else p[id] = { r: [defaultReminder], ...(p[id] || {}), s, t: Date.now() };
  commit(p);
  return p[id] || null;
}

export function toggleReminder(id, mins) {
  const p = allPlans();
  const cur = p[id] || { s: 'maybe', r: [], t: Date.now() };
  cur.r = cur.r.includes(mins) ? cur.r.filter(x => x !== mins) : [...cur.r, mins].sort((a, b) => a - b);
  p[id] = cur;
  commit(p);
  return cur;
}
