import { boot, toast, applyBrand, applyTheme } from '../ui.js';
import { brand, setBrand, resetBrand, prefs, setPrefs, deviceTZ, DEFAULT_BRAND } from '../state.js';
import { timezones } from '../time.js';
import { load, save, clearAll, bytesUsed, backend } from '../store.js';
import { permission, requestPermission, notify, isIOS, isStandalone, rescheduleAll } from '../notify.js';
import { supported, platformAvailable, hasPasskey, register, unlock, removePasskey, account, biometricLabel } from '../auth.js';
import { loadEvents, feedMeta } from '../data.js';
import { downloadText } from '../ics.js';
import { I } from '../icons.js';

const ACCENTS = ['#3b5bfd', '#111111', '#7c3aed', '#0e9f77', '#e5484d', '#d97706', '#0ea5e9', '#db2777'];
import { VERSION } from '../version.js';

if (boot('settings')) init();

async function init() {
  const $ = id => document.getElementById(id);

  // ---- branding ----
  const b = brand();
  const bind = (id, key) => { const el = $(id); el.value = b[key] || ''; el.oninput = () => { applyBrand(setBrand({ [key]: el.value || DEFAULT_BRAND[key] })); }; };
  bind('bName', 'name'); bind('bTag', 'tagline'); bind('bMark', 'mark'); bind('bLogo', 'logoUrl'); bind('bFooter', 'footer');
  const swatches = () => {
    const cur = brand().accent;
    $('swatches').innerHTML = ACCENTS.map(c => `<button class="sw ${c === cur ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')
      + `<label class="chip">Custom<input type="color" id="bColor" value="${cur}" style="width:22px;height:22px;border:0;background:none;padding:0"></label>`;
    $('bColor').oninput = e => { applyBrand(setBrand({ accent: e.target.value })); };
  };
  swatches();
  $('swatches').onclick = e => { const c = e.target.dataset.c; if (c) { applyBrand(setBrand({ accent: c })); swatches(); } };
  $('bReset').onclick = () => { resetBrand(); location.reload(); };
  $('bExport').onclick = () => downloadText('brand.json', JSON.stringify(brand(), null, 2), 'application/json');

  // ---- appearance ----
  const themeSeg = () => document.querySelectorAll('#themeSeg button').forEach(x => x.classList.toggle('on', x.dataset.v === prefs().theme));
  themeSeg();
  $('themeSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return; setPrefs({ theme: v }); applyTheme(v); applyBrand(); themeSeg(); };

  // ---- calendar ----
  const p = prefs();
  $('pTz').innerHTML = `<option value="">Device (${deviceTZ()})</option>` + timezones().map(z => `<option ${z === p.tz ? 'selected' : ''}>${z}</option>`).join('');
  $('pView').value = p.view; $('pH12').value = p.hour12; $('pRem').value = String(p.defaultReminder);
  $('pTrusted').checked = p.trustedOnly; $('pSamples').checked = p.showSamples;
  $('pTz').onchange = e => { setPrefs({ tz: e.target.value }); toast('Timezone updated'); };
  $('pView').onchange = e => setPrefs({ view: e.target.value });
  $('pH12').onchange = e => setPrefs({ hour12: e.target.value });
  $('pRem').onchange = e => setPrefs({ defaultReminder: +e.target.value });
  $('pTrusted').onchange = e => setPrefs({ trustedOnly: e.target.checked });
  $('pSamples').onchange = e => setPrefs({ showSamples: e.target.checked });

  // ---- notifications ----
  const nState = () => {
    const s = permission();
    $('nStatus').textContent = { granted: 'On — reminders will notify this device.', denied: 'Blocked in browser settings.', default: 'Off', unsupported: 'Not supported in this browser.' }[s];
    $('nEnable').textContent = s === 'granted' ? 'Enabled' : 'Enable';
    $('nEnable').disabled = s === 'granted' || s === 'denied' || s === 'unsupported';
    if (isIOS() && !isStandalone()) {
      $('iosHint').classList.remove('hidden');
      $('iosHint').innerHTML = `${I.bell}<span>iPhone/iPad: open in Safari → Share → <b style="font-weight:500">Add to Home Screen</b>, launch it from there, then enable notifications (iOS 16.4+).</span>`;
    }
  };
  nState();
  $('nEnable').onclick = async () => { const r = await requestPermission(); setPrefs({ notifications: r === 'granted' }); nState(); rescheduleAll(); };
  $('nTest').onclick = () => notify(brand().name, 'Test reminder — you’re all set.', 'my-events.html', 'test');

  // ---- passkey ----
  const bio = biometricLabel();
  document.querySelectorAll('.bio').forEach(n => (n.textContent = bio));
  const pk = async () => {
    const ok = supported() && await platformAvailable();
    const has = hasPasskey();
    $('pkStatus').textContent = !supported() ? 'Passkeys need HTTPS (e.g. GitHub Pages) or localhost.'
      : !ok ? `No ${bio} / platform authenticator found — you can still use a phone passkey via QR.`
      : has ? `Passkey created ${new Date(account().created).toLocaleDateString()} — unlock with ${bio}.` : `Protect your events with ${bio}. Nothing leaves this device.`;
    $('pkSetup').innerHTML = has ? `${I.face}Test ${bio}` : `${I.face}Set up ${bio}`;
    $('pkSetup').disabled = !supported();
    $('pkRemove').classList.toggle('hidden', !has);
    $('pkRequire').checked = prefs().requireAuth && has;
    $('pkRequire').disabled = !has;
  };
  pk();
  $('pkSetup').onclick = async () => {
    try {
      if (hasPasskey()) { await unlock(); toast(`${I.check} ${bio} verified`); }
      else { await register('Me'); setPrefs({ requireAuth: true }); toast(`${I.check} ${bio} is set up — app will lock on next launch`); }
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'Cancelled' : (e.message || 'Passkey failed')); }
    pk();
  };
  $('pkRemove').onclick = () => { if (confirm('Remove the passkey lock from this device?')) { removePasskey(); pk(); toast('Passkey removed'); } };
  $('pkRequire').onchange = e => setPrefs({ requireAuth: e.target.checked });

  // ---- data ----
  const info = () => { $('dataInfo').textContent = `Stored in ${backend === 'cookie' ? 'browser cookies' : 'localStorage (cookies unavailable here)'} — ${(bytesUsed() / 1024).toFixed(1)} KB used. Nothing is sent to a server.`; };
  info();
  const KEYS = ['brand', 'prefs', 'plans', 'auth'];
  $('dExport').onclick = () => downloadText('ai-event-calendar-backup.json', JSON.stringify(Object.fromEntries(KEYS.filter(k => k !== 'auth').map(k => [k, load(k, {})])), null, 2), 'application/json');
  $('dImport').onchange = async e => {
    try {
      const j = JSON.parse(await e.target.files[0].text());
      ['brand', 'prefs', 'plans'].forEach(k => j[k] && save(k, j[k]));
      toast('Imported'); setTimeout(() => location.reload(), 600);
    } catch { toast('That file isn’t a valid backup'); }
  };
  $('dReset').onclick = () => { if (confirm('Erase all saved events, reminders, branding and passkey from this device?')) { clearAll(); location.href = 'index.html'; } };

  await loadEvents();
  const m = feedMeta();
  $('aboutInfo').innerHTML = `Version ${VERSION}. ${m ? `Live feed generated ${new Date(m.generatedAt).toLocaleString()} from ${m.sources.map(s => s.name).join(', ')}; refreshed every Monday 6:00 PM IST.` : 'Live feed not found — showing sample data.'}`;
}
