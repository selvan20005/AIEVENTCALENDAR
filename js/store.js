// Cookie-backed persistence. JSON is chunked across cookies (4KB/cookie limit).
// Falls back to localStorage when cookies are unavailable (e.g. file://).
const P = 'aiec_';
const CHUNK = 3500;
const PATH = location.pathname.replace(/[^/]*$/, '') || '/';
const secure = () => (location.protocol === 'https:' ? ';Secure' : '');

export function setCookie(name, value, days) {
  const age = days == null ? '' : `;max-age=${Math.round(days * 86400)}`;
  document.cookie = `${name}=${value};path=${PATH};SameSite=Lax${age}${secure()}`;
}
export function getCookie(name) {
  const hit = document.cookie.split('; ').find(c => c.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1) : null;
}
export function delCookie(name) { document.cookie = `${name}=;path=${PATH};max-age=0`; }

const cookiesWork = (() => {
  try { setCookie(P + 't', '1', 1); const ok = getCookie(P + 't') === '1'; delCookie(P + 't'); return ok; }
  catch { return false; }
})();
export const backend = cookiesWork ? 'cookie' : 'localStorage';

function rawSet(key, str) {
  if (!cookiesWork) { try { localStorage.setItem(P + key, str); } catch {} return; }
  const old = parseInt(getCookie(`${P}${key}_n`) || '0', 10);
  for (let i = 0; i < old; i++) delCookie(`${P}${key}_${i}`);
  const enc = encodeURIComponent(str);
  const n = Math.max(1, Math.ceil(enc.length / CHUNK));
  for (let i = 0; i < n; i++) setCookie(`${P}${key}_${i}`, enc.slice(i * CHUNK, (i + 1) * CHUNK), 400);
  setCookie(`${P}${key}_n`, String(n), 400);
}
function rawGet(key) {
  if (!cookiesWork) { try { return localStorage.getItem(P + key); } catch { return null; } }
  const n = parseInt(getCookie(`${P}${key}_n`) || '0', 10);
  if (!n) return null;
  let s = '';
  for (let i = 0; i < n; i++) s += getCookie(`${P}${key}_${i}`) || '';
  try { return decodeURIComponent(s); } catch { return null; }
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export function save(key, value) { rawSet(key, JSON.stringify(value)); }
export function load(key, fallback) {
  const s = rawGet(key);
  const fb = structuredClone(fallback);
  if (s == null) return fb;
  try { const v = JSON.parse(s); return isObj(fb) && isObj(v) ? { ...fb, ...v } : v; }
  catch { return fb; }
}

// Session-only flag (cleared when browser closes)
export function setSession(key, v) {
  if (cookiesWork) setCookie(P + key, v); else sessionStorage.setItem(P + key, v);
}
export function getSession(key) { return cookiesWork ? getCookie(P + key) : sessionStorage.getItem(P + key); }
export function clearSession(key) { cookiesWork ? delCookie(P + key) : sessionStorage.removeItem(P + key); }

export function clearAll() {
  document.cookie.split('; ').forEach(c => { const n = c.split('=')[0]; if (n.startsWith(P)) delCookie(n); });
  try { Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); } catch {}
}
export function bytesUsed() {
  if (!cookiesWork) return Object.keys(localStorage).filter(k => k.startsWith(P)).reduce((a, k) => a + localStorage.getItem(k).length, 0);
  return document.cookie.split('; ').filter(c => c.startsWith(P)).reduce((a, c) => a + c.length, 0);
}
