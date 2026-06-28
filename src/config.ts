// M3 resilience configuration (PRD 5.3 / 5.4).
//
// Both endpoints are NULL by default: the full client pipeline ships, is unit-
// tested, and degrades to the bundled snapshot — but no network traffic happens
// until you point these at a real CDN/collector. This keeps the extension
// self-contained for Chrome Web Store review (no remote code, nothing fetched
// out of the box) while leaving a one-line switch to activate updates.
//
// [INVARIANT] Only ever fetch JSON/CSS data here — never anything interpreted as
// logic. All executing code ships inside the package (MV3 remote-code ban).

/**
 * URL of the versioned, integrity-validated remote adapter map (JSON).
 * Set to e.g. a GitHub raw URL or CDN path to enable hot adapter updates.
 */
export const REMOTE_MAP_URL: string | null = null;

/**
 * Collector endpoint for opt-in, anonymous structural telemetry (PRD 5.4).
 * Set to your collector URL to enable. Even when set, telemetry only sends if
 * the user has explicitly opted in, and the payload is structurally limited.
 */
export const TELEMETRY_URL: string | null = null;

/** How often the background worker refreshes the remote map. */
export const MAP_REFRESH_MINUTES = 720; // 12h

/** chrome.storage.local key for the cached remote adapter map. */
export const ADAPTER_MAP_CACHE_KEY = 'act:adapterMap';

/** chrome.runtime message type for relaying a telemetry event to the worker. */
export const TELEMETRY_MSG = 'act:telemetry';
