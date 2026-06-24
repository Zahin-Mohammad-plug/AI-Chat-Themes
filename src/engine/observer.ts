// Dynamic-surface observer — PRD EPIC B4.
// [INVARIANT] Debounced and scoped. SPA route changes and newly mounted
// surfaces (code blocks, panels) re-trigger a single re-apply. No full-document
// re-scan on every mutation; no leak across navigations (returns a disposer).

export interface ObserverHandle {
  disconnect: () => void;
}

const DEBOUNCE_MS = 150;

/**
 * Watch for DOM growth (route changes, new surfaces) and call `reapply`,
 * debounced. We only react to childList additions, and coalesce bursts so long
 * streaming responses can't thrash the engine.
 */
export function startObserver(reapply: () => void, doc: Document = document): ObserverHandle {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (): void => {
    if (timer) return; // already scheduled within this window
    timer = setTimeout(() => {
      timer = null;
      try {
        reapply();
      } catch {
        /* engine must never throw out of the observer */
      }
    }, DEBOUNCE_MS);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        schedule();
        return;
      }
    }
  });

  const target = doc.body ?? doc.documentElement;
  observer.observe(target, { childList: true, subtree: true });

  return {
    disconnect: () => {
      observer.disconnect();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
