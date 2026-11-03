import { boot } from '../ui.js';
import { prefs, setPrefs, tz, ALL_FORMATS } from '../state.js';
import { loadEvents, filterEvents, statusOf, eventDays, REGIONS, TOPIC_LABELS, feedMeta, getEvent } from '../data.js';
import { dayKey, addDays, fmtDate, relative } from '../time.js';
import { render, title, shift } from '../calendar.js';
import { FMT, miniCard, esc } from '../components.js';
import { openQuickView } from '../actions.js';
import { openSheet } from '../ui.js';
import { I } from '../icons.js';

if (boot('calendar')) init();

async function init() {
  const $ = id => document.getElementById(id);
  const zone = tz();
  const today = dayKey(new Date(), zone);
  const params = new URLSearchParams(location.search);
  const narrow = matchMedia('(max-width:640px)').matches;
  const st = {
    view: params.get('view') || prefs().view,
    cursor: params.get('d') || today,
    selected: params.get('d') || today,
    q: '',
  };
  if (narrow && st.view === 'week') st.view = 'agenda';

  $('prev').innerHTML = I.left; $('next').innerHTML = I.right; $('searchIcon').outerHTML = I.search;
  $('trusted').checked = prefs().trustedOnly;

  const all = await loadEvents();

  // ---------- hero ----------
  function hero() {
    const f = filterEvents(all, prefs());
    const now = Date.now();
    const todayList = f.filter(e => eventDays(e, zone).includes(today));
    const live = f.filter(e => statusOf(e, now) === 'live');
    const wkEnd = addDays(today, 7);
    $('todayEyebrow').textContent = 'Today · ' + zone.replace('_', ' ');
    $('todayTitle').textContent = fmtDate(new Date(), zone, 'long');
    $('statToday').textContent = todayList.length;
    $('statLive').textContent = live.length;
    $('statOnline').textContent = todayList.filter(e => e.fmt !== 'in-person').length;
    $('statWeek').textContent = f.filter(e => { const k = eventDays(e, zone)[0]; return k >= today && k < wkEnd; }).length;
    const counts = Object.fromEntries(REGIONS.map(r => [r, todayList.filter(e => e.region === r).length]));
    const sel = prefs().regions;
    $('regionChips').innerHTML = REGIONS.map(r => `<button class="chip ${sel.includes(r) ? 'on' : ''}" data-region="${r}">${r === 'Global' ? I.globe : ''}${r} <span class="n">${counts[r]}</span></button>`).join('');

    const upcoming = f.filter(e => !e.allDay && e.fmt !== 'on-demand' && +e.end > now).slice(0, 12);
    const strip = [...live, ...upcoming.filter(e => !live.includes(e))].slice(0, 12);
    $('stripTitle').textContent = live.length ? `Live now & up next` : 'Up next';
    $('strip').innerHTML = strip.length ? strip.map(e => miniCard(e, zone)).join('') : '<div class="muted">Nothing upcoming with these filters.</div>';
    const m = feedMeta();
    $('feedInfo').textContent = m?.generatedAt ? `Live feed updated ${relative(new Date(m.generatedAt) - now)}` : 'Sample data — run the weekly updater for live events';
  }

  // ---------- toolbar ----------
  function chips() {
    const p = prefs();
    $('formatChips').innerHTML = ALL_FORMATS.map(f => `<button class="chip ${p.formats.includes(f) ? 'on' : ''}" data-fmt="${f}"><i class="dot ${FMT[f].cls}" style="background:var(--fc)"></i>${FMT[f].label}</button>`).join('')
      + `<button class="chip ${p.price === 'free' ? 'on' : ''}" data-price="free">Free</button>`;
    const n = p.regions.length + p.topics.length + (p.price !== 'any') + (ALL_FORMATS.length - p.formats.length) + !p.showSamples;
    $('filterBtn').innerHTML = `${I.filter}Filters${n ? ` · ${n}` : ''}`;
    document.querySelectorAll('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === st.view));
  }

  function draw() {
    const events = filterEvents(all, prefs(), st.q);
    $('calTitle').textContent = title(st.view, st.cursor);
    $('cal').innerHTML = render[st.view](events, { cursor: st.cursor, selected: st.selected, tz: zone });
    if (st.view === 'week') { const b = $('weekBody'); if (b) b.scrollTop = 8 * 48 - 10; }
    chips();
    const u = new URL(location.href); u.searchParams.set('view', st.view); u.searchParams.set('d', st.selected);
    history.replaceState(null, '', u);
  }
  const redraw = () => { hero(); draw(); };

  // ---------- events ----------
  const go = dir => {
    st.cursor = shift(st.view, st.cursor, dir);
    if (st.view !== 'month') st.selected = st.cursor;
    draw();
    const c = $('cal'); c.classList.remove('enter-l', 'enter-r'); void c.offsetWidth; c.classList.add(dir > 0 ? 'enter-l' : 'enter-r');
  };
  $('prev').onclick = () => go(-1);
  $('next').onclick = () => go(1);
  bindSwipe($('cal'), go);
  $('todayBtn').onclick = () => { st.cursor = st.selected = today; draw(); };
  $('viewSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return; st.view = v; setPrefs({ view: v }); draw(); };
  $('trusted').onchange = e => { setPrefs({ trustedOnly: e.target.checked }); redraw(); };
  let qt; $('q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value; if (st.q && st.view === 'month') { st.view = 'agenda'; } draw(); }, 140); };

  $('formatChips').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const p = prefs();
    if (b.dataset.fmt) {
      let f = p.formats.includes(b.dataset.fmt) ? p.formats.filter(x => x !== b.dataset.fmt) : [...p.formats, b.dataset.fmt];
      if (!f.length) f = [...ALL_FORMATS];
      setPrefs({ formats: f });
    } else if (b.dataset.price) setPrefs({ price: p.price === 'free' ? 'any' : 'free' });
    redraw();
  };
  $('regionChips').onclick = e => {
    const b = e.target.closest('[data-region]'); if (!b) return;
    const r = b.dataset.region, cur = prefs().regions;
    setPrefs({ regions: cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r] });
    redraw();
  };

  const pick = id => { const ev = getEvent(id); if (ev) openQuickView(ev, redraw); };
  document.addEventListener('click', e => {
    const evEl = e.target.closest('[data-id]');
    if (evEl && (evEl.closest('#cal') || evEl.closest('#strip'))) { e.stopPropagation(); pick(evEl.dataset.id); return; }
    const cell = e.target.closest('#cal .cell, #cal .wh [data-day]');
    if (cell) {
      st.selected = cell.dataset.day;
      if (st.view === 'week') { st.view = 'agenda'; st.cursor = st.selected; }
      draw();
      if (st.view === 'month') document.querySelector('.daypanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select') || document.querySelector('.sheet')) return;
    const k = e.key;
    if (k === 'Enter' && e.target.dataset?.id) pick(e.target.dataset.id);
    else if (k === 'ArrowLeft') $('prev').click();
    else if (k === 'ArrowRight') $('next').click();
    else if (k === 't') $('todayBtn').click();
    else if (k === 'm' || k === 'w' || k === 'a') { st.view = { m: 'month', w: 'week', a: 'agenda' }[k]; draw(); }
    else if (k === '/') { e.preventDefault(); $('q').focus(); }
  });
  document.addEventListener('aiec:plans', draw);

  $('filterBtn').onclick = () => openFilters(redraw);

  redraw();
  if (params.get('id')) pick(params.get('id'));
  setInterval(hero, 60_000);
}

// Horizontal swipe on the calendar: follow the finger, then snap to prev/next.
function bindSwipe(el, go) {
  let x0 = 0, y0 = 0, dx = 0, lock = null, active = false;
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    active = true; lock = null; dx = 0;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    el.classList.remove('snap', 'enter-l', 'enter-r');
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (!active || e.touches.length !== 1) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!lock && (Math.abs(mx) > 8 || Math.abs(my) > 8)) lock = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
    if (lock !== 'x') return;
    e.preventDefault();
    dx = mx;
    el.classList.add('dragging');
    el.style.transform = `translateX(${dx * 0.6}px)`;
    el.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.35));
  }, { passive: false });
  const end = () => {
    if (!active) return;
    active = false;
    el.classList.remove('dragging');
    if (lock === 'x' && Math.abs(dx) > 60) {
      el.style.transform = ''; el.style.opacity = '';
      go(dx < 0 ? 1 : -1);
      navigator.vibrate?.(8);
    } else {
      el.classList.add('snap');
      el.style.transform = ''; el.style.opacity = '';
    }
    lock = null; dx = 0;
  };
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);
}

