// Generates 1280x800 Chrome Web Store promo screenshots from the real theme
// tokens, rendered on a faithful chat-UI mockup via headless Chrome (no native
// image deps). These are marketing/promo shots; you can also drop in real
// captures of the live themed ChatGPT/Claude pages. Run: node scripts/render-screenshots.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'docs', 'store', 'screenshots');
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Flagship themes (token subset) — mirrors src/themes/builtins.ts.
const THEMES = [
  { id: 'dark', name: 'Dark', t: { app: '#0e0e10', surface: '#16161a', elevated: '#1d1d22', text: '#ececec', sub: '#a0a0a8', accent: '#7c8cff', side: '#0b0b0d', code: '#1a1a1f', border: 'rgba(255,255,255,0.10)' } },
  { id: 'dracula', name: 'Dracula', t: { app: '#21222c', surface: '#282a36', elevated: '#343746', text: '#f8f8f2', sub: '#bcc2cd', accent: '#ff79c6', side: '#1d1e26', code: '#282a36', border: 'rgba(189,147,249,0.18)' } },
  { id: 'night-owl', name: 'Night Owl', t: { app: '#010e1a', surface: '#011627', elevated: '#0b2942', text: '#d6deeb', sub: '#8badc1', accent: '#82aaff', side: '#010e1a', code: '#011627', border: 'rgba(130,170,255,0.16)' } },
  { id: 'catppuccin', name: 'Catppuccin Mocha', t: { app: '#181825', surface: '#1e1e2e', elevated: '#313244', text: '#cdd6f4', sub: '#a6adc8', accent: '#cba6f7', side: '#11111b', code: '#1e1e2e', border: 'rgba(205,214,244,0.10)' } },
];

const page = (th) => {
  const t = th.t;
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;font-family:'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif}
  html,body{width:1280px;height:800px;background:${t.app};color:${t.text};overflow:hidden}
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
  </style>
  <div class="app">
    <aside class="side">
      <div class="brand"><span class="logo"></span> AI Chat Themes</div>
      <div class="new">+ New chat</div>
      <div class="grp">Recent</div>
      <div class="item active">Refactor the theme engine</div>
      <div class="item">Compare dark palettes</div>
      <div class="item">Weekend trip plan</div>
      <div class="grp">Projects</div>
      <div class="item">Extension</div>
      <div class="item">Research</div>
    </aside>
    <div class="main">
      <div class="top"><span class="host">ChatGPT &amp; Claude — themed</span><span class="badge">Theme: <span class="name">${th.name}</span></span></div>
      <div class="chat"><div class="col">
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
      <div class="composer"><div class="inp"><span>Message ${th.name}…</span><span class="send"></span></div></div>
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
