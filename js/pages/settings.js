import { boot, toast, applyBrand, applyTheme } from '../ui.js';
import { brand, setBrand, resetBrand, prefs, setPrefs, deviceTZ, DEFAULT_BRAND } from '../state.js';
import { timezones } from '../time.js';
import { load, save, clearAll, bytesUsed, backend } from '../store.js';
import { permission, requestPermission, notify, isIOS, isStandalone, rescheduleAll } from '../notify.js';
import { supported, platformAvailable, hasPasskey, register, unlock, removePasskey, account, biometricLabel } from '../auth.js';
import { loadEvents, feedMeta } from '../data.js';
import { downloadText } from '../ics.js';
import { I } from '../icons.js';
import { hasPasscode, setPasscode, clearPasscode, verifyPasscode } from '../passcode.js';
import { mountKeypad } from '../keypad.js';
import { log, getLogs, clearLogs } from '../log.js';
import { esc } from '../components.js';

const ACCENTS = ['#3b5bfd', '#111111', '#7c3aed', '#0e9f77', '#e5484d', '#d97706', '#0ea5e9', '#db2777'];
import { VERSION } from '../version.js';

if (boot('settings')) init();

async function init() {
  const $ = id => document.getElementById(id);

  // ---- branding ----
  const b = brand();
  const bind = (id, key) => { const el = $(id); el.value = b[key] || ''; el.oninput = () => { applyBrand(setBrand({ [key]: el.value || DEFAULT_BRAND[key] })); }; };
  ['bName', 'bTag', 'bMark', 'bLogo', 'bFooter'].forEach(id => $(id).addEventListener('change', () => log('settings', `Branding updated \u00b7 ${id.slice(1).toLowerCase()}`)));
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
  $('themeSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return; setPrefs({ theme: v }); log('settings', `Theme \u2192 ${v}`); applyTheme(v); applyBrand(); themeSeg(); };

  // ---- calendar ----
  const p = prefs();
  $('pTz').innerHTML = `<option value="">Device (${deviceTZ()})</option>` + timezones().map(z => `<option ${z === p.tz ? 'selected' : ''}>${z}</option>`).join('');
  $('pView').value = p.view; $('pH12').value = p.hour12; $('pRem').value = String(p.defaultReminder);
  $('pTrusted').checked = p.trustedOnly; $('pSamples').checked = p.showSamples;
  $('pTz').onchange = e => { setPrefs({ tz: e.target.value }); log('settings', `Timezone \u2192 ${e.target.value || 'device'}`); toast('Timezone updated'); };
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
    const anyLock = has || hasPasscode();
    $('pkRequire').checked = prefs().requireAuth && anyLock;
    $('pkRequire').disabled = !anyLock;
    $('pinStatus').textContent = hasPasscode() ? `On \u2014 used when ${bio} isn\u2019t available or doesn\u2019t recognise you.` : `Off \u2014 set one as a backup for ${bio}.`;
    $('pinSet').innerHTML = hasPasscode() ? 'Change' : `${I.lock}Set passcode`;
    $('pinRemove').hidden = !hasPasscode();
  };
  pk();
  $('pkSetup').onclick = async () => {
    try {
      if (hasPasskey()) { await unlock(); toast(`${I.check} ${bio} verified`); }
      else { await register('Me'); setPrefs({ requireAuth: true }); toast(`${I.check} ${bio} is set up — app will lock on next launch`); }
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'Cancelled' : (e.message || 'Passkey failed')); }
    pk();
  };
  $('pkRemove').onclick = () => { if (confirm('Remove the passkey lock from this device?')) { removePasskey(); if (!hasPasscode()) setPrefs({ requireAuth: false }); pk(); toast('Passkey removed'); } };
  $('pkRequire').onchange = e => { setPrefs({ requireAuth: e.target.checked }); log('security', `App lock ${e.target.checked ? 'on' : 'off'}`); };

  // ---- passcode (set / change / remove) ----
  let pad = null;
  const closePad = () => { pad?.destroy(); pad = null; $('pinPadWrap').hidden = true; pk(); };
  function openPad(mode) {
    $('pinPadWrap').hidden = false;
    let stage = mode === 'change' || mode === 'remove' ? 'verify' : 'new', first = null;
    const titles = { verify: 'Enter current passcode', new: 'Enter a new passcode', confirm: 'Confirm new passcode' };
    pad = mountKeypad($('pinPad'), {
      title: titles[stage],
      onComplete: async code => {
        if (stage === 'verify') {
          const r = await verifyPasscode(code);
          if (!r.ok) return r.wait ? `Locked \u2014 try again in ${Math.ceil(r.wait / 1000)}s` : 'Wrong passcode';
          if (mode === 'remove') { clearPasscode(); if (!hasPasskey()) setPrefs({ requireAuth: false }); toast('Passcode removed'); closePad(); return true; }
          stage = 'new'; pad.setTitle(titles.new); pad.setHint(''); pad.reset(); return true;
        }
        if (stage === 'new') { first = code; stage = 'confirm'; pad.setTitle(titles.confirm); pad.reset(); return true; }
        if (code !== first) { stage = 'new'; pad.setTitle(titles.new); return 'Didn\u2019t match \u2014 try again'; }
        await setPasscode(code); setPrefs({ requireAuth: true });
        toast(`${I.check}<span>Passcode ${mode === 'change' ? 'changed' : 'set'}</span>`); closePad(); return true;
      },
    });
    $('pinPadWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('pinSet').onclick = () => { if (!pad) openPad(hasPasscode() ? 'change' : 'new'); };
  $('pinRemove').onclick = () => { if (!pad) openPad('remove'); };
  $('pinCancel').onclick = closePad;

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

  // ---- logs ----
  let logFilter = 'all';
  const fmtTs = t => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  function drawLogs() {
    const rows = getLogs().filter(l => logFilter === 'all' || (logFilter === 'issues' ? l.level !== 'info' : l.category === logFilter));
    $('logList').innerHTML = rows.length ? rows.map(l => `<div class="log-row ${l.level}"><time>${fmtTs(l.t)}</time><span class="cat">${esc(l.category)}</span><span class="m">${esc(l.message)}</span></div>`).join('')
      : '<div class="empty" style="padding:28px">Nothing logged yet.</div>';
  }
  drawLogs();
  document.addEventListener('aiec:log', drawLogs);
  $('logSeg').onclick = e => { const f = e.target.dataset.f; if (!f) return; logFilter = f; document.querySelectorAll('#logSeg button').forEach(b => b.classList.toggle('on', b === e.target)); drawLogs(); };
  $('logClear').onclick = () => { clearLogs(); drawLogs(); toast('Logs cleared'); };
  $('logExport').onclick = () => downloadText(`logs-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getLogs(), null, 2), 'application/json');
  try {
    const r = await fetch('data/update-log.json', { cache: 'no-cache' });
    const runs = r.ok ? (await r.json()).runs || [] : [];
    $('jobList').innerHTML = runs.length ? runs.slice().reverse().map(x => `<div class="log-row ${x.ok ? '' : 'error'}"><time>${fmtTs(x.at)}</time><span class="cat">${x.ok ? x.trigger : 'failed'}</span>
      <span class="m">${x.ok ? `${x.count} events \u00b7 +${x.added} new \u00b7 \u2212${x.removed} ended \u00b7 ${esc(x.window.from)} \u2192 ${esc(x.window.to)}` : esc(x.error || 'Run failed')}</span></div>`).join('')
      : '<div class="empty" style="padding:28px">No runs yet \u2014 the first one happens next Monday 6:00 PM IST.</div>';
  } catch { $('jobList').innerHTML = '<div class="empty" style="padding:28px">Couldn\u2019t load the job log (offline?).</div>'; }

  // ---- version history (from CHANGELOG.md) ----
  $('verNow').innerHTML = `You\u2019re on <b style="font-weight:450">v${VERSION}</b>.`;
  try {
    const md = await (await fetch('CHANGELOG.md', { cache: 'no-cache' })).text();
    const vers = md.split(/\n## /).slice(1).map(block => {
      const [head, ...lines] = block.split('\n');
      const [, v, date] = head.match(/v?([\d.]+)\s*[\u2014-]\s*(.*)/) || [, head, ''];
      return { v, date, items: lines.filter(l => l.startsWith('- ')).map(l => l.slice(2)) };
    });
    $('verList').innerHTML = vers.map(x => `<div class="ver"><div><h4>v${esc(x.v)}</h4><small>${esc(x.date)}</small>${x.v === VERSION ? '<span class="pill soon" style="margin-top:8px">Current</span>' : ''}</div>
      <ul>${x.items.map(i => `<li>${esc(i).replace(/\*\*(.+?)\*\*/g, '<b style="font-weight:450">$1</b>')}</li>`).join('')}</ul></div>`).join('');
  } catch { $('verList').innerHTML = '<p class="muted">Version history is unavailable offline.</p>'; }
}