function openFilters(onChange) {
  const p = prefs();
  const sh = openSheet(`
    <h2 class="h2" style="margin-bottom:18px">Filters</h2>
    <div class="eyebrow" style="margin-bottom:8px">Regions</div>
    <div class="regions" style="margin:0 0 20px">${REGIONS.map(r => `<button class="chip ${p.regions.includes(r) ? 'on' : ''}" data-k="regions" data-v="${r}">${r}</button>`).join('')}</div>
    <div class="eyebrow" style="margin-bottom:8px">Topics</div>
    <div class="regions" style="margin:0 0 20px">${Object.entries(TOPIC_LABELS).map(([k, l]) => `<button class="chip ${p.topics.includes(k) ? 'on' : ''}" data-k="topics" data-v="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="eyebrow" style="margin-bottom:8px">Price</div>
    <div class="seg" style="margin-bottom:20px" id="priceSeg">${['any', 'free', 'paid'].map(v => `<button class="${p.price === v ? 'on' : ''}" data-price="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
    <label class="toggle-row" style="margin-bottom:22px"><span class="switch"><input type="checkbox" id="fSamples" ${p.showSamples ? 'checked' : ''}><span></span></span>Show sample events (recurring demo sessions)</label>
    <div style="display:flex;justify-content:space-between"><button class="btn ghost" id="fReset">Reset</button><button class="btn primary" id="fDone">Done</button></div>`,
  { onClose: onChange });
  sh.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k) {
      const cur = prefs()[b.dataset.k], v = b.dataset.v;
      setPrefs({ [b.dataset.k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
      b.classList.toggle('on');
    } else if (b.dataset.price) {
      setPrefs({ price: b.dataset.price });
      sh.querySelectorAll('#priceSeg button').forEach(x => x.classList.toggle('on', x === b));
    } else if (b.id === 'fReset') {
      setPrefs({ regions: [], topics: [], price: 'any', formats: [...ALL_FORMATS], showSamples: true, trustedOnly: false });
      document.getElementById('trusted').checked = false;
      sh.close();
    } else if (b.id === 'fDone') sh.close();
  });
  sh.querySelector('#fSamples').onchange = e => setPrefs({ showSamples: e.target.checked });
}
