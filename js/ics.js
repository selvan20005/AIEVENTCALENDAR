// iCalendar (.ics) export — works with Apple Calendar, Google Calendar, Outlook.
import { brand } from './state.js';

const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = line => line.length <= 74 ? line : line.match(/.{1,73}/g).join('\r\n ');

export function buildICS(events, plans = {}) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${esc(brand().name)}//AI Event Calendar//EN`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const now = stamp(new Date());
  for (const ev of events) {
    L.push('BEGIN:VEVENT', `UID:${ev.id}@aiec`, `DTSTAMP:${now}`);
    if (ev.allDay) {
      const end = new Date(ev.endKey + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + 1);
      L.push(`DTSTART;VALUE=DATE:${ev.startKey.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`);
    } else {
      L.push(`DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(ev.end)}`);
    }
    L.push(`SUMMARY:${esc(ev.title)}`,
      `DESCRIPTION:${esc([ev.desc, ev.org && 'Host: ' + ev.org, ev.url].filter(Boolean).join('\n'))}`,
      `LOCATION:${esc(ev.fmt === 'virtual' || ev.fmt === 'on-demand' ? 'Online' : [ev.city, ev.country].filter(Boolean).join(', '))}`);
    if (ev.url) L.push(`URL:${ev.url}`);
    for (const m of plans[ev.id]?.r || []) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(ev.title)}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n');
}

export function downloadText(filename, text, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function googleCalUrl(ev) {
  const endEx = ev.allDay ? new Date(Date.parse(ev.endKey + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10) : '';
  const d = ev.allDay
    ? `${ev.startKey.replace(/-/g, '')}/${endEx.replace(/-/g, '')}`
    : `${stamp(ev.start)}/${stamp(ev.end)}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: d, details: [ev.desc, ev.url].filter(Boolean).join('\n'), location: ev.city || 'Online' });
  return `https://calendar.google.com/calendar/render?${p}`;
}
