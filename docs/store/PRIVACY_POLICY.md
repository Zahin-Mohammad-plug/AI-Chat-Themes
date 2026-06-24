# Privacy Policy — AI Chat Themes

_Last updated: 2026-06-23_

AI Chat Themes ("the extension") is a browser extension that applies visual
themes to the ChatGPT (`chatgpt.com`) and Claude.ai (`claude.ai`) web apps. This
policy explains exactly what the extension does and does not do with data.

## Summary

**The extension does not collect, store, transmit, or sell any personal data.**
Everything it stores stays on your device.

## What the extension accesses

- **Host page access (`chatgpt.com`, `claude.ai`).** The extension runs a content
  script on these two sites only in order to apply CSS theming. It does **not**
  read, record, or transmit your prompts, the assistant's responses, conversation
  content, page text, account details, or any other on-page information.
- **Local storage (`storage` permission).** Your theme choices and per-site
  on/off settings are saved locally via `chrome.storage.local` so they persist
  between sessions. This data never leaves your browser.

## What the extension does NOT do

- No analytics, tracking, or telemetry. (A future version may add **opt-in,
  anonymous** structural error reporting; it will be off by default and will
  never include page content, prompts, responses, URLs beyond the host origin,
  or any identifier. This policy will be updated before any such feature ships.)
- No remote code execution. All logic ships inside the extension package, per
  Chrome Web Store policy.
- No selling or sharing of data with third parties — there is no data to share.
- No access to any site other than `chatgpt.com` and `claude.ai`.

## Permissions justification

- `storage` — to save your selected themes and per-site toggles locally.
- Host access to `chatgpt.com` and `claude.ai` — to inject theme styles on those
  two apps. No broad `<all_urls>` access is requested.

## Affiliation

This extension is an independent project and is **not affiliated with, endorsed
by, or sponsored by OpenAI or Anthropic.** "ChatGPT" and "Claude" are the
property of their respective owners.

## Contact

Questions about this policy: `[your-contact-email]`

## Changes

If this policy changes, the "Last updated" date above will change and the new
version will be published at the same URL before the change takes effect.
