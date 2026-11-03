// Passkey / Face ID / Touch ID lock using WebAuthn platform authenticators.
// NOTE: prototype — no server verifies the signature; this is a device-local privacy lock.
import { load, save, setSession, getSession, clearSession } from './store.js';
import { brand, setPrefs } from './state.js';
import { log } from './log.js';

const b64u = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0)),
};
const rand = n => crypto.getRandomValues(new Uint8Array(n));

export const supported = () => !!window.PublicKeyCredential && window.isSecureContext;
export async function platformAvailable() {
  if (!supported()) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}
export const account = () => load('auth', { id: null, created: null, name: null });
export const hasPasskey = () => !!account().id;
export const isUnlocked = () => getSession('unlocked') === '1';
export const lock = () => clearSession('unlocked');
const markUnlocked = () => setSession('unlocked', '1');

export function biometricLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'Face ID';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  if (/Android/.test(ua)) return 'fingerprint';
  return 'passkey';
}

export async function register(displayName = 'Me') {
  if (!supported()) throw new Error('Passkeys need HTTPS (or localhost) and a modern browser.');
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: brand().name },
      user: { id: rand(16), name: `${brand().name.toLowerCase().replace(/\s+/g, '')}-${displayName}`, displayName },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  save('auth', { id: b64u.enc(cred.rawId), created: Date.now(), name: displayName });
  markUnlocked();
  log('security', `${biometricLabel()} passkey created`);
  return true;
}

export async function unlock() {
  const a = account();
  const publicKey = { challenge: rand(32), userVerification: 'required', timeout: 60000 };
  if (a.id) publicKey.allowCredentials = [{ type: 'public-key', id: b64u.dec(a.id), transports: ['internal', 'hybrid'] }];
  const res = await navigator.credentials.get({ publicKey });
  if (a.id && b64u.enc(res.rawId) !== a.id) throw new Error('That passkey belongs to a different account.');
  markUnlocked();
  log('security', `Unlocked with ${biometricLabel()}`);
  return true;
}

export function removePasskey() {
  save('auth', { id: null, created: null, name: null });
  lock();
  log('security', 'Passkey removed');
}
