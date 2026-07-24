// Local image processing for user background images (PRD 6.2 / 13.3).
// Runs in the editor (an extension page — no host CSP). Everything is local: the
// file is sniffed by magic bytes, decoded, redrawn on a canvas (which strips all
// metadata/EXIF), downscaled, and re-encoded to a compact webp/jpeg data URI. No
// network, no SVG (script risk), no animation. Output flows through the schema's
// isSafeImageDataUrl gate before it's ever stored.

const MAX_DIM = 1920; // longest edge
const TARGET_BYTES = 512 * 1024; // ~512 KiB encoded data URI

export type ImageKind = 'png' | 'jpeg' | 'webp';

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

/** Identify an image by its magic bytes (not its extension/claimed MIME). Pure. */
export function sniffImageKind(head: Uint8Array): ImageKind | null {
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
    return 'png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (
    head.length >= 12 &&
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && // RIFF
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // WEBP
  )
    return 'webp';
  return null;
}

function canEncode(canvas: HTMLCanvasElement, type: string): boolean {
  return canvas.toDataURL(type, 0.5).startsWith(`data:${type}`);
}

/** Encode the canvas to the smallest readable data URI ≤ targetBytes, preferring
 *  webp; binary-searches quality. Throws if it can't fit. */
function encodeToFit(canvas: HTMLCanvasElement, targetBytes: number): string {
  const types = (canEncode(canvas, 'image/webp') ? ['image/webp', 'image/jpeg'] : ['image/jpeg'])
    .filter((t) => canEncode(canvas, t));
  let fallback = '';
  for (const type of types) {
    let hi = 0.92;
    let best = canvas.toDataURL(type, hi);
    if (best.length <= targetBytes) return best;
    let lo = 0.35;
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const d = canvas.toDataURL(type, q);
      if (d.length <= targetBytes) {
        best = d;
        lo = q;
      } else {
        hi = q;
      }
    }
    if (best.length <= targetBytes) return best;
    fallback = fallback && fallback.length < best.length ? fallback : best;
  }
  throw new Error('That image is too detailed to compress under the size limit — try a smaller one.');
}

/** Validate + downscale + re-encode a user image file to a safe, compact data URI. */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!sniffImageKind(head)) {
    throw new Error('Unsupported image. Please use a PNG, JPEG, or WebP file.');
  }

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read that image file.');
  }

  const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close?.();
    throw new Error('Image processing is unavailable in this browser.');
  }
  ctx.drawImage(bmp, 0, 0, w, h); // redraw strips EXIF/metadata
  bmp.close?.();

  const dataUrl = encodeToFit(canvas, TARGET_BYTES);
  return { dataUrl, width: w, height: h, bytes: dataUrl.length };
}
