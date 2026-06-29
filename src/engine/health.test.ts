// Tests for the post-apply health check (PRD 5.4 / C3), incl. the optional-anchor
// rule that prevents on-demand surfaces (code blocks, dialogs) from emitting
// false "host changed" signals at page load.
import { describe, expect, it } from 'vitest';
import { runHealthCheck } from './health';
import { BUNDLED_ADAPTER_MAP } from '@/src/adapters/map';
import type { HostAdapter } from '@/src/adapters/types';

function fakeDoc(presentSelectors: string[]): Document {
  const present = new Set(presentSelectors);
  return { querySelector: (sel: string) => (present.has(sel) ? {} : null) } as unknown as Document;
}

const adapter: HostAdapter = {
  host: 'chatgpt',
  fingerprint: 'fp',
  tokenFormat: 'color',
  tokenVars: {},
  anchors: [
    { id: 'app.shell', selector: 'html, body', style: {} },
    { id: 'app.header', selector: 'header', style: {} },
    { id: 'codeblock.body', selector: 'pre', style: {}, optional: true },
    { id: 'overlay.dialog', selector: '[role="dialog"]', style: {}, optional: true },
  ],
};

describe('runHealthCheck', () => {
  it('reports required misses but never optional ones at load', () => {
    // Landing page: shell + header present; no code block, no dialog open.
    const r = runHealthCheck(adapter, fakeDoc(['html, body', 'header']));
    expect(r.resolved).toEqual(['app.shell', 'app.header']);
    expect(r.missing).toEqual([]); // <- the false-positive guard
    expect(r.optionalAbsent).toEqual(['codeblock.body', 'overlay.dialog']);
  });

  it('flags a required anchor that genuinely fails (host changed shape)', () => {
    const r = runHealthCheck(adapter, fakeDoc(['html, body'])); // header gone
    expect(r.missing).toEqual(['app.header']);
  });

  it('never throws on an invalid selector', () => {
    const bad: HostAdapter = {
      ...adapter,
      anchors: [{ id: 'x', selector: ':::nonsense(', style: {} }],
    };
    expect(() => runHealthCheck(bad, fakeDoc([]))).not.toThrow();
    expect(runHealthCheck(bad, fakeDoc([])).missing).toEqual(['x']);
  });

  it('the bundled adapters mark code/dialog/menu surfaces optional', () => {
    for (const host of ['chatgpt', 'claude'] as const) {
      const a = BUNDLED_ADAPTER_MAP.hosts[host];
      const optional = new Set(a.anchors.filter((x) => x.optional).map((x) => x.id));
      expect(optional.has('codeblock.body')).toBe(true);
      expect(optional.has('overlay.dialog')).toBe(true);
      // Core shell anchors must stay required.
      const required = a.anchors.filter((x) => !x.optional).map((x) => x.id);
      expect(required).toContain('app.shell');
    }
  });
});
