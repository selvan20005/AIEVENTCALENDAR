// Timezone-aware date helpers. Day keys are 'YYYY-MM-DD' strings.
import { prefs } from './state.js';

const cache = new Map();
const dtf = (key, opts) => { if (!cache.has(key)) cache.set(key, new Intl.DateTimeFormat(opts.locale, opts)); return cache.get(key); };

export function dayKey(date, tz) {
  return dtf('k' + tz, { locale: 'en-CA', timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function hourMin(date, tz) {
  const p = dtf('hm' + tz, { locale: 'en-GB', timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return [+p.find(x => x.type === 'hour').value, +p.find(x => x.type === 'minute').value];
}
const h12 = () => { const h = prefs().hour12; return h === 'auto' ? undefined : h === '12'; };
export function fmtTime(date, tz) {
  return dtf('t' + tz + h12(), { locale: undefined, timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: h12() }).format(date);
}
export function fmtDate(date, tz, style = 'long') {
  const o = style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' }
    : style === 'short' ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return dtf('d' + style + tz, { locale: undefined, timeZone: tz, ...o }).format(date);
}
export function tzAbbr(date, tz) {
  const p = dtf('z' + tz, { locale: 'en-US', timeZone: tz, timeZoneName: 'short' }).formatToParts(date);
  return p.find(x => x.type === 'timeZoneName')?.value || tz;
}

// ---- key arithmetic (calendar math in UTC so it is tz-agnostic) ----
export const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const addDays = (k, n) => { const d = keyDate(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const addMonths = (k, n) => { const d = keyDate(k.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
export const weekday = k => keyDate(k).getUTCDay();            // 0 Sun
export const startOfWeek = k => addDays(k, -((weekday(k) + 6) % 7)); // Monday
export const diffDays = (a, b) => Math.round((keyDate(b) - keyDate(a)) / 864e5);
export const keyLabel = (k, o) => new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...o }).format(keyDate(k));

export function relative(ms) {
  const abs = Math.abs(ms), m = Math.round(abs / 6e4);
  const s = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${Math.round(m / 1440)}d`;
  return ms >= 0 ? `in ${s}` : `${s} ago`;
}
export const minsLabel = m => (m >= 1440 ? `${m / 1440} day${m > 1440 ? 's' : ''}` : m >= 60 ? `${m / 60} hour${m > 60 ? 's' : ''}` : `${m} min`);

export function timezones() {
  try { return Intl.supportedValuesOf('timeZone'); }
  catch { return ['UTC', 'Asia/Kolkata', 'Asia/Qatar', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney']; }
}
