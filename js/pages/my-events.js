import { boot, toast } from '../ui.js';
import { tz } from '../state.js';
import { loadEvents, getEvent, statusOf, eventDays } from '../data.js';
import { allPlans } from '../plans.js';
import { keyLabel } from '../time.js';
import { eventRow } from '../components.js';
import { openQuickView } from '../actions.js';
import { buildICS, downloadText } from '../ics.js';
import { permission, requestPermission, isIOS, isStandalone } from '../notify.js';
import { I } from '../icons.js';

if (boot('mine')) init();

async function init() {
  await loadEvents();
  const $ = id => document.getElementById(id);
  const zone = tz();
  let tab = 'going';
  $('exportAll').innerHTML = `${I.download}Export to calendar`;

  function banner() {
    const p = permission();
    let html = '';
    if (isIOS() && !isStandalone()) html = `${I.bell}<span>On iPhone, tap <b style="font-weight:500">Share → Add to Home Screen</b> and open from there to get push reminders.</span>`;
    else if (p === 'default') html = `${I.bell}<span>Turn on notifications so reminders reach you.</span><button class="btn sm" id="enableN" style="margin-left:auto">Enable</button>`;
    else if (p === 'denied') html = `${I.bell}<span>Notifications are blocked in browser settings — reminders will show in-app only.</span>`;
    $('notifBanner').innerHTML = html ? `<div class="banner">${html}</div>` : '';
    $('enableN')?.addEventListener('click', async () => { await requestPermission(); banner(); });
  }

  function draw() {
    const plans = allPlans();
    const items = Object.entries(plans).map(([id, p]) => ({ ev: getEvent(id), p })).filter(x => x.ev);
    const isPast = ev => statusOf(ev) === 'past';
    $('sGoing').textContent = items.filter(x => x.p.s === 'going' && !isPast(x.ev)).length;
    $('sMaybe').textContent = items.filter(x => x.p.s === 'maybe' && !isPast(x.ev)).length;
    $('sRem').textContent = items.filter(x => !isPast(x.ev)).reduce((a, x) => a + (x.p.r?.length || 0), 0);
    const list = items.filter(x => tab === 'past' ? isPast(x.ev) : (x.p.s === tab && !isPast(x.ev)))
      .sort((a, b) => tab === 'past' ? b.ev.start - a.ev.start : a.ev.start - b.ev.start);
    if (!list.length) {
      $('list').innerHTML = `<div class="empty"><div class="h2">${tab === 'past' ? 'No past events yet' : 'Nothing saved yet'}</div>
        <p>Open any event and tap <b style="font-weight:500">Attend</b> or <b style="font-weight:500">Interested</b>.</p><a class="btn primary" href="index.html">Browse the calendar</a></div>`;
      return;
    }
    let html = '', last = '';
    for (const { ev, p } of list) {
      const k = eventDays(ev, zone)[0];
      if (k !== last) { html += `<div class="eyebrow" style="margin:22px 0 6px 14px">${keyLabel(k, { weekday: 'long', day: 'numeric', month: 'long' })}</div>`; last = k; }
      html += eventRow(ev, zone).replace('</div>\n  </div>', `${p.r?.length ? `<span class="pill">${I.bell.replace('<svg', '<svg style="width:12px;height:12px"')}${p.r.length}</span>` : ''}</div>\n  </div>`);
    }
    $('list').innerHTML = html;
  }

  $('tabs').onclick = e => { const t = e.target.dataset.t; if (!t) return; tab = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); draw(); };
  $('list').onclick = e => { const r = e.target.closest('[data-id]'); if (r) { const ev = getEvent(r.dataset.id); ev && openQuickView(ev, draw); } };
  $('exportAll').onclick = () => {
    const plans = allPlans();
    const evs = Object.keys(plans).map(getEvent).filter(e => e && statusOf(e) !== 'past');
    if (!evs.length) return toast('No upcoming events to export');
    downloadText('my-ai-events.ics', buildICS(evs, plans));
    toast(`${I.download} Exported ${evs.length} events with reminders`);
  };
  document.addEventListener('aiec:plans', draw);
  banner(); draw();
}
