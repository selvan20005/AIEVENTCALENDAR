// Event actions (attend / interested / reminders / add-to-calendar / share) + quick-view sheet.
import { I } from './icons.js';
import { esc, badge, verified, place, statusPill, samplePill } from './components.js';
import { getPlan, setStatus, toggleReminder, allPlans } from './plans.js';
import { buildICS, downloadText, googleCalUrl } from './ics.js';
import { fmtDate, fmtTime, tzAbbr, minsLabel } from './time.js';
import { tz, prefs } from './state.js';
import { permission, requestPermission } from './notify.js';
import { toast, openSheet } from './ui.js';

const REMINDERS = [10, 30, 60, 1440];

export function whenLong(ev, zone = tz()) {
  if (ev.fmt === 'on-demand') return `Available from ${fmtDate(ev.start, 'UTC', 'long')}${ev.availableUntil ? ` until ${fmtDate(new Date(ev.availableUntil + 'T12:00:00Z'), 'UTC', 'medium')}` : ''}`;
  if (ev.allDay) {
    const s = fmtDate(new Date(ev.startKey + 'T12:00:00Z'), 'UTC', 'long');
    return ev.endKey !== ev.startKey ? `${s} → ${fmtDate(new Date(ev.endKey + 'T12:00:00Z'), 'UTC', 'long')}` : s;
  }
  return `${fmtDate(ev.start, zone, 'long')} · ${fmtTime(ev.start, zone)}–${fmtTime(ev.end, zone)} ${tzAbbr(ev.start, zone)}`;
}

export function actionsHTML(ev) {
  const p = getPlan(ev.id);
  const canRemind = ev.fmt !== 'on-demand' && !ev.allDay;
  const remindOpts = ev.allDay && ev.fmt !== 'on-demand' ? [1440, 2880] : REMINDERS;
  return `
    <div class="actions" data-actions="${esc(ev.id)}">
      <button class="btn ${p?.s === 'going' ? 'on' : ''}" data-act="going">${I.check}${p?.s === 'going' ? 'Going' : 'Attend'}</button>
      <button class="btn ${p?.s === 'maybe' ? 'on' : ''}" data-act="maybe">${I.star}Interested</button>
      <button class="btn ghost" data-act="ics" title="Add to Apple / Outlook calendar">${I.download}.ics</button>
      <button class="btn ghost" data-act="gcal" title="Add to Google Calendar">${I.cal}Google</button>
      <button class="btn ghost" data-act="share">${I.share}Share</button>
    </div>
    ${ev.fmt === 'on-demand' ? '' : `<div style="margin-top:16px">
      <div class="eyebrow" style="margin-bottom:8px">Remind me</div>
      <div class="reminders">${(canRemind ? REMINDERS : remindOpts).map(m => `<button class="chip ${p?.r?.includes(m) ? 'on' : ''}" data-rem="${m}">${I.bell}${minsLabel(m)} before</button>`).join('')}</div>
    </div>`}`;
}

export function bindActions(root, ev, rerender) {
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-act],[data-rem]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act;
    if (act === 'going' || act === 'maybe') {
      const cur = getPlan(ev.id);
      const next = cur?.s === act ? null : act;
      setStatus(ev.id, next, ev.allDay ? 1440 : undefined);
      rerender?.();
      toast(next === 'going' ? `${I.check} You’re going — reminder set ${minsLabel(prefs().defaultReminder)} before`
        : next === 'maybe' ? `${I.star} Saved to Interested` : 'Removed from your events');
      if (next) maybeAskNotifications();
      return;
    } else if (b.dataset.rem) {
      const m = +b.dataset.rem;
      const plan = toggleReminder(ev.id, m);
      rerender?.();
      toast(plan.r.includes(m) ? `${I.bell} Reminder ${minsLabel(m)} before` : 'Reminder removed');
      if (plan.r.includes(m)) maybeAskNotifications();
      return;
    } else if (act === 'ics') {
      downloadText(`${ev.title.replace(/[^\w]+/g, '-')}.ics`, buildICS([ev], allPlans()));
    } else if (act === 'gcal') {
      window.open(googleCalUrl(ev), '_blank', 'noopener');
    } else if (act === 'share') {
      const url = new URL(`event.html?id=${encodeURIComponent(ev.id)}`, location.href).href;
      if (navigator.share) { try { await navigator.share({ title: ev.title, text: `${ev.title} — ${whenLong(ev)}`, url }); } catch {} }
      else { await navigator.clipboard?.writeText(url); toast(`${I.link} Link copied`); }
    }
    rerender?.();
  });
}

async function maybeAskNotifications() {
  if (permission() === 'default') {
    const r = await requestPermission();
    if (r === 'granted') toast(`${I.bell} Notifications on`);
  }
}

export function openQuickView(ev, onChange) {
  const render = () => `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">${badge(ev)}${statusPill(ev)}${samplePill(ev)}</div>
    <h2 class="h2" style="margin:0 36px 6px 0">${esc(ev.title)} ${verified(ev)}</h2>
    <div class="muted" style="font-size:14px">${esc(ev.org)}${ev.trusted ? ' · trusted source' : ''}</div>
    <div style="margin:18px 0;display:grid;gap:8px;font-size:14px">
      <div style="display:flex;gap:10px;align-items:center">${I.clock}<span>${whenLong(ev)}</span></div>
      <div style="display:flex;gap:10px;align-items:center">${ev.fmt === 'in-person' || ev.fmt === 'hybrid' ? I.pin : I.globe}<span>${esc(place(ev))}${ev.region ? ` · ${esc(ev.region)}` : ''}</span></div>
    </div>
    ${ev.desc ? `<p class="muted" style="margin:0 0 18px">${esc(ev.desc)}</p>` : ''}
    <div class="qa">${actionsHTML(ev)}</div>
    <div style="margin-top:22px;display:flex;justify-content:space-between;align-items:center">
      <a class="btn primary" href="event.html?id=${encodeURIComponent(ev.id)}">Full details ${I.right}</a>
      ${ev.url ? `<a class="btn ghost" href="${esc(ev.url)}" target="_blank" rel="noopener">Official site ${I.ext}</a>` : ''}
    </div>`;
  const sh = openSheet(render(), { onClose: onChange });
  const body = document.createElement('div');
  // re-render inner content after an action, keep the close button
  bindActions(sh, ev, () => {
    const x = sh.querySelector('.x');
    sh.innerHTML = render(); sh.prepend(x);
  });
  return body;
}
