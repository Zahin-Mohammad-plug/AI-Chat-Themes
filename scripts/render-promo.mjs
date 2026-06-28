// Generates Chrome Web Store promo tiles as JPEG (no alpha, per store rules):
//   - Small promo tile   440x280
//   - Marquee promo tile 1400x560
// Rendered via headless Chrome, then flattened to JPEG with sips. No native deps.
// Run: node scripts/render-promo.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'docs', 'store', 'promo');
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LOGO = `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8b9bff"/><stop offset=".55" stop-color="#7c6bff"/><stop offset="1" stop-color="#b86bff"/>
    </linearGradient>
    <clipPath id="b"><path d="M64 22C40 22 22 38 22 60C22 75 30 87 43 94L40 110L58 98C60 98 62 99 64 99C88 99 106 82 106 60C106 38 88 22 64 22Z"/></clipPath>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#t)"/>
  <g clip-path="url(#b)"><rect x="22" y="18" width="42" height="96" fill="#fbfbfd"/><rect x="64" y="18" width="42" height="96" fill="#1b1b24"/></g>
  <path d="M64 22C40 22 22 38 22 60C22 75 30 87 43 94L40 110L58 98C60 98 62 99 64 99C88 99 106 82 106 60C106 38 88 22 64 22Z" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linejoin="round"/>
  <line x1="64" y1="26" x2="64" y2="96" stroke="#7c6bff" stroke-opacity=".55" stroke-width="2.5"/>
</svg>`;

const CARDS = [
  { name: 'Dracula', app: '#21222c', side: '#1d1e26', surface: '#282a36', accent: '#ff79c6', text: '#f8f8f2', sub: '#6272a4' },
  { name: 'Night Owl', app: '#011627', side: '#010e1a', surface: '#0b2942', accent: '#82aaff', text: '#d6deeb', sub: '#5f7e97' },
  { name: 'Catppuccin', app: '#1e1e2e', side: '#11111b', surface: '#313244', accent: '#cba6f7', text: '#cdd6f4', sub: '#7f849c' },
];
const DOTS = ['#ff79c6', '#82aaff', '#cba6f7', '#ffc600', '#ffcc66', '#61afef', '#80cbc4', '#7c8cff'];

const base = (w, h, inner) => `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;font-family:'SF Pro Display',system-ui,-apple-system,'Segoe UI',sans-serif}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  .bg{position:relative;width:${w}px;height:${h}px;background:linear-gradient(135deg,#8b9bff 0%,#7c6bff 52%,#b86bff 100%);color:#fff;overflow:hidden}
  .sheen{position:absolute;inset:0;background:radial-gradient(120% 90% at 22% 18%,rgba(255,255,255,.30),rgba(255,255,255,0) 55%)}
  .brand{display:flex;align-items:center;gap:14px;font-weight:700}
  .brand svg{display:block}
  .dot{border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.25)}
  .chip{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 11px;font-size:13px;font-weight:600;backdrop-filter:blur(4px)}
  .card{position:absolute;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(20,10,40,.38);display:flex;border:1px solid rgba(255,255,255,.12)}
  .card .cside{width:30%;padding:10px 8px;display:flex;flex-direction:column;gap:6px}
  .card .cbar{height:7px;border-radius:4px}
  .card .cmain{flex:1;padding:12px 12px;display:flex;flex-direction:column;gap:8px}
  .card .ctitle{font-size:11px;font-weight:700}
  .card .cmsg{height:9px;border-radius:5px}
  .card .cbtn{margin-top:auto;width:34px;height:14px;border-radius:7px}
</style><div class="bg"><div class="sheen"></div>${inner}</div>`;

