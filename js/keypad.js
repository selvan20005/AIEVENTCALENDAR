// iOS-style passcode keypad. mountKeypad(el, { title, onComplete(code) → Promise<bool|string> })
// onComplete returns true (accept), false/'message' (shake + clear).
import { LENGTH } from './passcode.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const SUB = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };

export function mountKeypad(root, { title = 'Enter passcode', hint = '', onComplete }) {
  let code = '', busy = false;
  root.innerHTML = `
    <div class="pin">
      <div class="pin-title" data-r="title"></div>
      <div class="pin-dots" data-r="dots">${'<i></i>'.repeat(LENGTH)}</div>
      <div class="pin-hint" data-r="hint"></div>
      <div class="pin-pad">${KEYS.map(k => k === '' ? '<span></span>'
        : k === 'del' ? '<button type="button" class="pin-key ghost" data-k="del" aria-label="Delete">Delete</button>'
        : `<button type="button" class="pin-key" data-k="${k}">${k}<small>${SUB[k] || '&nbsp;'}</small></button>`).join('')}</div>
    </div>`;
  const $ = r => root.querySelector(`[data-r="${r}"]`);
  const setTitle = t => ($('title').textContent = t);
  const setHint = (t, err) => { $('hint').textContent = t || ''; $('hint').classList.toggle('err', !!err); };
  const paint = () => $('dots').querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < code.length));
  setTitle(title); setHint(hint);

  async function press(k) {
    if (busy) return;
    if (k === 'del') code = code.slice(0, -1);
    else if (code.length < LENGTH) code += k;
    paint();
    if (code.length === LENGTH) {
      busy = true;
      const res = await onComplete(code);
      if (res !== true) {
        $('dots').classList.add('shake'); navigator.vibrate?.(60);
        setTimeout(() => { $('dots').classList.remove('shake'); code = ''; paint(); busy = false; }, 420);
        if (typeof res === 'string') setHint(res, true);
      } else busy = false;
    }
  }
  root.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
  const onKey = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  document.addEventListener('keydown', onKey);
  return { setTitle, setHint, reset: () => { code = ''; paint(); busy = false; }, destroy: () => document.removeEventListener('keydown', onKey) };
}
