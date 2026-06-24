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
    // [INVARIANT] Minimum host permissions: the two hosts + storage. No <all_urls>.
    permissions: ['storage'],
    host_permissions: ['*://chatgpt.com/*', '*://claude.ai/*'],
    action: {
      default_title: 'AI Chat Themes',
    },
    browser_specific_settings: {
      gecko: {
        id: 'ai-chat-themes@zahin.dev',
      },
    },
  },
});
