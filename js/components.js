// Small render helpers shared across pages.
import { I } from './icons.js';
import { fmtTime, fmtDate, relative } from './time.js';
import { statusOf } from './data.js';
import { getPlan } from './plans.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FMT = {
  virtual: { label: 'Virtual', cls: 'f-virtual' },
  'on-demand': { label: 'On-demand', cls: 'f-ondemand' },
  'in-person': { label: 'In person', cls: 'f-inperson' },
  hybrid: { label: 'Hybrid', cls: 'f-hybrid' },
};
export const fmtCls = ev => FMT[ev.fmt]?.cls || 'f-virtual';
export const badge = ev => `<span class="badge ${fmtCls(ev)}"><i class="dot"></i>${FMT[ev.fmt]?.label || ev.fmt}</span>`;
export const verified = ev => (ev.trusted ? `<span class="verified" title="Trusted source">${I.shield}</span>` : '');
export const place = ev => (ev.fmt === 'virtual' || ev.fmt === 'on-demand') ? 'Online' : [ev.city, ev.country].filter(Boolean).join(', ') || 'TBA';

export function statusPill(ev) {
  const st = statusOf(ev);
  if (st === 'live') return '<span class="pill live">Live</span>';
  if (st === 'soon') return `<span class="pill soon">${relative(+ev.start - Date.now())}</span>`;
  return '';
}
export function planPill(ev) {
  const p = getPlan(ev.id);
  if (!p) return '';
  return p.s === 'going' ? '<span class="pill going">Going</span>' : '<span class="pill">Interested</span>';
}
export const samplePill = ev => (ev.sample ? '<span class="pill sample">Sample</span>' : '');

export function whenText(ev, tz) {
  if (ev.fmt === 'on-demand') return 'Any time';
  if (ev.allDay) return 'All day';
  return fmtTime(ev.start, tz);
}

export function eventRow(ev, tz) {
  const sub = ev.allDay
    ? (ev.startKey !== ev.endKey ? `until ${fmtDate(new Date(ev.endKey + 'T12:00:00Z'), 'UTC', 'short')}` : '')
    : `${Math.round((ev.end - ev.start) / 6e4)} min`;
  return `<div class="row" data-id="${esc(ev.id)}" tabindex="0" role="button">
    <div class="when">${whenText(ev, tz)}<small>${sub}</small></div>
    <div>
      <div class="t">${esc(ev.title)} ${verified(ev)}</div>
      <div class="meta">${badge(ev)}<span>${esc(ev.org)}</span><span>${esc(place(ev))}</span></div>
    </div>
    <div class="side">${statusPill(ev)}${planPill(ev)}${samplePill(ev)}</div>
  </div>`;
}

export function miniCard(ev, tz) {
  return `<div class="mini" data-id="${esc(ev.id)}" tabindex="0" role="button">
    <div style="display:flex;justify-content:space-between;gap:8px">${badge(ev)}${statusPill(ev)}</div>
    <div class="t">${esc(ev.title)} ${verified(ev)}</div>
    <div class="m">${whenText(ev, tz)} · ${esc(place(ev))}</div>
  </div>`;
}
