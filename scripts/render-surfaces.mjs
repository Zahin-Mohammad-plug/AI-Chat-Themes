// Renders a single mock that exercises the trickier surfaces — code blocks, a
// document/artifact panel, and a settings dialog — in a dark AND a light theme,
// using the real theme tokens. A visual prod-readiness check for the surfaces
// most likely to break (PRD Section 7). Run: node scripts/render-surfaces.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'docs', 'store', 'screenshots');
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const THEMES = [
  { id: 'surfaces-dark', name: 'Dracula (dark)', t: { app: '#21222c', surface: '#282a36', elevated: '#343746', text: '#f8f8f2', sub: '#bcc2cd', accent: '#ff79c6', accentText: '#21222c', side: '#1d1e26', code: '#282a36', border: 'rgba(189,147,249,0.18)' } },
  { id: 'surfaces-light', name: 'Paper (light)', t: { app: '#f4ecdc', surface: '#fbf5e9', elevated: '#fffaf0', text: '#3a3326', sub: '#6b6150', accent: '#b5742f', accentText: '#fffaf0', side: '#efe6d2', code: '#efe6d2', border: 'rgba(60,50,30,0.14)' } },
];

const page = (th) => {
  const t = th.t;
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;font-family:'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif}
  html,body{width:1280px;height:960px;background:${t.app};color:${t.text};overflow:hidden}
  .app{display:flex;height:960px}
  .side{width:240px;background:${t.side};border-right:1px solid ${t.border};padding:16px 12px;display:flex;flex-direction:column;gap:7px}
  .brand{font-weight:700;font-size:15px;margin-bottom:12px}
  .new{background:${t.accent};color:${t.accentText};font-weight:600;border-radius:9px;padding:8px 11px;font-size:12px;width:max-content}
  .item{color:${t.sub};font-size:12px;padding:6px 7px;border-radius:7px}
  .item.active{background:${t.elevated};color:${t.text}}
  .main{flex:1;display:flex;flex-direction:column;min-width:0}
  .top{height:48px;border-bottom:1px solid ${t.border};display:flex;align-items:center;justify-content:space-between;padding:0 20px}
  .host{color:${t.sub};font-size:12px}
  .badge{background:${t.elevated};border:1px solid ${t.border};font-size:12px;padding:5px 10px;border-radius:999px}
  .name{color:${t.accent};font-weight:600}
  .body{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px;overflow:hidden}
  .col{display:flex;flex-direction:column;gap:16px;min-width:0}
  .h{font-size:12px;color:${t.sub};text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
  .card{background:${t.surface};border:1px solid ${t.border};border-radius:12px;padding:14px}
  .row{display:flex;gap:10px}.row.user{justify-content:flex-end}
  .bubble{background:${t.surface};border:1px solid ${t.border};border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.5;max-width:90%}
  .bubble.user{background:${t.elevated}}
  pre{background:${t.code};border:1px solid ${t.border};border-radius:9px;padding:11px 13px;font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;margin-top:8px;white-space:pre-wrap}
  .k{color:${t.accent}}
  .doc h2{font-size:16px;margin-bottom:6px}
  .doc p{font-size:13px;color:${t.sub};line-height:1.5;margin-bottom:8px}
  .doc table{width:100%;border-collapse:collapse;font-size:12px}
  .doc th,.doc td{border:1px solid ${t.border};padding:6px 8px;text-align:left}
  .doc th{background:${t.elevated}}
  .dialog{background:${t.surface};border:1px solid ${t.border};border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
  .dialog h3{font-size:15px;margin-bottom:10px}
  .srow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid ${t.border};font-size:13px}
  .srow:first-of-type{border-top:none}
  .pill{width:38px;height:22px;border-radius:999px;background:${t.elevated};border:1px solid ${t.border};position:relative}
  .pill.on{background:${t.accent}}
  .knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:${t.app}}
  .pill.on .knob{left:18px}
  .menu{margin-top:10px;background:${t.elevated};border:1px solid ${t.border};border-radius:9px;padding:6px}
  .mi{font-size:12px;padding:7px 9px;border-radius:6px}
  .mi.sel{background:${t.surface};color:${t.accent}}
  .composer{margin-top:auto;background:${t.surface};border:1px solid ${t.border};border-radius:13px;padding:11px 14px;font-size:12px;color:${t.sub};display:flex;justify-content:space-between;align-items:center}
  .send{width:18px;height:18px;border-radius:50%;background:${t.accent}}
  </style>
  <div class="app">
    <aside class="side">
      <div class="brand">AI Chat Themes</div>
      <div class="new">+ New chat</div>
      <div class="item active">Surface stress test</div>
      <div class="item">Compare palettes</div>
      <div class="item">Weekend plan</div>
    </aside>
    <div class="main">
      <div class="top"><span class="host">ChatGPT &amp; Claude — themed</span><span class="badge">Theme: <span class="name">${th.name}</span></span></div>
      <div class="body">
        <div class="col">
          <div class="h">Chat + code block</div>
          <div class="row user"><div class="bubble user">Show me a debounce in TypeScript.</div></div>
          <div class="row"><div class="bubble">Sure — here's a tiny one:
            <pre><span class="k">export function</span> debounce(fn, ms) {
  <span class="k">let</span> id;
  <span class="k">return</span> (...a) =&gt; { clearTimeout(id); id = setTimeout(() =&gt; fn(...a), ms); };
}</pre>
          </div></div>
          <div class="composer"><span>Message…</span><span class="send"></span></div>
        </div>
        <div class="col">
          <div>
            <div class="h">Document / artifact</div>
            <div class="card doc">
              <h2>Quarterly summary</h2>
              <p>Themed body text stays readable, and tables inherit the surface and border tokens.</p>
              <table><tr><th>Metric</th><th>Q3</th><th>Q4</th></tr><tr><td>Active users</td><td>12.4k</td><td>18.1k</td></tr><tr><td>Retention</td><td>61%</td><td>67%</td></tr></table>
            </div>
          </div>
          <div>
            <div class="h">Settings dialog + menu</div>
            <div class="dialog">
              <h3>Settings</h3>
              <div class="srow"><span>Dark interface</span><span class="pill on"><span class="knob"></span></span></div>
              <div class="srow"><span>Show follow-up suggestions</span><span class="pill"><span class="knob"></span></span></div>
              <div class="srow"><span>Language</span><span style="color:${t.sub}">English ▾</span></div>
              <div class="menu"><div class="mi sel">English</div><div class="mi">Español</div><div class="mi">日本語</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
};

for (const th of THEMES) {
  const tmp = resolve(outDir, `_${th.id}.html`);
  writeFileSync(tmp, page(th));
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=1280,960`, `--screenshot=${resolve(outDir, `${th.id}.png`)}`, `file://${tmp}`,
  ], { stdio: 'ignore' });
  rmSync(tmp, { force: true });
  console.log('rendered', `docs/store/screenshots/${th.id}.png`);
}
