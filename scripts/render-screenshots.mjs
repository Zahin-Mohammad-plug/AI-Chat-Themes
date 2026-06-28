// Generates 1280x800 Chrome Web Store promo screenshots from the real theme
// tokens, rendered on a faithful chat-UI mockup via headless Chrome (no native
// image deps). Palette themes render a conversation; expressive themes
// (gradient/texture) render the new-chat landing screen so the ambiance shows.
// These mirror src/themes/builtins.ts + src/themes/assets.ts.
// Run: node scripts/render-screenshots.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'docs', 'store', 'screenshots');
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// --- Bundled textures (kept in sync with src/themes/assets.ts) ---
const FOREST_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='#0b1a12'/><stop offset='0.5' stop-color='#163a28'/><stop offset='1' stop-color='#0a1710'/>
</linearGradient></defs>
<rect width='1200' height='800' fill='url(#sky)'/>
<ellipse cx='600' cy='400' rx='680' ry='170' fill='#4f8a66' opacity='0.22'/>
<g fill='#0f2a1c' opacity='0.65'>
<polygon points='120,560 175,360 230,560'/><polygon points='320,580 385,330 450,580'/><polygon points='560,560 615,350 670,560'/><polygon points='780,585 850,320 920,585'/><polygon points='1000,565 1060,355 1120,565'/>
</g>
<g fill='#06160e'>
<polygon points='40,640 110,400 180,640'/><polygon points='250,660 330,380 410,660'/><polygon points='470,650 545,390 620,650'/><polygon points='690,665 775,360 860,665'/><polygon points='930,655 1010,395 1090,655'/><polygon points='1120,660 1180,430 1240,660'/>
</g>
<rect y='640' width='1200' height='160' fill='#05130c'/>
</svg>`;

const CYBER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
<defs><linearGradient id='night' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='#0a0612'/><stop offset='0.55' stop-color='#1c0c36'/><stop offset='1' stop-color='#0a0612'/>
</linearGradient><radialGradient id='moon' cx='0.5' cy='0.5' r='0.5'>
<stop offset='0' stop-color='#ffb3e6'/><stop offset='0.45' stop-color='#ff2bd6' stop-opacity='0.5'/><stop offset='1' stop-color='#ff2bd6' stop-opacity='0'/>
</radialGradient></defs>
<rect width='1200' height='800' fill='url(#night)'/>
<circle cx='955' cy='185' r='230' fill='url(#moon)'/>
<circle cx='955' cy='185' r='66' fill='#ffd9f2'/>
<ellipse cx='600' cy='600' rx='780' ry='180' fill='#ff2bd6' opacity='0.22'/>
<ellipse cx='600' cy='650' rx='560' ry='120' fill='#22d3ee' opacity='0.16'/>
<g fill='#180b30'>
<rect x='0' y='500' width='95' height='300'/><rect x='110' y='470' width='80' height='330'/><rect x='205' y='520' width='90' height='280'/><rect x='310' y='455' width='85' height='345'/><rect x='410' y='505' width='95' height='295'/><rect x='520' y='480' width='80' height='320'/><rect x='615' y='515' width='90' height='285'/><rect x='720' y='465' width='85' height='335'/><rect x='820' y='500' width='95' height='300'/><rect x='930' y='475' width='80' height='325'/><rect x='1025' y='515' width='90' height='285'/><rect x='1130' y='485' width='90' height='315'/>
</g>
<g fill='#0a0518'>
<rect x='55' y='420' width='95' height='380'/><rect x='175' y='350' width='75' height='450'/><rect x='275' y='460' width='110' height='340'/><rect x='415' y='300' width='85' height='500'/><rect x='525' y='440' width='95' height='360'/><rect x='645' y='370' width='78' height='430'/><rect x='750' y='285' width='105' height='515'/><rect x='880' y='430' width='90' height='370'/><rect x='995' y='340' width='75' height='460'/><rect x='1095' y='460' width='95' height='340'/>
</g>
<g fill='#ff5de0' opacity='0.9'>
<rect x='78' y='440' width='9' height='9'/><rect x='110' y='480' width='9' height='9'/><rect x='112' y='520' width='9' height='9'/><rect x='200' y='380' width='9' height='9'/><rect x='205' y='430' width='9' height='9'/><rect x='450' y='330' width='9' height='9'/><rect x='455' y='400' width='9' height='9'/><rect x='560' y='470' width='9' height='9'/><rect x='778' y='315' width='9' height='9'/><rect x='785' y='390' width='9' height='9'/><rect x='790' y='460' width='9' height='9'/><rect x='915' y='460' width='9' height='9'/><rect x='1020' y='370' width='9' height='9'/><rect x='1025' y='440' width='9' height='9'/>
</g>
<g fill='#5ef0ff' opacity='0.85'>
<rect x='300' y='490' width='9' height='9'/><rect x='305' y='540' width='9' height='9'/><rect x='540' y='460' width='9' height='9'/><rect x='650' y='400' width='9' height='9'/><rect x='655' y='460' width='9' height='9'/><rect x='885' y='460' width='9' height='9'/><rect x='890' y='520' width='9' height='9'/><rect x='1100' y='490' width='9' height='9'/></g>
<rect y='735' width='1200' height='65' fill='#0a0612'/>
</svg>`;

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n+/g, ''))}")`;
const TEX = { forest: svgUrl(FOREST_SVG), cyber: svgUrl(CYBER_SVG) };

