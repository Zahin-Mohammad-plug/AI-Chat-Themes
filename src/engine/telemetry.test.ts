// Tests for opt-in structural telemetry (PRD 5.4 / 15 / C4).
import { describe, expect, it } from 'vitest';
import { buildTelemetryEvent, TELEMETRY_FIELDS } from './telemetry';
import type { HealthReport } from './health';

const report = (missing: string[]): HealthReport => ({
  host: 'chatgpt',
  fingerprint: 'chatgpt-2024-tokens',
  total: 5,
  resolved: ['app.shell'],
  missing,
});

const ctx = { extVersion: '0.1.2', mapVersion: 1, now: 1700000000000 };

describe('buildTelemetryEvent', () => {
  it('returns null when nothing failed (all anchors resolved)', () => {
    expect(buildTelemetryEvent(report([]), ctx)).toBeNull();
  });

  it('reports only the allowlisted structural fields', () => {
    const event = buildTelemetryEvent(report(['composer.input', 'codeblock.body']), ctx)!;
    expect(event).not.toBeNull();
    // Every key must be in the frozen allowlist — nothing else can leak.
    for (const key of Object.keys(event)) {
      expect(TELEMETRY_FIELDS).toContain(key as keyof typeof event);
    }
    // Explicitly assert no content/identity/url-bearing fields exist.
    for (const banned of ['url', 'href', 'content', 'prompt', 'response', 'userId', 'title']) {
      expect(banned in event).toBe(false);
    }
    expect(event.missing).toEqual(['composer.input', 'codeblock.body']);
    expect(event.host).toBe('chatgpt');
    expect(event.extVersion).toBe('0.1.2');
  });

  it('copies the missing array (no shared reference into the report)', () => {
    const r = report(['x']);
    const event = buildTelemetryEvent(r, ctx)!;
    event.missing.push('y');
    expect(r.missing).toEqual(['x']);
  });
});
