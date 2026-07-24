// Theme editor page — PRD Section 12 / EPIC D2+D3+D4.
// Live token editing with a faithful in-editor preview, contrast warnings,
// generate-from-accent, save/duplicate/delete, and import/export. Vanilla TS,
// same as the popup. Reuses the engine's token model — no host class is named.

import { STORE_REVIEW_URL, SUPPORT_URL } from '@/src/config';
import { buildDesignPrompt } from '@/src/themes/ai-prompt';
import { materialImageCss } from '@/src/themes/assets';
import { BUILTIN_BLURBS, DEFAULT_THEME_ID, getBuiltin } from '@/src/themes/builtins';
import { generateFromAccent } from '@/src/themes/generate';
import { exportFilename, exportThemeJson, parseImportedTheme } from '@/src/themes/io';
import { deriveTokens } from '@/src/themes/schema';
import { processImageFile } from '@/src/util/image';
import {
  allThemes,
  deleteCustomTheme,
  getSettings,
  saveCustomTheme,
  type Settings,
} from '@/src/storage';
import {
  SCHEMA_VERSION,
  TOKEN_KEYS,
  type HostId,
  type Theme,
  type ThemeBase,
  type TokenKey,
} from '@/src/themes/types';
import { contrastRatio, toHex, toRgba, WCAG_AA_BODY } from '@/src/util/color';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const genId = (): string => {
  try {
    return (globalThis.crypto as Crypto).randomUUID();
  } catch {
    return 'theme-' + Math.abs(Date.now()).toString(36);
  }
};

const TOKEN_LABELS: Record<TokenKey, string> = {
  'bg.app': 'App background',
  'bg.surface': 'Surface',
  'bg.elevated': 'Elevated',
  'text.primary': 'Text primary',
  'text.secondary': 'Text secondary',
  'text.tertiary': 'Text tertiary',
  accent: 'Accent',
  'accent.text': 'Accent text',
  'border.hairline': 'Border',
  'composer.bg': 'Composer',
  'sidebar.bg': 'Sidebar',
  'code.bg': 'Code background',
};

let settings: Settings;
let draft: Theme;

function blankTheme(base: ThemeBase): Theme {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: genId(),
    name: 'My theme',
    author: 'You',
    appliesTo: ['chatgpt', 'claude'],
    base,
    builtin: false,
    class: 'palette',
    tokens: deriveTokens(base),
  };
}

function loadDraft(theme: Theme): void {
  draft = clone(theme);
  syncForm();
  render();
}

// --- Form <-> draft binding -----------------------------------------------

function buildTokenRows(): void {
  const host = $('token-rows');
  host.innerHTML = '';
  for (const key of TOKEN_KEYS) {
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML =
      `<span class="token-label">${TOKEN_LABELS[key]}</span>` +
      `<input type="color" data-color="${key}" aria-label="${TOKEN_LABELS[key]} swatch" />` +
      `<input type="text" data-text="${key}" aria-label="${TOKEN_LABELS[key]} value" spellcheck="false" />`;
    host.appendChild(row);
    const swatch = row.querySelector<HTMLInputElement>(`[data-color="${key}"]`)!;
    const text = row.querySelector<HTMLInputElement>(`[data-text="${key}"]`)!;
    swatch.addEventListener('input', () => {
      draft.tokens[key] = swatch.value;
      text.value = swatch.value;
      render();
    });
    text.addEventListener('input', () => {
      draft.tokens[key] = text.value.trim();
      const hex = toHex(text.value.trim());
      if (hex) swatch.value = hex;
      render();
    });
  }
}

function syncForm(): void {
  $<HTMLInputElement>('name-input').value = draft.name;
  $<HTMLSelectElement>('base-select').value = draft.base;
  $<HTMLInputElement>('applies-chatgpt').checked = draft.appliesTo.includes('chatgpt');
  $<HTMLInputElement>('applies-claude').checked = draft.appliesTo.includes('claude');
  for (const key of TOKEN_KEYS) {
    const swatch = document.querySelector<HTMLInputElement>(`[data-color="${key}"]`);
    const text = document.querySelector<HTMLInputElement>(`[data-text="${key}"]`);
    if (text) text.value = draft.tokens[key];
    if (swatch) swatch.value = toHex(draft.tokens[key]) ?? '#000000';
  }
  $<HTMLInputElement>('font-family').value = draft.typography?.fontFamily ?? '';
  $<HTMLInputElement>('code-font').value = draft.typography?.codeFontFamily ?? '';
  $<HTMLInputElement>('line-height').value = String(draft.typography?.lineHeight ?? '');
  $<HTMLInputElement>('font-scale').value = String(draft.typography?.fontScale ?? '');
  $<HTMLInputElement>('app-gradient').value = draft.effects?.appGradient ?? '';
  $('builtin-note').classList.toggle('hidden', !draft.builtin);
  $<HTMLButtonElement>('delete-btn').disabled = !!draft.builtin;
  syncBgControls();
}

