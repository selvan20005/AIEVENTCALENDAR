import { boot, toast } from '../ui.js';
import { prefs, setPrefs, deviceTZ } from '../state.js';
import { timezones } from '../time.js';
import { TOPIC_LABELS, loadEvents, filterEvents } from '../data.js';
import { FMT } from '../components.js';
import { permission, requestPermission, isIOS, isStandalone } from '../notify.js';
import { supported, platformAvailable, register, hasPasskey, biometricLabel } from '../auth.js';
import { hasPasscode, setPasscode } from '../passcode.js';
import { mountKeypad } from '../keypad.js';
import { log } from '../log.js';
import { I } from '../icons.js';

boot('onboarding');
const $ = id => document.getElementById(id);
const steps = [...document.querySelectorAll('.ob-step')];
const params = new URLSearchParams(location.search);
const nextUrl = /^[\w\-.]+\.html(\?.*)?$/.test(params.get('next') || '') ? params.get('next') : 'index.html';
const bio = biometricLabel();
let i = 0;
const picked = new Set(prefs().interests);
log('app', 'Onboarding started');

// ---------- step content ----------
// welcome: pulsing dots placed like cities on a map
const CITIES = [[22, 38, 'f-inperson'], [47, 30, 'f-virtual'], [52, 34, 'f-hybrid'], [62, 47, 'f-virtual'], [70, 52, 'f-ondemand'], [80, 40, 'f-inperson'], [86, 66, 'f-virtual'], [30, 64, 'f-hybrid'], [57, 58, 'f-ondemand']];
$('globeDots').innerHTML = CITIES.map(([x, y, c], n) => `<i class="${c}" style="left:${x}%;top:${y}%;animation-delay:${n * 0.27}s"></i>`).join('');

const DESC = {
  virtual: 'Live online sessions — join from anywhere, at a set time.',
  'on-demand': 'Recorded courses and talks you can watch any time.',
  hybrid: 'In a venue and streamed online.',
  'in-person': 'Conferences and meetups in cities worldwide.',
};
$('formatList').innerHTML = Object.entries(FMT).map(([k, f]) => `
  <div class="ob-item"><div class="ic ${f.cls}"><i class="dot" style="width:10px;height:10px;background:var(--fc)"></i></div>
  <div><b>${f.label}</b><span>${DESC[k]}</span></div></div>`).join('')
  + `<div class="ob-item"><div class="ic" style="color:var(--accent)">${I.shield}</div><div><b>Trusted badge</b><span>Shown on events from verified, reviewed sources.</span></div></div>`;

const chips = () => {
  $('topicChips').innerHTML = Object.entries(TOPIC_LABELS).map(([k, l]) => `<button class="chip ${picked.has(k) ? 'on' : ''}" data-t="${k}">${l}</button>`).join('');
};
chips();
$('topicChips').onclick = e => { const t = e.target.dataset.t; if (!t) return; picked.has(t) ? picked.delete(t) : picked.add(t); chips(); };
$('onlyMine').checked = prefs().topics.length > 0;

$('obTz').innerHTML = `<option value="">Automatic — ${deviceTZ()}</option>` + timezones().map(z => `<option ${z === prefs().tz ? 'selected' : ''}>${z}</option>`).join('');
$('obTrusted').checked = prefs().trustedOnly;
$('trustIc').innerHTML = I.shield;

// notifications
function notifyUI() {
  const p = permission();
  const iosBlocked = isIOS() && !isStandalone();
  $('iosNote').hidden = !iosBlocked;
  $('iosNote').innerHTML = `${I.bell}<span>On iPhone: tap <b style="font-weight:500">Share → Add to Home Screen</b>, open the app from your Home Screen, then turn reminders on in Settings.</span>`;
  $('obNotify').innerHTML = p === 'granted' ? `${I.check}Notifications on` : `${I.bell}Turn on notifications`;
  $('obNotify').disabled = p === 'granted' || p === 'denied' || p === 'unsupported' || iosBlocked;
  $('notifyState').textContent = p === 'denied' ? 'Blocked in browser settings — reminders will show inside the app.' : p === 'unsupported' ? 'This browser can’t show notifications — reminders will show inside the app.' : '';
}
notifyUI();
$('obNotify').onclick = async () => { const r = await requestPermission(); setPrefs({ notifications: r === 'granted' }); notifyUI(); if (r === 'granted') toast(`${I.bell}<span>Notifications on</span>`); };

