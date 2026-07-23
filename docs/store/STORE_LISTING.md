# Chrome Web Store — Submission Pack

Everything needed to fill out the Web Store Developer Dashboard listing for
**AI Chat Themes**. Copy/paste the fields below. Items marked ⚠️ are blockers you
must resolve before the listing will pass review.

## Package

- Upload artifact: `.output/ai-chat-themes-0.1.5-chrome.zip` (run `pnpm zip` to
  regenerate).
- Manifest V3, version `0.1.5`.

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
- `storage`: Persist the user's selected theme, custom themes, and per-site on/off
  settings locally so they survive between sessions.
- Host permission `*://chatgpt.com/*`: Inject theme CSS into the ChatGPT web app.
- Host permission `*://claude.ai/*`: Inject theme CSS into the Claude.ai web app.
- Remote code: **None.** All logic ships in the package; no remotely hosted code.

> This build requests **only** `storage` plus the two host permissions — nothing
> else to justify. (`alarms` was removed: it only powered the periodic remote
> adapter-map refresh, which is dormant in this release. Re-add it alongside the
> CDN host permission if/when remote updates are turned on.)

**Promo tiles (Graphic assets tab)**
- Small promo tile (440×280): `docs/store/promo/small-promo-440x280.jpg`
- Marquee promo tile (1400×560): `docs/store/promo/marquee-promo-1400x560.jpg`
- Both are JPEG (no alpha), per store requirements. Regenerate with
  `node scripts/render-promo.mjs`.

**Data usage disclosures (Privacy practices tab)**
- Does the extension collect user data? **No.**
- Check none of the data-type boxes.
- Certify compliance with the limited-use policy.

**Privacy policy URL**
> ⚠️ Required. Host `docs/store/PRIVACY_POLICY.md` at a public URL and paste it
> here (e.g. enable GitHub Pages, or use the raw GitHub URL). Contact is the
> project issue tracker — no personal email needed.

## ⚠️ Blockers before submission

1. ~~Real icons.~~ **Done.** `public/icon/*.png` are rendered from
   `assets/icon.svg` (a split light/dark chat bubble on a violet tile) via
   `node scripts/render-icons.mjs`. Sizes 16/32/48/96/128 present.
2. ~~Screenshots.~~ **Done (promo set).** Nine 1280×800 promo screenshots in
   `docs/store/screenshots/` — palette themes (dark, dracula, night-owl,
   catppuccin, midnight-oled, paper) plus the expressive showcase (aurora,
   forest, cyberpunk) — rendered from the real theme tokens via
   `node scripts/render-screenshots.mjs`. These are marketing mockups; for the
   strongest listing you can also add real captures of the live themed
   ChatGPT/Claude pages (⌘⇧4). Upload at least one.
3. **Privacy policy URL** — use the public GitHub URL once on `main`:
   `https://github.com/Zahin-Mohammad-plug/AI-Chat-Themes/blob/main/docs/store/PRIVACY_POLICY.md`
   (contact is the issue tracker; no email to fill in). Must be live before submit.
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
- Because permissions are minimal (`storage` + two hosts) and there's no remote
  code or data collection, this should review cleanly once the blockers above are
  handled.
- v0.1.3 ships M1–M3: palette + expressive themes, the live theme editor with
  import/export, and the resilience engine (fingerprinting, self-healing,
  per-host/per-surface kill switch). The hosted store (M4) is deferred. Opt-in
  telemetry is built but disabled (no UI, null endpoint), so the package collects
  nothing.
