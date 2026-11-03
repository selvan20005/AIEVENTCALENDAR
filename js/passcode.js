// 6-digit passcode — fallback when Face ID / passkey can't be used.
// Stored as salted SHA-256 (never the digits). 5 wrong tries → 30 s lockout, doubling each time.
import { load, save, setSession } from './store.js';
import { log } from './log.js';

export const LENGTH = 6;
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function hash(code, salt) {
  const data = enc.encode(`${salt}:${code}`);
  if (crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', data));
  // non-secure context fallback (plain http on LAN) — FNV-1a, prototype only
  let h = 0x811c9dc5; for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return 'f' + h.toString(16);
}

const state = () => load('pin', { h: null, s: null, fails: 0, until: 0, strikes: 0 });
export const hasPasscode = () => !!state().h;

export async function setPasscode(code) {
  if (!/^\d{6}$/.test(code)) throw new Error('Use 6 digits');
  const s = hex(crypto.getRandomValues(new Uint8Array(12)));
  save('pin', { h: await hash(code, s), s, fails: 0, until: 0, strikes: 0 });
  setSession('unlocked', '1'); // you just proved you know it
  log('security', 'Passcode set');
}
export function clearPasscode() { save('pin', { h: null, s: null, fails: 0, until: 0, strikes: 0 }); log('security', 'Passcode removed'); }

export const lockedFor = () => Math.max(0, state().until - Date.now());

// returns { ok, wait } — wait = ms until next try is allowed
export async function verifyPasscode(code) {
  const st = state();
  if (!st.h) return { ok: false, wait: 0 };
  if (st.until > Date.now()) return { ok: false, wait: st.until - Date.now() };
  if (await hash(code, st.s) === st.h) {
    save('pin', { ...st, fails: 0, until: 0, strikes: 0 });
    setSession('unlocked', '1');
    log('security', 'Unlocked with passcode');
    return { ok: true, wait: 0 };
  }
  st.fails++;
  if (st.fails >= 5) { st.strikes++; st.until = Date.now() + 30000 * 2 ** (st.strikes - 1); st.fails = 0; log('security', 'Too many wrong passcodes — locked', 'warn'); }
  else log('security', 'Wrong passcode', 'warn');
  save('pin', st);
  return { ok: false, wait: Math.max(0, st.until - Date.now()), left: 5 - st.fails };
}