// security
let bioOk = false;
async function secUI() {
  bioOk = supported() && await platformAvailable();
  const pk = hasPasskey(), pin = hasPasscode();
  $('secTitle').textContent = bioOk ? `Lock it with ${bio}.` : 'Lock it with a passcode.';
  $('obBio').hidden = !bioOk;
  $('obBio').innerHTML = pk ? `${I.check}${bio} is on` : `${I.face}Use ${bio}`;
  $('obBio').disabled = pk;
  $('obPin').innerHTML = pin ? `${I.check}Passcode set` : `${I.lock}${bioOk ? 'Add a backup passcode' : 'Set a 6-digit passcode'}`;
  $('obPin').disabled = pin;
  $('secState').textContent = pk && !pin ? `Add a passcode so you can still get in if ${bio} doesn’t work.` : (pk || pin) ? 'The app will ask to unlock each time you open it.' : 'Optional — you can skip this.';
}
secUI();
$('obBio').onclick = async () => {
  try { await register('Me'); setPrefs({ requireAuth: true }); toast(`${I.check}<span>${bio} is set up</span>`); }
  catch (e) { toast(e.name === 'NotAllowedError' ? `${bio} cancelled` : (e.message || `${bio} failed`)); }
  secUI();
};
$('obPin').onclick = () => {
  $('secButtons').hidden = true; $('obPad').hidden = false;
  let first = null;
  const pad = mountKeypad($('obPad'), {
    title: 'Create a passcode',
    onComplete: async code => {
      if (!first) { first = code; pad.setTitle('Confirm passcode'); pad.reset(); return true; }
      if (code !== first) { first = null; pad.setTitle('Create a passcode'); return 'Passcodes didn’t match — try again'; }
      await setPasscode(code); setPrefs({ requireAuth: true });
      pad.destroy(); $('obPad').hidden = true; $('secButtons').hidden = false;
      toast(`${I.check}<span>Passcode set</span>`);
      secUI();
      return true;
    },
  });
};

// ---------- navigation ----------
$('progress').innerHTML = steps.map(() => '<i></i>').join('');
function show(n) {
  i = Math.max(0, Math.min(steps.length - 1, n));
  steps.forEach((s, k) => s.dataset.pos = k < i ? 'before' : k > i ? 'after' : 'now');
  [...$('progress').children].forEach((d, k) => d.classList.toggle('on', k === i));
  const last = i === steps.length - 1, step = steps[i].dataset.step;
  $('back').style.visibility = i === 0 ? 'hidden' : 'visible';
  $('next').textContent = i === 0 ? 'Get started' : last ? 'Open calendar' : (step === 'notify' && permission() !== 'granted') || (step === 'secure' && !hasPasskey() && !hasPasscode()) ? 'Not now' : 'Continue';
  $('skipAll').style.visibility = last ? 'hidden' : 'visible';
  if (step === 'done') summary();
  steps[i].scrollTop = 0;
}
function saveChoices() {
  const tz = $('obTz').value;
  setPrefs({ interests: [...picked], topics: $('onlyMine').checked ? [...picked] : [], tz, trustedOnly: $('obTrusted').checked });
}
async function summary() {
  saveChoices();
  const all = await loadEvents();
  const n = filterEvents(all, prefs()).filter(e => +e.end > Date.now()).length;
  $('doneCount').textContent = n;
  const bits = [picked.size ? `${picked.size} topic${picked.size > 1 ? 's' : ''} picked` : null, prefs().trustedOnly ? 'trusted sources only' : null,
    hasPasskey() ? `${bio} lock` : hasPasscode() ? 'passcode lock' : null].filter(Boolean);
  $('doneText').textContent = `${n} upcoming AI events match your setup${bits.length ? ' — ' + bits.join(', ') : ''}. New events arrive every Monday.`;
}
function finish() {
  saveChoices();
  setPrefs({ onboarded: true });
  log('app', `Onboarding completed · ${picked.size} topics`);
  location.replace(nextUrl);
}
$('next').onclick = () => (i === steps.length - 1 ? finish() : (saveChoices(), show(i + 1)));
$('back').onclick = () => show(i - 1);
$('skipAll').onclick = () => { log('app', 'Onboarding skipped'); show(steps.length - 1); };
document.addEventListener('keydown', e => {
  if (!$('obPad').hidden || e.target.matches('input,select')) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') $('next').click();
  if (e.key === 'ArrowLeft') $('back').click();
});
// swipe between steps
let x0 = null, y0 = 0;
$('stage').addEventListener('touchstart', e => { if (!$('obPad').hidden) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
$('stage').addEventListener('touchend', e => {
  if (x0 == null) return;
  const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? $('next') : $('back')).click();
});
show(0);
