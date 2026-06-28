// Opt-in, anonymous structural telemetry — PRD 5.4 / 15 / EPIC C4.
//
// [INVARIANT] Privacy boundary: a telemetry event may contain ONLY structural
// failure data — anchor ids, host id, host fingerprint, extension + map version.
// It must NEVER carry page content, prompts, responses, URLs beyond the host
// id, or any user identity. The builder below is the single place events are
// constructed, and it allowlists fields explicitly so nothing else can leak.

import type { HealthReport } from './health';

/** The complete, exhaustive set of fields a telemetry event may contain. */
export interface TelemetryEvent {
  type: 'anchors_unresolved';
  host: string;
  fingerprint: string;
  missing: string[];
  extVersion: string;
  mapVersion: number;
  ts: number;
}

/** Frozen allowlist — used by tests to assert no field ever escapes it. */
export const TELEMETRY_FIELDS: ReadonlyArray<keyof TelemetryEvent> = Object.freeze([
  'type',
  'host',
  'fingerprint',
  'missing',
  'extVersion',
  'mapVersion',
  'ts',
]);

export interface TelemetryContext {
  extVersion: string;
  mapVersion: number;
  now: number;
}

/**
 * Build a structural telemetry event from a health report, or null when there
 * is nothing to report (all anchors resolved). The output contains ONLY the
 * allowlisted fields — no host URL, no page content, no identity.
 */
export function buildTelemetryEvent(
  report: HealthReport,
  ctx: TelemetryContext,
): TelemetryEvent | null {
  if (!report.missing.length) return null;
  return {
    type: 'anchors_unresolved',
    host: report.host,
    fingerprint: report.fingerprint,
    missing: [...report.missing],
    extVersion: ctx.extVersion,
    mapVersion: ctx.mapVersion,
    ts: ctx.now,
  };
}