const miniCard = (c, style) => `<div class="card" style="${style};background:${c.app}">
  <div class="cside" style="background:${c.side}">
    <div class="cbar" style="background:${c.accent};width:70%"></div>
    <div class="cbar" style="background:${c.surface};width:90%"></div>
    <div class="cbar" style="background:${c.surface};width:60%"></div>
  </div>
  <div class="cmain">
    <div class="ctitle" style="color:${c.text}">${c.name}</div>
    <div class="cmsg" style="background:${c.surface};width:92%"></div>
    <div class="cmsg" style="background:${c.surface};width:74%"></div>
    <div class="cmsg" style="background:${c.surface};width:84%"></div>
    <div class="cbtn" style="background:${c.accent}"></div>
  </div>
</div>`;

// --- Small tile 440x280 ---
const small = base(
  440,
  280,
  `<div style="position:absolute;inset:0;padding:28px;display:flex;flex-direction:column">
    <div class="brand" style="font-size:21px"><span style="width:38px;height:38px;display:inline-block">${LOGO}</span> AI Chat Themes</div>
    <div style="margin-top:auto">
      <div style="font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-.5px">Dark mode &amp; designer<br>themes for ChatGPT<br>&amp; Claude</div>
      <div style="margin-top:12px;display:flex;gap:9px;align-items:center">
        ${DOTS.map((d) => `<span class="dot" style="width:16px;height:16px;background:${d}"></span>`).join('')}
      </div>
      <div style="margin-top:10px;font-size:13px;font-weight:600;opacity:.9">Dark · Light · AMOLED + 9 more</div>
    </div>
  </div>`,
);

// --- Marquee tile 1400x560 ---
const marquee = base(
  1400,
  560,
  `<div style="position:absolute;left:0;top:0;width:720px;height:560px;padding:64px 56px;display:flex;flex-direction:column">
    <div class="brand" style="font-size:32px"><span style="width:56px;height:56px;display:inline-block">${LOGO}</span> AI Chat Themes</div>
    <div style="margin-top:34px;font-size:46px;font-weight:800;line-height:1.12;letter-spacing:-1px">Dark mode &amp; designer themes<br>for ChatGPT and Claude</div>
    <div style="margin-top:18px;font-size:21px;font-weight:600;opacity:.92">Resilient · Token-first · Private</div>
    <div style="margin-top:26px;display:flex;flex-wrap:wrap;gap:10px;max-width:560px">
      ${CARDS.concat([{ name: 'Cobalt2', accent: '#ffc600' }, { name: 'Ayu', accent: '#ffcc66' }, { name: 'One Dark', accent: '#61afef' }])
        .map((c) => `<span class="chip"><span class="dot" style="width:11px;height:11px;background:${c.accent}"></span>${c.name}</span>`)
        .join('')}
    </div>
  </div>
  ${miniCard(CARDS[0], 'width:330px;height:208px;right:96px;top:70px;transform:rotate(5deg)')}
  ${miniCard(CARDS[1], 'width:330px;height:208px;right:150px;top:185px;transform:rotate(-3deg);z-index:2')}
  ${miniCard(CARDS[2], 'width:330px;height:208px;right:70px;top:312px;transform:rotate(4deg)')}`,
);

const jobs = [
  { id: 'small-promo-440x280', w: 440, h: 280, html: small },
  { id: 'marquee-promo-1400x560', w: 1400, h: 560, html: marquee },
];

for (const j of jobs) {
  const tmpHtml = resolve(outDir, `_${j.id}.html`);
  const tmpPng = resolve(outDir, `_${j.id}.png`);
  writeFileSync(tmpHtml, j.html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${j.w},${j.h}`, `--screenshot=${tmpPng}`, `file://${tmpHtml}`,
  ], { stdio: 'ignore' });
  // Flatten to JPEG (no alpha channel, satisfies "JPEG or 24-bit PNG no alpha").
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', tmpPng, '--out', resolve(outDir, `${j.id}.jpg`)], { stdio: 'ignore' });
  rmSync(tmpHtml, { force: true });
  rmSync(tmpPng, { force: true });
  console.log('rendered', `docs/store/promo/${j.id}.jpg`);
}