function readTypography(): void {
  const fontFamily = $<HTMLInputElement>('font-family').value.trim();
  const codeFontFamily = $<HTMLInputElement>('code-font').value.trim();
  const lineHeight = parseFloat($<HTMLInputElement>('line-height').value);
  const fontScale = parseFloat($<HTMLInputElement>('font-scale').value);
  const typo: NonNullable<Theme['typography']> = {};
  if (fontFamily) typo.fontFamily = fontFamily;
  if (codeFontFamily) typo.codeFontFamily = codeFontFamily;
  if (lineHeight >= 1 && lineHeight <= 2.2) typo.lineHeight = lineHeight;
  if (fontScale >= 0.8 && fontScale <= 1.4) typo.fontScale = fontScale;
  draft.typography = Object.keys(typo).length ? typo : undefined;
}

function bindControls(): void {
  $<HTMLInputElement>('name-input').addEventListener('input', (e) => {
    draft.name = (e.target as HTMLInputElement).value;
  });
  $<HTMLSelectElement>('base-select').addEventListener('change', (e) => {
    draft.base = (e.target as HTMLSelectElement).value as ThemeBase;
    render();
  });
  const applies = (): void => {
    const list: HostId[] = [];
    if ($<HTMLInputElement>('applies-chatgpt').checked) list.push('chatgpt');
    if ($<HTMLInputElement>('applies-claude').checked) list.push('claude');
    draft.appliesTo = list.length ? list : ['chatgpt', 'claude'];
  };
  $('applies-chatgpt').addEventListener('change', applies);
  $('applies-claude').addEventListener('change', applies);

  for (const id of ['font-family', 'code-font', 'line-height', 'font-scale']) {
    $(id).addEventListener('input', () => {
      readTypography();
      render();
    });
  }
  $<HTMLInputElement>('app-gradient').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value.trim();
    const safe = v && !/url\(|@import|javascript:|expression\(/i.test(v);
    draft.effects = safe ? { ...draft.effects, appGradient: v } : undefined;
    render();
  });

  $('generate-btn').addEventListener('click', () => {
    const seed = $<HTMLInputElement>('seed-input').value;
    draft.tokens = generateFromAccent(seed, draft.base);
    draft.tokens.accent = seed;
    syncForm();
    render();
    status('Generated a palette from the accent.');
  });

  $('new-btn').addEventListener('click', () => {
    loadDraft(blankTheme($<HTMLSelectElement>('base-select').value as ThemeBase));
    status('New theme.');
  });
  $('save-btn').addEventListener('click', onSave);
  $('dup-btn').addEventListener('click', onDuplicate);
  $('delete-btn').addEventListener('click', onDelete);
  $('export-btn').addEventListener('click', onExport);
  $('import-btn').addEventListener('click', () => $('import-input').click());
  $<HTMLInputElement>('import-input').addEventListener('change', onImport);

  $<HTMLSelectElement>('theme-select').addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    const theme = findAny(id);
    if (theme) loadDraft(theme);
  });

  // --- Create with AI (modal wizard) ---
  $('ai-open').addEventListener('click', openAiModal);
  $('ai-close').addEventListener('click', closeAiModal);
  $('ai-modal').addEventListener('click', (e) => {
    if (e.target === $('ai-modal')) closeAiModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('ai-modal').classList.contains('hidden')) closeAiModal();
  });
  // Step 1: picking a mode advances immediately.
  $('ai-mode-edit').addEventListener('click', () => chooseMode('edit'));
  $('ai-mode-create').addEventListener('click', () => chooseMode('create'));
  // Step 2: idea chips fill the description.
  document.querySelectorAll<HTMLButtonElement>('#ai-chips .chip').forEach((c) => {
    c.addEventListener('click', () => addChip(c.dataset.chip ?? ''));
  });
  $('ai-copy').addEventListener('click', onCopyPrompt);
  $('ai-open-claude').addEventListener('click', () => openHost('claude'));
  $('ai-open-chatgpt').addEventListener('click', () => openHost('chatgpt'));
  $<HTMLTextAreaElement>('ai-paste').addEventListener('input', onPasteInput);
  // Step 4: optional background image (reuses the same pipeline as the editor).
  $('ai-img-btn').addEventListener('click', () => $('ai-img-file').click());
  $<HTMLInputElement>('ai-img-file').addEventListener('change', onAiImgUpload);
  $('ai-img-remove').addEventListener('click', onAiImgRemove);
  $('ai-back').addEventListener('click', () => gotoStep(aiStep - 1));
  $('ai-next').addEventListener('click', onNext);

  // --- Background image ---
  $('bg-upload-btn').addEventListener('click', () => $('bg-file').click());
  $<HTMLInputElement>('bg-file').addEventListener('change', onBgUpload);
  $('bg-remove-btn').addEventListener('click', onBgRemove);
  $<HTMLInputElement>('bg-scrim').addEventListener('input', onBgScrim);

  // --- Footer links ---
  $<HTMLAnchorElement>('rate-link').href = STORE_REVIEW_URL;
  $<HTMLAnchorElement>('support-link').href = SUPPORT_URL;
}

