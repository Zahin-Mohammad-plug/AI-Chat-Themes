import { defineConfig } from 'wxt';

// WXT config — https://wxt.dev/api/config.html
// The product name is the single source of truth from docs/PRD.md.
export default defineConfig({
  srcDir: '.',
  modulesDir: 'wxt-modules',
  manifest: {
    name: 'AI Chat Themes: Custom Themes & Dark Mode for ChatGPT and Claude',
    short_name: 'AI Chat Themes',
    description:
      'Apply resilient, token-first themes (dark, light, AMOLED & more) to ChatGPT and Claude.ai. Not affiliated with OpenAI or Anthropic.',
    // [INVARIANT] Minimum permissions: storage + alarms (periodic adapter-map
    // refresh), and host access to the two hosts only. No <all_urls>.
    // NOTE: enabling REMOTE_MAP_URL / TELEMETRY_URL (src/config.ts) also requires
    // adding that origin to host_permissions for the background fetch.
    permissions: ['storage', 'alarms'],
    host_permissions: ['*://chatgpt.com/*', '*://claude.ai/*'],
    action: {
      default_title: 'AI Chat Themes',
    },
    browser_specific_settings: {
      gecko: {
        // Stable, neutral add-on id (not tied to any personal domain).
        id: '{52996274-0ce1-45ec-9b10-958634ef1b2f}',
      },
    },
  },
});
