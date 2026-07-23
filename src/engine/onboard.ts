// One-time in-page first-run hint (PRD 10.3). Shown once, the first time the
// content script themes a host page after install, to point the user at the
// toolbar icon. Deliberately minimal and safe: a fixed, self-contained,
// dismissible toast that never blocks host controls, auto-dismisses, and uses
// only inline styles (host CSS can't restyle it, and it can't shift host
// layout). Fully removed on dismiss/timeout — leaves no trace.

const HINT_ID = 'act-onboard';
const AUTO_DISMISS_MS = 9000;

export function showOnboardingHint(doc: Document = document): void {
  if (doc.getElementById(HINT_ID)) return;
  const host = doc.body ?? doc.documentElement;
  if (!host) return;

  const reduce =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = doc.createElement('div');
  el.id = HINT_ID;
  el.setAttribute('role', 'status');
  el.style.cssText = [
    'position:fixed',
    'top:14px',
    'left:50%',
    `transform:translateX(-50%) translateY(${reduce ? '0' : '-10px'})`,
    'z-index:2147483000',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'max-width:calc(100vw - 32px)',
    'padding:9px 10px 9px 13px',
    'border-radius:12px',
    'background:#1b1b21',
    'color:#f1f1f4',
    'border:1px solid rgba(255,255,255,0.15)',
    'box-shadow:0 12px 34px rgba(0,0,0,0.45)',
    "font:500 13px system-ui,-apple-system,'Segoe UI',sans-serif",
    'opacity:0',
    'transition:opacity .22s ease,transform .22s ease',
    'pointer-events:auto',
  ].join(';');

  const dot = doc.createElement('span');
  dot.style.cssText =
    'flex:none;width:9px;height:9px;border-radius:3px;background:linear-gradient(135deg,#8b93ff,#b86bff)';

  const text = doc.createElement('span');
  text.textContent = 'AI Chat Themes is on — click the toolbar icon to switch themes.';

  const close = doc.createElement('button');
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  close.style.cssText = [
    'flex:none',
    'margin-left:2px',
    'width:22px',
    'height:22px',
    'border:0',
    'border-radius:7px',
    'background:transparent',
    'color:#9a9aa6',
    'font-size:16px',
    'line-height:1',
    'cursor:pointer',
  ].join(';');

  let timer: ReturnType<typeof setTimeout> | null = null;
  const remove = (): void => {
    if (timer) clearTimeout(timer);
    el.style.opacity = '0';
    el.style.transform = `translateX(-50%) translateY(${reduce ? '0' : '-10px'})`;
    setTimeout(() => el.remove(), 240);
  };
  close.addEventListener('click', remove);

  el.append(dot, text, close);
  host.appendChild(el);

  // Reveal on the next frame so the transition runs.
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  timer = setTimeout(remove, AUTO_DISMISS_MS);
}