// --- Create with AI (modal wizard) -----------------------------------------

let aiStep = 1;
let aiMode: 'edit' | 'create' = 'edit';
let aiPrompt = '';
let aiPendingTheme: Theme | null = null;
let aiPendingImage: string | undefined;

function openAiModal(): void {
  $<HTMLTextAreaElement>('ai-describe').value = '';
  $<HTMLTextAreaElement>('ai-paste').value = '';
  $('ai-current-name').textContent = draft.name || 'Untitled';
  $('ai-detect').textContent = '';
  aiPendingTheme = null;
  aiPendingImage = undefined;
  syncAiImg();
  aiMode = 'edit';
  gotoStep(1);
  $('ai-modal').classList.remove('hidden');
}

function closeAiModal(): void {
  $('ai-modal').classList.add('hidden');
}

/** Step 1: choosing a mode selects it AND advances (no separate Next). */
function chooseMode(mode: 'edit' | 'create'): void {
  aiMode = mode;
  $('ai-describe-h').textContent = mode === 'create' ? 'Describe your theme' : 'Describe the changes';
  gotoStep(2);
}

function addChip(text: string): void {
  if (!text) return;
  const ta = $<HTMLTextAreaElement>('ai-describe');
  ta.value = ta.value.trim() ? `${ta.value.trim()}, ${text}` : text;
  ta.focus();
}

function gotoStep(n: number): void {
  aiStep = Math.max(1, Math.min(4, n));
  document
    .querySelectorAll<HTMLElement>('#ai-modal .step')
    .forEach((el) => el.classList.toggle('active', el.dataset.step === String(aiStep)));
  $('ai-progress').style.width = `${(aiStep / 4) * 100}%`;
  // Step 1 advances by clicking a card — hide the footer nav there.
  $('ai-foot').classList.toggle('hidden', aiStep === 1);
  $('ai-back').classList.toggle('hidden', aiStep <= 1);
  const next = $<HTMLButtonElement>('ai-next');
  if (aiStep === 4) {
    next.textContent = 'Apply theme';
    next.disabled = !aiPendingTheme;
  } else {
    next.textContent = 'Next →';
    next.disabled = false;
  }
  if (aiStep === 3) preparePrompt();
  if (aiStep === 2) $<HTMLTextAreaElement>('ai-describe').focus();
}

function onNext(): void {
  if (aiStep < 4) {
    gotoStep(aiStep + 1);
    return;
  }
  applyAiResult();
}

function preparePrompt(): void {
  const description = $<HTMLTextAreaElement>('ai-describe').value;
  aiPrompt = buildDesignPrompt({ theme: toSavable(), description, mode: aiMode });
  const copy = $('ai-copy');
  copy.textContent = 'Copy prompt';
  copy.classList.remove('copied');
  const out = $<HTMLTextAreaElement>('ai-prompt-out');
  out.value = aiPrompt;
  out.classList.add('hidden');
}

