// Scheduler views: Month, Week (time grid), Agenda. Pure render → HTML string.
import { dayKey, hourMin, addDays, startOfWeek, keyLabel, fmtTime } from './time.js';
import { eventDays } from './data.js';
import { esc, fmtCls, eventRow, verified } from './components.js';
import { getPlan } from './plans.js';

const HOUR = 48; // px per hour in week view

export function indexByDay(events, tz) {
  const map = new Map();
  for (const ev of events) for (const k of eventDays(ev, tz)) {
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(ev);
  }
  for (const list of map.values()) list.sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start));
  return map;
}

export function title(view, cursor) {
  if (view === 'month') return keyLabel(cursor, { month: 'long', year: 'numeric' });
  if (view === 'week') {
    const s = startOfWeek(cursor), e = addDays(s, 6);
    return `${keyLabel(s, { day: 'numeric', month: 'short' })} – ${keyLabel(e, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return `From ${keyLabel(cursor, { day: 'numeric', month: 'long' })}`;
}

export function shift(view, cursor, dir) {
  if (view === 'month') { const d = new Date(cursor.slice(0, 8) + '01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + dir); return d.toISOString().slice(0, 10); }
  return addDays(cursor, dir * (view === 'week' ? 7 : 14));
}

// ---------------- Month ----------------
export function month(events, { cursor, selected, tz }) {
  const byDay = indexByDay(events, tz);
  const today = dayKey(new Date(), tz);
  const first = cursor.slice(0, 8) + '01';
  const start = startOfWeek(first);
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = `<div class="month" role="grid">${dows.map(d => `<div class="dow">${d}</div>`).join('')}`;
  for (let i = 0; i < 42; i++) {
    const k = addDays(start, i);
    if (i === 35 && k.slice(5, 7) !== cursor.slice(5, 7)) break; // drop 6th row if fully next month
    const list = byDay.get(k) || [];
    const cls = ['cell', k.slice(5, 7) !== cursor.slice(5, 7) && 'out', k === today && 'today', k === selected && 'sel'].filter(Boolean).join(' ');
    const shown = list.slice(0, 3).map(ev => {
      const mine = getPlan(ev.id) ? ' mine' : '';
      const tm = ev.allDay || ev.fmt === 'on-demand' ? '' : `<span class="tm">${fmtTime(ev.start, tz).replace(/\s?[AP]M/i, m => m.trim().toLowerCase()[0])}</span>`;
      return `<div class="ev ${fmtCls(ev)}${ev.allDay ? ' allday' : ''}${mine}" data-id="${esc(ev.id)}" title="${esc(ev.title)}"><i class="dot"></i>${tm}${esc(ev.title)}</div>`;
    }).join('');
    const more = list.length > 3 ? `<div class="more">+${list.length - 3} more</div>` : '';
    const dots = `<div class="dots">${list.slice(0, 4).map(ev => `<i class="${fmtCls(ev)}"></i>`).join('')}</div>`;
    html += `<div class="${cls}" data-day="${k}"><div class="num">${+k.slice(8)}</div>${shown}${more}${dots}</div>`;
  }
  html += '</div>';
  const sel = byDay.get(selected) || [];
  html += `<section class="daypanel"><div class="head"><h3 class="h2">${keyLabel(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><span class="muted">${sel.length} event${sel.length === 1 ? '' : 's'}</span></div>
    ${sel.length ? sel.map(ev => eventRow(ev, tz)).join('') : '<div class="empty" style="padding:30px">No AI events match your filters this day.</div>'}</section>`;
  return html;
}

// ---------------- Week ----------------
function layoutLanes(list) {
  // greedy lane assignment within overlapping clusters
  const out = []; let cluster = [], clusterEnd = 0;
  const flush = () => { const lanes = Math.max(...cluster.map(c => c.lane)) + 1; cluster.forEach(c => (c.lanes = lanes)); out.push(...cluster); cluster = []; };
  for (const it of list) {
    if (cluster.length && it.top >= clusterEnd) flush();
    const used = new Set(cluster.filter(c => c.top + c.h > it.top).map(c => c.lane));
    let lane = 0; while (used.has(lane)) lane++;
    it.lane = lane; cluster.push(it); clusterEnd = Math.max(clusterEnd, it.top + it.h);
  }
  if (cluster.length) flush();
  return out;
}

export function week(events, { cursor, tz }) {
  const byDay = indexByDay(events, tz);
  const today = dayKey(new Date(), tz);
  const s = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
  let head = '<div class="wh"><div></div>';
  let all = '<div class="allrow"><div>all-day</div>';
  let cols = '';
  for (const k of days) {
    head += `<div class="${k === today ? 'today' : ''}" data-day="${k}">${keyLabel(k, { weekday: 'short' })}<b>${+k.slice(8)}</b></div>`;
    const list = byDay.get(k) || [];
    all += `<div>${list.filter(e => e.allDay).map(ev => `<div class="ev allday ${fmtCls(ev)}" data-id="${esc(ev.id)}" title="${esc(ev.title)}"><i class="dot"></i>${esc(ev.title)}</div>`).join('')}</div>`;
    const timed = list.filter(e => !e.allDay).map(ev => {
      const [h, m] = hourMin(ev.start, tz);
      const top = (h * 60 + m) / 60 * HOUR;
      const h2 = Math.max(26, Math.min(24 * HOUR - top, (ev.end - ev.start) / 36e5 * HOUR));
      return { ev, top, h: h2 };
    }).sort((a, b) => a.top - b.top);
    const blocks = layoutLanes(timed).map(({ ev, top, h, lane, lanes }) =>
      `<div class="blk ${fmtCls(ev)}" data-id="${esc(ev.id)}" style="top:${top}px;height:${h - 2}px;left:calc(${(lane / lanes) * 100}% + 2px);width:calc(${100 / lanes}% - 4px);right:auto">
        <b>${esc(ev.title)}</b><span>${fmtTime(ev.start, tz)}${getPlan(ev.id) ? ' · ★' : ''}</span></div>`).join('');
    let now = '';
    if (k === today) { const [h, m] = hourMin(new Date(), tz); now = `<div class="nowline" style="top:${(h * 60 + m) / 60 * HOUR}px"></div>`; }
    cols += `<div class="col ${k === today ? 'today' : ''}" style="height:${24 * HOUR}px">${blocks}${now}</div>`;
  }
  const hf = new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: 'UTC' });
  const gut = `<div class="gut">${Array.from({ length: 24 }, (_, h) => `<div>${h ? hf.format(new Date(Date.UTC(2026, 0, 1, h))) : ''}</div>`).join('')}</div>`;
  return `<div class="week">${head}</div>${all}</div><div class="body" id="weekBody">${gut}${cols}</div></div>`;
}

// ---------------- Agenda ----------------
export function agenda(events, { cursor, tz, days = 45 }) {
  const byDay = indexByDay(events, tz);
  const today = dayKey(new Date(), tz);
  let html = '', count = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(cursor, i);
    const list = byDay.get(k);
    if (!list?.length) continue;
    count += list.length;
    html += `<div class="agenda-day ${k === today ? 'today' : ''}" data-day="${k}">
      <div class="d"><b>${+k.slice(8)}</b><span>${keyLabel(k, { weekday: 'short', month: 'short' })}</span></div>
      <div>${list.map(ev => eventRow(ev, tz)).join('')}</div></div>`;
  }
  return count ? html : '<div class="empty"><div class="h2">Nothing here yet</div>Try widening your filters or turning off “trusted only”.</div>';
}

export const render = { month, week, agenda };
export { verified };
