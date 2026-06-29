// Post-apply health check — PRD Section 5.4 / EPIC C3.
// Verifies that each expected anchor resolved to at least one element. Misses on
// REQUIRED anchors mean the host changed shape — recorded (structural data only)
// so theming degrades to native rather than half-themed. Misses on OPTIONAL
// anchors (on-demand surfaces like code blocks or dialogs not present at load)
// are tracked separately and never count as failures. This never throws.

import type { HostAdapter } from '@/src/adapters/types';

export interface HealthReport {
  host: string;
  fingerprint: string;
  total: number;
  resolved: string[];
  /** Required anchors that failed to resolve — the actionable failure signal. */
  missing: string[];
  /** Optional/on-demand anchors absent at check time — informational only. */
  optionalAbsent: string[];
}

export function runHealthCheck(adapter: HostAdapter, doc: Document = document): HealthReport {
  const resolved: string[] = [];
  const missing: string[] = [];
  const optionalAbsent: string[] = [];

  for (const anchor of adapter.anchors) {
    let found = false;
    try {
      found = doc.querySelector(anchor.selector) !== null;
    } catch {
      // Invalid selector in a (possibly remote) map: treat as unresolved, never throw.
      found = false;
    }
    if (found) resolved.push(anchor.id);
    else if (anchor.optional) optionalAbsent.push(anchor.id);
    else missing.push(anchor.id);
  }

  return {
    host: adapter.host,
    fingerprint: adapter.fingerprint,
    total: adapter.anchors.length,
    resolved,
    missing,
    optionalAbsent,
  };
}