// Flagship themes (token subset) — mirrors src/themes/builtins.ts.
const THEMES = [
  { id: 'dark', name: 'Dark', t: { app: '#0e0e10', surface: '#16161a', elevated: '#1d1d22', text: '#ececec', sub: '#a0a0a8', accent: '#7c8cff', side: '#0b0b0d', code: '#1a1a1f', border: 'rgba(255,255,255,0.10)' } },
  { id: 'dracula', name: 'Dracula', t: { app: '#21222c', surface: '#282a36', elevated: '#343746', text: '#f8f8f2', sub: '#bcc2cd', accent: '#ff79c6', side: '#1d1e26', code: '#282a36', border: 'rgba(189,147,249,0.18)' } },
  { id: 'night-owl', name: 'Night Owl', t: { app: '#010e1a', surface: '#011627', elevated: '#0b2942', text: '#d6deeb', sub: '#8badc1', accent: '#82aaff', side: '#010e1a', code: '#011627', border: 'rgba(130,170,255,0.16)' } },
  { id: 'catppuccin', name: 'Catppuccin Mocha', t: { app: '#181825', surface: '#1e1e2e', elevated: '#313244', text: '#cdd6f4', sub: '#a6adc8', accent: '#cba6f7', side: '#11111b', code: '#1e1e2e', border: 'rgba(205,214,244,0.10)' } },

  // --- Schema v2 showcase set ---
  { id: 'midnight-oled', name: 'Midnight OLED', t: { app: '#000000', surface: '#050507', elevated: '#0e0e12', text: '#e8e8ea', sub: '#8b8b93', accent: '#6ea8fe', side: '#000000', code: '#08080a', border: 'rgba(255,255,255,0.07)' } },
  { id: 'paper', name: 'Paper', t: { app: '#f4ecdc', surface: '#fbf5e9', elevated: '#fffaf0', text: '#3a3326', sub: '#6b6150', accent: '#b5742f', side: '#efe6d2', code: '#efe6d2', border: 'rgba(60,50,30,0.14)' } },
  { id: 'aurora', name: 'Aurora', t: { app: '#eef0fb', surface: '#ffffff', elevated: '#f7f8ff', text: '#2a2740', sub: '#5b5676', accent: '#8b5cf6', side: '#f2f1fb', code: '#f3f2fc', border: 'rgba(80,70,140,0.14)' }, ex: { gradient: 'linear-gradient(135deg,#f9d7ec 0%,#e7d9fb 38%,#d6e4fb 70%,#d9f1f0 100%)' } },
  { id: 'forest', name: 'Forest', t: { app: '#0c1a12', surface: '#11241a', elevated: '#1a3326', text: '#e6f0e8', sub: '#9db5a6', accent: '#7fc89a', side: '#0a160f', code: '#0e2016', border: 'rgba(160,210,180,0.12)' }, ex: { tex: TEX.forest, scrim: 'rgba(12,26,18,0.82)' } },
  { id: 'cyberpunk', name: 'Cyberpunk', t: { app: '#0a0612', surface: '#140b22', elevated: '#1e1133', text: '#f2e9ff', sub: '#b9a8d6', accent: '#ff2bd6', side: '#0a0612', code: '#120a20', border: 'rgba(255,43,214,0.22)' }, ex: { tex: TEX.cyber, scrim: 'rgba(10,6,18,0.55)', glow: '0 0 10px rgba(255,43,214,0.85)' } },
];

// Background CSS for the app shell (palette = solid; expressive = scrimmed
// texture and/or gradient layered over the solid base — same as the engine).
const shellBg = (th) => {
  const layers = [];
  if (th.ex?.tex) layers.push(`linear-gradient(${th.ex.scrim},${th.ex.scrim}),${th.ex.tex}`);
  if (th.ex?.gradient) layers.push(th.ex.gradient);
  const img = layers.length
    ? `background-image:${layers.join(',')};background-size:cover;background-position:center;background-repeat:no-repeat;`
    : '';
  return `background:${th.t.app};${img}`;
};

const sidebar = (t) => `<aside class="side">
      <div class="brand"><span class="logo"></span> AI Chat Themes</div>
      <div class="new">+ New chat</div>
      <div class="grp">Recent</div>
      <div class="item active">Refactor the theme engine</div>
      <div class="item">Compare dark palettes</div>
      <div class="item">Weekend trip plan</div>
      <div class="grp">Projects</div>
      <div class="item">Extension</div>
      <div class="item">Research</div>
    </aside>`;

