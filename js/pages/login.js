import { boot } from '../ui.js';
import { hasPasskey, register, unlock, supported, biometricLabel, isUnlocked } from '../auth.js';
import { setPrefs } from '../state.js';
import { I } from '../icons.js';

boot('login');
const $ = id => document.getElementById(id);
const next = new URLSearchParams(location.search).get('next') || 'index.html';
const safeNext = /^[\w\-.]+\.html(\?.*)?$/.test(next) ? next : 'index.html';
const go = () => location.replace(safeNext);
const bio = biometricLabel();

$('faceBtn').innerHTML = I.face;
if (isUnlocked()) go();

if (hasPasskey()) {
  $('msg').textContent = `Unlock with ${bio}`;
  $('hint').textContent = 'Tap to authenticate';
} else {
  $('msg').textContent = `Secure this calendar with ${bio}`;
  $('hint').textContent = supported() ? 'Creates a passkey stored in your device keychain' : 'Passkeys need HTTPS or localhost';
  $('skip').classList.remove('hidden');
}

async function auth() {
  $('faceBtn').classList.add('scan');
  try {
    if (hasPasskey()) await unlock();
    else { await register('Me'); setPrefs({ requireAuth: true }); }
    $('msg').textContent = 'Unlocked';
    setTimeout(go, 250);
  } catch (e) {
    $('msg').textContent = e.name === 'NotAllowedError' ? 'Cancelled — tap to try again' : (e.message || 'Could not authenticate');
  } finally { $('faceBtn').classList.remove('scan'); }
}
$('faceBtn').onclick = auth;
$('skip').onclick = go;
// iOS requires a user gesture for WebAuthn; auto-prompt only where allowed
if (hasPasskey() && !/iPhone|iPad/.test(navigator.userAgent)) setTimeout(() => auth().catch(() => {}), 300);