async function onCopyPrompt(): Promise<void> {
  const copy = $('ai-copy');
  try {
    await navigator.clipboard.writeText(aiPrompt);
    copy.textContent = 'Copied ✓';
    copy.classList.add('copied');
  } catch {
    // Clipboard blocked → reveal the (editable) prompt so the user can copy it.
    const ta = $<HTMLTextAreaElement>('ai-prompt-out');
    ta.classList.remove('hidden');
    ta.focus();
    ta.select();
    copy.textContent = 'Select the text below to copy';
  }
}

function openHost(which: 'claude' | 'chatgpt'): void {
  const url = which === 'claude' ? 'https://claude.ai/new' : 'https://chatgpt.com/';
  void chrome.tabs.create({ url });
}

/** Pull a single JSON object out of an AI reply (a fenced ```json block or raw). */
function extractJson(text: string): string | null {
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  if (fences.length > 1) return null; // ambiguous — multiple blocks
  const body = (fences[0]?.[1] ?? text).trim();
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  return body.slice(first, last + 1);
}

/** Lenient parse for pasted AI output: extract one object, fix trailing commas,
 *  then run the real normalizer. */
function lenientParseTheme(raw: string): { theme: Theme | null; warnings: string[]; error?: string } {
  const json = extractJson(raw);
  if (!json) return { theme: null, warnings: [], error: 'Paste one ```json block (a single theme object).' };
  const fixed = json.replace(/,(\s*[}\]])/g, '$1'); // basic correction: trailing commas
  const { theme, result } = parseImportedTheme(fixed);
  if (!theme) return { theme: null, warnings: [], error: result.errors.join('; ') || 'Not a valid theme.' };
  return { theme, warnings: result.warnings };
}

function onPasteInput(): void {
  const raw = $<HTMLTextAreaElement>('ai-paste').value.trim();
  const detect = $('ai-detect');
  aiPendingTheme = null;
  if (!raw) {
    detect.className = 'detect';
    detect.textContent = '';
  } else {
    const parsed = lenientParseTheme(raw);
    if (!parsed.theme) {
      detect.className = 'detect bad';
      detect.textContent = parsed.error ?? 'Couldn’t read a theme from that text.';
    } else {
      aiPendingTheme = parsed.theme;
      detect.className = 'detect ok';
      const warn = parsed.warnings.length ? ` — ${parsed.warnings.length} note(s)` : '';
      detect.textContent = `Detected theme: “${parsed.theme.name}” ✓${warn}`;
    }
  }
  if (aiStep === 4) $<HTMLButtonElement>('ai-next').disabled = !aiPendingTheme;
}

function applyAiResult(): void {
  if (!aiPendingTheme) return;
  const theme = aiPendingTheme;
  // Attach a background image: one uploaded in this wizard (step 4) wins; else
  // keep the current draft's existing image (the AI can't author one). It still
  // passes sanitizeMaterial on save (data URI validated + scrim floor + budget).
  const image = aiPendingImage ?? draft.material?.image;
  if (image && !theme.material?.image) {
    const scrim = theme.material?.scrimOpacity ?? draft.material?.scrimOpacity ?? 0.82;
    theme.material = {
      ...(theme.material ?? {}),
      image,
      appliesToSurfaces: ['bg.app'],
      scrimOpacity: Math.max(0.65, scrim),
      size: 'cover',
    };
  }
  // Never let an AI result shadow a built-in id.
  if (getBuiltin(theme.id)) theme.id = genId();
  loadDraft(theme);
  closeAiModal();
  status('Loaded from AI — review the preview + contrast, then Save.');
}

function syncAiImg(): void {
  const has = !!aiPendingImage;
  $('ai-img-remove').classList.toggle('hidden', !has);
  const thumb = $('ai-img-thumb');
  thumb.classList.toggle('hidden', !has);
  if (has) thumb.style.backgroundImage = `url("${aiPendingImage}")`;
  $('ai-img-btn').textContent = has ? 'Replace image' : '＋ Add background image';
}

async function onAiImgUpload(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const btn = $('ai-img-btn');
  const label = btn.textContent;
  btn.textContent = 'Processing…';
  try {
    const img = await processImageFile(file);
    aiPendingImage = img.dataUrl;
    syncAiImg();
  } catch (err) {
    btn.textContent = label;
    const d = $('ai-detect');
    d.className = 'detect bad';
    d.textContent = (err as Error).message;
  }
}

function onAiImgRemove(): void {
  aiPendingImage = undefined;
  syncAiImg();
}

// --- Background image ------------------------------------------------------

