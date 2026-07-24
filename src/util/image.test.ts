import { describe, expect, it } from 'vitest';
import { sniffImageKind } from './image';

describe('sniffImageKind', () => {
  it('detects PNG / JPEG / WebP by magic bytes', () => {
    expect(sniffImageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(sniffImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    webp.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(sniffImageKind(webp)).toBe('webp');
  });

  it('rejects SVG, GIF, and anything else', () => {
    expect(sniffImageKind(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull(); // "<svg"
    expect(sniffImageKind(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull(); // "GIF89a"
    expect(sniffImageKind(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
    expect(sniffImageKind(new Uint8Array([]))).toBeNull();
  });
});
