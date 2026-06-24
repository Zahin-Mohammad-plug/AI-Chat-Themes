// Post-apply health check — PRD Section 5.4 / EPIC C3.
// Verifies that each expected anchor resolved to at least one element. Misses
// are recorded (structural data only) so a host change degrades to native
// rather than half-themed. This never throws.

import type { HostAdapter } from '@/src/adapters/types';

export interface HealthReport {
  host: string;
  fingerprint: string;
  total: number;
  resolved: string[];
  missing: string[];
}

export function runHealthCheck(adapter: HostAdapter, doc: Document = document): HealthReport {
  const resolved: string[] = [];
  const missing: string[] = [];

  for (const anchor of adapter.anchors) {
    try {
      const found = doc.querySelector(anchor.selector);
      if (found) resolved.push(anchor.id);
      else missing.push(anchor.id);
    } catch {
      // Invalid selector in a (possibly remote) map: treat as missing, never throw.
      missing.push(anchor.id);
    }
  }

  return {
    host: adapter.host,
    fingerprint: adapter.fingerprint,
    total: adapter.anchors.length,
    resolved,
    missing,
  };
}