function syncBgControls(): void {
  const hasImg = !!draft.material?.image;
  $('bg-remove-btn').classList.toggle('hidden', !hasImg);
  const thumb = $('bg-thumb');
  thumb.classList.toggle('hidden', !hasImg);
  if (hasImg) thumb.style.backgroundImage = `url("${draft.material!.image}")`;
  ($('bg-scrim-field') as HTMLElement).hidden = !hasImg;
  if (hasImg) {
    const s = draft.material!.scrimOpacity;
    $<HTMLInputElement>('bg-scrim').value = String(s);
    $('bg-scrim-val').textContent = s.toFixed(2);
  }
}

async function onBgUpload(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  status('Processing image…');
  try {
    const img = await processImageFile(file);
    const prev = draft.material?.scrimOpacity;
    const scrim = typeof prev === 'number' && prev >= 0.65 ? prev : 0.82;
    draft.material = {
      ...(draft.material ?? {}),
      image: img.dataUrl,
      appliesToSurfaces: ['bg.app'],
      scrimOpacity: scrim,
      size: 'cover',
    };
    syncBgControls();
    render();
    status(`Background image added (${Math.round(img.bytes / 1024)} KB).`);
  } catch (err) {
    status((err as Error).message);
  }
}

function onBgRemove(): void {
  if (draft.material) {
    delete draft.material.image;
    if (!draft.material.texture) draft.material = undefined;
  }
  syncBgControls();
  render();
  status('Background image removed.');
}

function onBgScrim(e: Event): void {
  if (!draft.material) return;
  draft.material.scrimOpacity = parseFloat((e.target as HTMLInputElement).value);
  $('bg-scrim-val').textContent = draft.material.scrimOpacity.toFixed(2);
  render();
}

// --- Actions ---------------------------------------------------------------

function toSavable(): Theme {
  const hasExpr = !!(draft.effects?.appGradient || draft.material);
  return {
    ...clone(draft),
    schemaVersion: SCHEMA_VERSION,
    builtin: false,
    class: hasExpr ? 'expressive' : 'palette',
  };
}

async function onSave(): Promise<void> {
  const theme = toSavable();
  // Editing a built-in (or a draft with no custom id yet) saves a fresh copy.
  if (draft.builtin) theme.id = genId();
  try {
    settings = await saveCustomTheme(theme);
  } catch (err) {
    status((err as Error).message);
    return;
  }
  draft = theme;
  populateSelect(theme.id);
  syncForm();
  const c = contrast();
  status(c.pass ? 'Saved ✓' : 'Saved ✓ — note: body contrast is below WCAG AA.');
}

async function onDuplicate(): Promise<void> {
  const copy = toSavable();
  copy.id = genId();
  copy.name = `${draft.name} (copy)`;
  try {
    settings = await saveCustomTheme(copy);
  } catch (err) {
    status((err as Error).message);
    return;
  }
  draft = copy;
  populateSelect(copy.id);
  syncForm();
  status('Duplicated.');
}

async function onDelete(): Promise<void> {
  if (draft.builtin) return;
  settings = await deleteCustomTheme(draft.id);
  populateSelect(DEFAULT_THEME_ID);
  loadDraft(getBuiltin(DEFAULT_THEME_ID)!);
  status('Deleted.');
}