// Conversation layout (palette themes) — shows themed bubbles + code block.
const conversation = (th) => `<div class="chat"><div class="col">
        <div class="row user"><div class="bubble user">Give me a TypeScript snippet that clamps a number.</div></div>
        <div class="row">
          <div class="av">AI</div>
          <div class="bubble">
            <p>Here's a small helper:</p>
            <pre><span class="k">export const</span> <span class="f">clamp</span> = (<span class="f">n</span>, <span class="f">lo</span>, <span class="f">hi</span>) <span class="k">=&gt;</span>
  <span class="f">Math</span>.<span class="f">min</span>(<span class="f">hi</span>, <span class="f">Math</span>.<span class="f">max</span>(<span class="f">lo</span>, <span class="f">n</span>));</pre>
            <p class="muted">Readable code blocks, themed surfaces, and accents — across both assistants.</p>
          </div>
        </div>
      </div></div>
      <div class="composer"><div class="inp"><span>Message ${th.name}…</span><span class="send"></span></div></div>`;

// Landing layout (expressive themes) — empty new-chat screen so the gradient /
// city / forest ambiance is fully visible behind the heading + composer.
const landing = (th) => {
  const glow = th.ex?.glow ? `text-shadow:${th.ex.glow};` : '';
  const chip = (label) => `<span class="chip">${label}</span>`;
  return `<div class="land">
        <h1 style="${glow}">What can I help with?</h1>
        <div class="composer land-comp"><div class="inp"><span>Message ${th.name}…</span><span class="send"></span></div></div>
        <div class="chips">${chip('Create image')}${chip('Analyze data')}${chip('Summarize text')}${chip('Help me write')}</div>
      </div>`;
};

const page = (th) => {
  const t = th.t;
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;font-family:'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif}
  html,body{width:1280px;height:800px;${shellBg(th)}color:${t.text};overflow:hidden}
  .app{display:flex;height:800px}
  .side{width:280px;background:${t.side};border-right:1px solid ${t.border};padding:18px 14px;display:flex;flex-direction:column;gap:6px}
  .brand{font-weight:700;font-size:17px;margin-bottom:14px;display:flex;align-items:center;gap:9px}
  .logo{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#8b9bff,#b86bff)}
  .new{background:${t.accent};color:${t.app};font-weight:600;border-radius:10px;padding:9px 12px;font-size:13px;width:max-content}
  .grp{color:${t.sub};font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:16px 4px 4px}
  .item{color:${t.sub};font-size:13px;padding:7px 8px;border-radius:8px}
  .item.active{background:${t.elevated};color:${t.text}}
  .main{flex:1;display:flex;flex-direction:column}
  .top{height:52px;border-bottom:1px solid ${t.border};display:flex;align-items:center;justify-content:space-between;padding:0 22px}
  .top .host{color:${t.sub};font-size:13px}
  .badge{background:${t.elevated};border:1px solid ${t.border};color:${t.text};font-size:12px;padding:5px 11px;border-radius:999px}
  .chat{flex:1;overflow:hidden;padding:30px 0}
  .col{max-width:760px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;gap:18px}
  .row{display:flex;gap:12px}
  .row.user{justify-content:flex-end}
  .av{width:30px;height:30px;border-radius:8px;flex:none;background:${t.accent};color:${t.app};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
  .bubble{background:${t.surface};border:1px solid ${t.border};border-radius:14px;padding:13px 16px;font-size:14px;line-height:1.55;max-width:76%}
  .bubble.user{background:${t.elevated}}
  .bubble p{margin:0 0 8px} .bubble p:last-child{margin:0}
  .muted{color:${t.sub}}
  pre{background:${t.code};border:1px solid ${t.border};border-radius:10px;padding:12px 14px;font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;overflow:hidden;margin-top:6px}
  .k{color:${t.accent}} .s{color:${t.sub}} .f{color:${t.text}}
  .composer{max-width:760px;margin:14px auto 26px;padding:0 24px;width:100%}
  .inp{background:${t.surface};border:1px solid ${t.border};border-radius:16px;padding:15px 18px;color:${t.sub};font-size:14px;display:flex;justify-content:space-between;align-items:center}
  .send{width:30px;height:30px;border-radius:50%;background:${t.accent}}
  .name{color:${t.accent};font-weight:600}
  .land{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:0 24px}
  .land h1{font-size:34px;font-weight:600;color:${t.text}}
  .land-comp{max-width:680px}
  .chips{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
  .chip{background:${t.surface};border:1px solid ${t.border};color:${t.text};font-size:13px;padding:9px 15px;border-radius:999px}
  </style>
  <div class="app">
    ${sidebar(t)}
    <div class="main">
      <div class="top"><span class="host">ChatGPT &amp; Claude — themed</span><span class="badge">Theme: <span class="name" style="${th.ex?.glow ? 'text-shadow:' + th.ex.glow + ';' : ''}">${th.name}</span></span></div>
      ${th.ex ? landing(th) : conversation(th)}
    </div>
  </div>`;
};

for (const th of THEMES) {
  const tmp = resolve(outDir, `_${th.id}.html`);
  writeFileSync(tmp, page(th));
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=1280,800`, `--screenshot=${resolve(outDir, `${th.id}.png`)}`, `file://${tmp}`,
  ], { stdio: 'ignore' });
  rmSync(tmp, { force: true });
  console.log('rendered', `docs/store/screenshots/${th.id}.png`);
}
