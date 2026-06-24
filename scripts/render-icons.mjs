// Rasterizes assets/icon.svg into the PNG sizes Chrome needs, using headless
// Chrome (no native image deps). Produces transparent PNGs in public/icon/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const svg = readFileSync(resolve(root, 'assets', 'icon.svg'), 'utf8');
const sizes = [16, 32, 48, 96, 128];

for (const size of sizes) {
  // Wrap the SVG so it fills an exact size×size viewport with no margins.
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block;width:${size}px;height:${size}px}
  </style>${svg}`;
  const tmp = resolve(outDir, `_wrap-${size}.html`);
  writeFileSync(tmp, html);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${resolve(outDir, `${size}.png`)}`,
      `file://${tmp}`,
    ],
    { stdio: 'ignore' },
  );
  rmSync(tmp, { force: true });
  console.log('rendered', `public/icon/${size}.png`);
}
