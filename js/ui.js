// App shell: theme, white-label branding, auth guard, header/tabbar, sheets, toasts, service worker.
import { brand, prefs } from './state.js';
import { I } from './icons.js';
import { esc } from './components.js';
import { hasPasskey, isUnlocked, lock } from './auth.js';
import { rescheduleAll } from './notify.js';

export function applyTheme(theme = prefs().theme) {
  const r = document.documentElement;
  if (theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme);
}

export function markHTML(b = brand()) {
  return b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="">` : esc(b.mark || b.name[0] || '•');
}

export function applyBrand(b = brand()) {
  const r = document.documentElement.style;
  r.setProperty('--accent', b.accent);
  document.querySelectorAll('[data-brand="name"]').forEach(n => (n.textContent = b.name));
  document.querySelectorAll('[data-brand="tagline"]').forEach(n => (n.textContent = b.tagline));
  document.querySelectorAll('[data-brand="footer"]').forEach(n => (n.textContent = b.footer));
  document.querySelectorAll('[data-brand="mark"]').forEach(n => (n.innerHTML = markHTML(b)));
  const pageTitle = document.body.dataset.title;
  document.title = pageTitle ? `${pageTitle} · ${b.name}` : `${b.name} — ${b.tagline}`;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.body).backgroundColor || '#fafaf9';
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', b.name);
}

const NAV = [
  ['index.html', 'calendar', 'Calendar', I.cal],
  ['my-events.html', 'mine', 'My events', I.star],
  ['settings.html', 'settings', 'Settings', I.gear],
];

function mountShell(page) {
  const header = document.createElement('header');
  header.className = 'top';
  header.innerHTML = `<div class="container">
    <a class="brand" href="index.html"><span class="mark" data-brand="mark"></span><span data-brand="name"></span><span class="tag" data-brand="tagline"></span></a>
    <nav class="nav">${NAV.map(([h, k, l]) => `<a href="${h}" class="${k === page ? 'on' : ''}">${l}</a>`).join('')}</nav>
    ${hasPasskey() ? `<button class="icon-btn" id="lockBtn" title="Lock now" aria-label="Lock">${I.lock}</button>` : ''}
  </div>`;
  document.body.prepend(header);
  const tab = document.createElement('nav');
  tab.className = 'tabbar';
  tab.innerHTML = NAV.map(([h, k, l, ic]) => `<a href="${h}" class="${k === page ? 'on' : ''}">${ic}<span>${l}</span></a>`).join('');
  document.body.append(tab);
  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML = `<div class="container" style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><span><span data-brand="name"></span> — <span data-brand="footer"></span></span><span>Times shown in your timezone · data saved on this device</span></div>`;
  document.querySelector('main')?.after(foot);
  document.getElementById('lockBtn')?.addEventListener('click', () => { lock(); location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); });
}

// ---------- toasts ----------
let toastRoot;
export function toast(html, ms = 2800) {
  toastRoot ||= Object.assign(document.body.appendChild(document.createElement('div')), { id: 'toasts' });
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = html; toastRoot.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, ms);
}

// ---------- sheet (modal / bottom sheet) ----------
export function openSheet(html, { onClose } = {}) {
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<button class="icon-btn x" aria-label="Close">${I.x}</button>${html}`;
  document.body.append(bd, sh);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { bd.classList.add('in'); sh.classList.add('in'); });
  const close = () => {
    bd.classList.remove('in'); sh.classList.remove('in');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { bd.remove(); sh.remove(); }, 280);
    onClose?.();
  };
  const onKey = e => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  bd.addEventListener('click', close);
  sh.querySelector('.x').addEventListener('click', close);
  sh.close = close;
  return sh;
}

// ---------- boot ----------
export function boot(page) {
  applyTheme();
  const p = prefs();
  if (page !== 'login' && p.requireAuth && hasPasskey() && !isUnlocked()) {
    location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
    return false;
  }
  if (page !== 'login') mountShell(page);
  applyBrand();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyBrand());

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  document.addEventListener('aiec:notify', e => {
    const { title, body, url } = e.detail;
    toast(`${I.bell}<span><b style="font-weight:500">${esc(title)}</b> — ${esc(body)}</span> <a href="${esc(url)}">Open</a>`, 6000);
  });
  if (page !== 'login') rescheduleAll();
  return true;
}