function onExport(): void {
  const theme = toSavable();
  const blob = new Blob([exportThemeJson(theme)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(theme);
  a.click();
  URL.revokeObjectURL(url);
  status('Exported theme JSON.');
}

function onImport(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const { theme, result } = parseImportedTheme(String(reader.result));
    if (!theme) {
      status(`Import failed: ${result.errors.join('; ')}`);
      return;
    }
    loadDraft(theme);
    status(
      result.warnings.length
        ? `Imported with warnings: ${result.warnings.join('; ')}`
        : 'Imported ✓ — review and Save to keep it.',
    );
  };
  reader.onerror = () => status('Import failed: could not read file.');
  reader.readAsText(file);
  input.value = '';
}

// --- Live preview + contrast ----------------------------------------------

function appBackground(t: Theme): string {
  const layers: string[] = [];
  const tex = t.material ? materialImageCss(t.material) : null;
  if (tex) {
    // Mirror the engine's scrim: a solid wash of bg.app at the configured opacity.
    const scrim = toRgba(t.tokens['bg.app'], t.material!.scrimOpacity ?? 0.82) ?? t.tokens['bg.app'];
    layers.push(`linear-gradient(${scrim}, ${scrim}), ${tex}`);
  }
  if (t.effects?.appGradient) layers.push(t.effects.appGradient);
  return layers.length
    ? `${t.tokens['bg.app']}; background-image:${layers.join(',')}; background-size:cover; background-position:center`
    : t.tokens['bg.app'];
}

function render(): void {
  const t = draft;
  const tok = t.tokens;
  const set = (sel: string, prop: string, val: string): void => {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => el.style.setProperty(prop, val));
  };
  const pv = $('preview');
  pv.setAttribute('style', `background:${appBackground(t)}`);
  pv.style.color = tok['text.primary'];

  set('.pv-side', 'background', tok['sidebar.bg']);
  set('.pv-side', 'border-color', tok['border.hairline']);
  set('.pv-new', 'background', tok.accent);
  set('.pv-new', 'color', tok['accent.text']);
  set('.pv-item', 'color', tok['text.secondary']);
  set('.pv-active', 'background', tok['bg.elevated']);
  set('.pv-active', 'color', tok['text.primary']);

  const glow = t.effects?.accentGlow ? `;text-shadow:${t.effects.accentGlow}` : '';
  $('preview').querySelector<HTMLElement>('.pv-h1')!.setAttribute(
    'style',
    `color:${tok['text.primary']}${glow}`,
  );
  set('.pv-bubble', 'background', tok['bg.surface']);
  set('.pv-bubble', 'color', tok['text.primary']);
  set('.pv-bubble', 'border-color', tok['border.hairline']);
  set('.pv-ub', 'background', tok['bg.elevated']);
  set('.pv-code', 'background', tok['code.bg']);
  set('.pv-link', 'color', tok.accent);
  set('.pv-composer', 'background', tok['composer.bg']);
  set('.pv-composer', 'border-color', tok['border.hairline']);
  set('.pv-ph', 'color', tok['text.secondary']);
  set('.pv-send', 'background', tok.accent);

  if (t.typography?.fontFamily) set('.pv-main', 'font-family', t.typography.fontFamily);

  renderContrast();
}

function contrast(): { pass: boolean; surface: number; app: number } {
  const surface = contrastRatio(draft.tokens['text.primary'], draft.tokens['bg.surface']);
  const app = contrastRatio(draft.tokens['text.primary'], draft.tokens['bg.app']);
  return { pass: surface >= WCAG_AA_BODY && app >= WCAG_AA_BODY, surface, app };
}

function renderContrast(): void {
  const c = contrast();
  const badge = (label: string, ratio: number): string => {
    const ok = ratio >= WCAG_AA_BODY;
    return `<div class="cbadge ${ok ? 'ok' : 'bad'}">${label}: ${ratio.toFixed(2)}:1 ${ok ? '✓ AA' : '✗ below AA'}</div>`;
  };
  $('contrast').innerHTML =
    badge('Text on surface', c.surface) + badge('Text on app', c.app);
}

// --- Theme list + boot -----------------------------------------------------

function findAny(id: string): Theme | undefined {
  return allThemes(settings).find((t) => t.id === id);
}

function populateSelect(selectedId: string): void {
  const sel = $<HTMLSelectElement>('theme-select');
  const themes = allThemes(settings);
  sel.innerHTML = '';
  const group = (label: string, list: Theme[]): void => {
    if (!list.length) return;
    const og = document.createElement('optgroup');
    og.label = label;
    for (const t of list) {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.name + (BUILTIN_BLURBS[t.id] ? '' : t.builtin ? '' : ' (custom)');
      if (t.id === selectedId) o.selected = true;
      og.appendChild(o);
    }
    sel.appendChild(og);
  };
  group('Built-in', themes.filter((t) => t.builtin));
  group('Custom', themes.filter((t) => !t.builtin));
}

async function init(): Promise<void> {
  settings = await getSettings();
  buildTokenRows();
  bindControls();

  // Optional ?theme=<id> deep-link from the popup.
  const params = new URLSearchParams(location.search);
  const wanted = params.get('theme');
  const start = (wanted && findAny(wanted)) || getBuiltin(DEFAULT_THEME_ID)!;
  populateSelect(start.id);
  loadDraft(start);

  // ?ai=1 deep-link → open the Create-with-AI modal straight away.
  if (params.get('ai') === '1') openAiModal();
}

function status(msg: string): void {
  $('status').textContent = msg;
}

init().catch((err) => {
  console.error('[AI Chat Themes] editor init failed', err);
  status('Editor failed to load.');
});
