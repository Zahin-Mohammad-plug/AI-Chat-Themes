# Chrome Web Store — Submission Pack

Everything needed to fill out the Web Store Developer Dashboard listing for
**AI Chat Themes**. Copy/paste the fields below. Items marked ⚠️ are blockers you
must resolve before the listing will pass review.

## Package

- Upload artifact: `.output/ai-chat-themes-0.1.0-chrome.zip` (run `pnpm zip` to
  regenerate).
- Manifest V3, version `0.1.0`.

## Listing fields

**Name**
> AI Chat Themes: Custom Themes & Dark Mode for ChatGPT and Claude

**Summary (≤132 chars)**
> Dark, light, AMOLED & 12 designer themes for ChatGPT and Claude.ai. Resilient, token-first, private. Not affiliated with OpenAI/Anthropic.

**Category**
> Functionality & UI  (alternatively: Workflow & Planning)

**Language**
> English

**Description**
> Theme ChatGPT and Claude.ai the way you want — one extension, both apps.
>
> AI Chat Themes applies clean, readable color themes to chatgpt.com and
> claude.ai: a balanced Dark, a crisp Light, true-black AMOLED for OLED screens,
> plus instantly recognizable palettes — Dracula, One Dark Pro, Night Owl,
> Synthwave '84, Material Ocean, Catppuccin Mocha, GitHub Dark, Cobalt2, and
> Ayu Mirage.
>
> • One-click theme switching from the toolbar popup, applied instantly with no
>   reload.
> • Independent per-site control — theme ChatGPT and Claude separately, or turn
>   either off.
> • No flash on load: themes paint before the page appears.
> • Built for resilience: themes target each app's design tokens first, so they
>   keep working across routine site updates, and safely fall back to the native
>   look if a surface ever can't be themed.
> • Privacy-first: no prompts, responses, page content, or personal data are ever
>   collected. Settings stay on your device.
>
> Not affiliated with OpenAI or Anthropic.

**Single purpose (required field)**
> Apply user-selected visual themes (colors, dark mode) to the ChatGPT and
> Claude.ai web interfaces.

**Permission justifications (required)**
- `storage`: Persist the user's selected theme and per-site on/off settings
  locally so they survive between sessions.
- Host permission `*://chatgpt.com/*`: Inject theme CSS into the ChatGPT web app.
- Host permission `*://claude.ai/*`: Inject theme CSS into the Claude.ai web app.
- Remote code: **None.** All logic ships in the package; no remotely hosted code.

**Data usage disclosures (Privacy practices tab)**
- Does the extension collect user data? **No.**
- Check none of the data-type boxes.
- Certify compliance with the limited-use policy.

**Privacy policy URL**
> ⚠️ Required. Host `docs/store/PRIVACY_POLICY.md` at a public URL and paste it
> here (e.g. enable GitHub Pages, or use the raw GitHub URL). Fill in the contact
> email in that file first.

## ⚠️ Blockers before submission

1. ~~Real icons.~~ **Done.** `public/icon/*.png` are rendered from
   `assets/icon.svg` (a split light/dark chat bubble on a violet tile) via
   `node scripts/render-icons.mjs`. Sizes 16/32/48/96/128 present.
2. **Screenshots.** The store requires at least one 1280×800 (or 640×400)
   screenshot. Capture the popup + a themed ChatGPT and Claude page. (Optional
   but recommended: a 440×280 small promo tile.)
3. **Privacy policy URL** must be live (see above).
4. **Developer account.** A one-time US$5 registration is required before you can
   publish. See "What only you can do" below.

## What only you can do (I can't, and shouldn't)

These steps require your account, your payment, and your acceptance of legal
terms — I can prepare materials but cannot perform them:

1. Register a Chrome Web Store developer account and pay the one-time $5 fee at
   <https://chrome.google.com/webstore/devconsole>.
2. Accept the developer agreement / program policies.
3. Create a new item, upload the zip, and paste the fields above.
4. Add icons, screenshots, and the privacy-policy URL.
5. Complete the privacy practices tab.
6. Submit for review / click Publish (public, and subject to Google's review).

## Notes

- Review typically takes anywhere from hours to a few days for a new MV3 item.
- Because permissions are minimal and there's no remote code or data collection,
  this should review cleanly once the blockers above are handled.
- This is the M0/M1 slice. The live theme editor, import/export, and remote
  resilience pipeline (M2/M3) are not yet included — fine to ship as v0.1.0, just
  set expectations in the listing if you like.
