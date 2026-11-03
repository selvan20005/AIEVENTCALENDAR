import { boot } from '../ui.js';
import { hasPasskey, register, unlock, supported, biometricLabel, isUnlocked } from '../auth.js';
import { hasPasscode, verifyPasscode, lockedFor } from '../passcode.js';
import { mountKeypad } from '../keypad.js';
import { setPrefs } from '../state.js';
import { log } from '../log.js';
import { I } from '../icons.js';

boot('login');
const $ = id => document.getElementById(id);
const next = new URLSearchParams(location.search).get('next') || 'index.html';
const safeNext = /^[\w\-.]+\.html(\?.*)?$/.test(next) ? next : 'index.html';
const go = () => location.replace(safeNext);
const bio = biometricLabel();
if (isUnlocked()) go();

$('faceBtn').innerHTML = I.face;
$('useBio').textContent = `Use ${bio} instead`;
const pk = hasPasskey(), pin = hasPasscode();
let padRef = null;

function showPasscode(reason = '') {
  $('bioView').hidden = true;
  $('pinView').hidden = false;
  const fmt = ms => `Try again in ${Math.ceil(ms / 1000)}s`;
  if (padRef) { padRef.reset(); padRef.setHint(reason); $('useBio').hidden = !pk; return; }
  const pad = padRef = mountKeypad($('pinPad'), {
    title: 'Enter passcode',
    hint: reason,
    onComplete: async code => {
      const r = await verifyPasscode(code);
      if (r.ok) { setTimeout(go, 150); return true; }
      if (r.wait) { tickLock(); return fmt(r.wait); }
      return `Wrong passcode · ${r.left} ${r.left === 1 ? 'try' : 'tries'} left`;
    },
  });
  function tickLock() {
    const w = lockedFor();
    if (!w) { pad.setHint(''); return; }
    pad.setHint(fmt(w), true);
    setTimeout(tickLock, 1000);
  }
  tickLock();
  $('useBio').hidden = !pk;
}

function showBio() {
  $('pinView').hidden = true;
  $('bioView').hidden = false;
}

async function auth() {
  $('faceBtn').classList.add('scan');
  try {
    if (pk) await unlock();
    else { await register('Me'); setPrefs({ requireAuth: true }); }
    $('msg').textContent = 'Unlocked';
    setTimeout(go, 250);
  } catch (e) {
    const cancelled = e.name === 'NotAllowedError' || e.name === 'AbortError';
    log('security', `${bio} ${cancelled ? 'cancelled / not recognised' : 'failed: ' + (e.message || e.name)}`, 'warn');
    if (pin) showPasscode(`${bio} didn’t work — use your passcode`);
    else $('msg').textContent = cancelled ? 'Not recognised — tap to try again' : (e.message || 'Could not authenticate');
  } finally { $('faceBtn').classList.remove('scan'); }
}

$('faceBtn').onclick = auth;
$('usePin').onclick = () => showPasscode();
$('useBio').onclick = showBio;
$('skip').onclick = go;

if (!pk && pin) showPasscode();                              // passcode only
else if (pk) {
  $('msg').textContent = `Unlock with ${bio}`;
  $('hint').textContent = 'Tap to authenticate';
  $('usePin').hidden = !pin;
  if (!supported()) { if (pin) showPasscode(`${bio} isn’t available here — use your passcode`); }
  else if (!/iPhone|iPad/.test(navigator.userAgent)) setTimeout(() => auth(), 300); // iOS needs a tap
} else {                                                     // nothing set up yet
  $('msg').textContent = `Secure this calendar with ${bio}`;
  $('hint').textContent = supported() ? 'Creates a passkey stored in your device keychain' : 'Passkeys need HTTPS or localhost';
  $('skip').hidden = false;
}
