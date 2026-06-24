// Generates simple placeholder PNG icons (rounded accent square on dark) for the
// extension action. No image deps — emits PNGs directly via zlib. Replace with
// real artwork before store submission (tracked in devlog.md).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const BG = [14, 14, 16]; // #0e0e10
const FG = [124, 140, 255]; // #7c8cff accent

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size) {
  const r = size * 0.22; // corner radius
  const m = size * 0.18; // margin
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const inX = x >= m && x <= size - m;
      const inY = y >= m && y <= size - m;
      // rounded-rect test for the accent tile
      let fg = inX && inY;
      const corners = [
        [m + r, m + r],
        [size - m - r, m + r],
        [m + r, size - m - r],
        [size - m - r, size - m - r],
      ];
      if (fg) {
        for (const [cx, cy] of corners) {
          const nearCornerX = (x < cx && cx === m + r) || (x > cx && cx === size - m - r);
          const nearCornerY = (y < cy && cy === m + r) || (y > cy && cy === size - m - r);
          if (nearCornerX && nearCornerY) {
            const d = Math.hypot(x - cx, y - cy);
            if (d > r) fg = false;
          }
        }
      }
      const [cr, cg, cb] = fg ? FG : BG;
      const off = y * (size * 4 + 1) + 1 + x * 4;
      raw[off] = cr;
      raw[off + 1] = cg;
      raw[off + 2] = cb;
      raw[off + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 96, 128]) {
  writeFileSync(resolve(outDir, `${size}.png`), png(size));
  console.log('wrote', `public/icon/${size}.png`);
}
