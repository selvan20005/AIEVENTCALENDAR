import { boot, toast } from '../ui.js';
import { tz, deviceTZ } from '../state.js';
import { loadEvents, getEvent, allEvents, learnFor, statusOf, TOPIC_LABELS, filterEvents } from '../data.js';
import { fmtTime, tzAbbr } from '../time.js';
import { esc, badge, verified, place, statusPill, samplePill, eventRow } from '../components.js';
import { actionsHTML, bindActions, whenLong, openQuickView } from '../actions.js';
import { I } from '../icons.js';

if (boot('calendar')) init();

async function init() {
  await loadEvents();
  const root = document.getElementById('root');
  const id = new URLSearchParams(location.search).get('id');
  const ev = id && getEvent(id);
  if (!ev) {
    root.innerHTML = `<div class="empty"><div class="h2">Event not found</div><p>It may have ended or been removed from the feed.</p><a class="btn" href="index.html">${I.left}Back to calendar</a></div>`;
    return;
  }
  document.body.dataset.title = ev.title;
  document.title = ev.title;
  const zone = tz();

  const agenda = () => {
    if (ev.allDay || ev.fmt === 'on-demand') return '';
    const s = +ev.start, d = +ev.end - s;
    const steps = d <= 50 * 6e4
      ? [['Welcome & context', 0], ['Main session', .15], ['Q&A', .75]]
      : [['Doors open / join', 0], ['Opening keynote', .08], ['Talks & demos', .3], ['Break', .55], ['Panel discussion', .62], ['Q&A and networking', .85]];
    return `<h3 class="h3" style="margin:32px 0 12px">Typical run of show</h3><div class="agenda-list">${steps.map(([t, f]) =>
      `<div>${t}<small>${fmtTime(new Date(s + d * f), zone)}</small></div>`).join('')}</div>`;
  };

  const related = () => filterEvents(allEvents(), { showSamples: true, formats: [], regions: [], topics: ev.topics, price: 'any' })
    .filter(e => e.id !== ev.id && statusOf(e) !== 'past').slice(0, 4);

  const render = () => {
    const learn = learnFor(ev);
    root.innerHTML = `
    <div style="padding-top:22px"><a class="btn ghost sm" href="index.html">${I.left}Calendar</a></div>
    <div class="detail">
      <article>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${badge(ev)}${statusPill(ev)}${samplePill(ev)}${ev.series ? `<span class="pill">${esc(ev.series)}</span>` : ''}</div>
        <h1 class="display" style="font-size:clamp(32px,4.6vw,52px)">${esc(ev.title)}</h1>
        <p class="lede" style="margin:0 0 6px">${esc(ev.org)} ${verified(ev)}</p>
        <p class="muted" style="margin:0 0 28px;font-size:14px">${ev.trusted ? 'From a trusted, reviewed source' : 'Community listing — not verified'} · via ${esc(ev.source)}</p>
        <div class="card qa">${actionsHTML(ev)}</div>
        ${ev.desc ? `<h3 class="h3" style="margin:32px 0 8px">About</h3><p style="color:var(--fg-2);max-width:65ch">${esc(ev.desc)}</p>` : ''}
        ${learn.length ? `<h3 class="h3" style="margin:28px 0 4px">What it covers</h3><ul class="learn">${learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
        ${agenda()}
        ${ev.cfpUrl && (!ev.cfpEndDate || ev.cfpEndDate >= new Date().toISOString().slice(0, 10)) ? `<div class="banner" style="margin-top:28px">${I.sparkle}<span>Call for papers ${ev.cfpEndDate ? 'closes ' + esc(ev.cfpEndDate) : 'is open'} — <a href="${esc(ev.cfpUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">submit a talk</a></span></div>` : ''}
        <h3 class="h3" style="margin:40px 0 8px">Related events</h3>
        <div id="related">${related().map(e => eventRow(e, zone)).join('') || '<p class="muted">No related events right now.</p>'}</div>
      </article>
      <aside class="aside">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:10px" id="cdLabel"></div>
          <div class="countdown" id="countdown"></div>
        </div>
        <div class="card">
          <dl class="kv">
            <dt>When</dt><dd>${whenLong(ev, zone)}</dd>
            ${!ev.allDay && ev.fmt !== 'on-demand' ? `<dt>UTC</dt><dd>${fmtTime(ev.start, 'UTC')} ${tzAbbr(ev.start, 'UTC')}</dd>` : ''}
            <dt>Where</dt><dd>${esc(place(ev))}</dd>
            <dt>Region</dt><dd>${esc(ev.region)}</dd>
            <dt>Format</dt><dd>${badge(ev)}</dd>
            <dt>Price</dt><dd>${ev.price === 'unknown' ? 'See site' : esc(ev.price[0].toUpperCase() + ev.price.slice(1))}</dd>
            <dt>Level</dt><dd>${esc(ev.level)}</dd>
            <dt>Topics</dt><dd>${ev.topics.map(t => esc(TOPIC_LABELS[t] || t)).join(', ') || '—'}</dd>
          </dl>
        </div>
        ${ev.url ? `<a class="btn accent lg" href="${esc(ev.url)}" target="_blank" rel="noopener">Register / official site ${I.ext}</a>`
          : `<button class="btn accent lg" id="regDemo">Register</button>`}
        ${(ev.fmt === 'in-person' || ev.fmt === 'hybrid') && ev.city ? `<a class="btn" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(ev.city + ' ' + ev.country)}" target="_blank" rel="noopener">${I.pin}View ${esc(ev.city)} on map</a>` : ''}
      </aside>
    </div>`;
    root.querySelector('#regDemo')?.addEventListener('click', () => toast(`${I.sparkle} Sample event — no real registration link`));
    tick();
  };

  function tick() {
    const el = document.getElementById('countdown'); if (!el) return;
    const st = statusOf(ev), now = Date.now();
    const label = document.getElementById('cdLabel');
    let ms;
    if (st === 'live') { label.innerHTML = '<span class="pill live">Live now</span>'; ms = +ev.end - now; }
    else if (st === 'past') { label.textContent = 'This event has ended'; el.innerHTML = '<span class="muted">Recordings may be on the official site.</span>'; return; }
    else if (st === 'available') { label.textContent = 'On-demand'; el.innerHTML = '<span>Watch any time</span>'; return; }
    else { label.textContent = 'Starts in'; ms = +ev.start - now; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    el.innerHTML = [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
  }

  render();
  bindActions(root, ev, () => { const qa = root.querySelector('.qa'); qa.innerHTML = actionsHTML(ev); });
  root.addEventListener('click', e => { const r = e.target.closest('#related [data-id]'); if (r) { const x = getEvent(r.dataset.id); x && openQuickView(x); } });
  setInterval(tick, 1000);
}
