// Bundled texture assets for Tier-2 material themes (PRD 6.2).
// Textures are PROCEDURAL inline SVGs, encoded as data: URIs at module load.
// This keeps them: (a) license-clean (no third-party photos), (b) byte-tiny
// (a few hundred bytes each), (c) MV3-safe (no remote fetch, no web-accessible
// resources, no FOUC asset load), and (d) identical on both hosts (they are
// just a background-image on the app shell). Each texture's base colors match
// its theme's `bg.app`, so the mandatory scrim composites to a readable, on-
// palette surface (PRD 6.2 readability guardrail).

/** Deep, misty pine forest — for the Forest theme. */
const FOREST_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='#0b1a12'/><stop offset='0.5' stop-color='#163a28'/><stop offset='1' stop-color='#0a1710'/>
</linearGradient></defs>
<rect width='1200' height='800' fill='url(#sky)'/>
<ellipse cx='600' cy='400' rx='680' ry='170' fill='#4f8a66' opacity='0.22'/>
<g fill='#0f2a1c' opacity='0.65'>
<polygon points='120,560 175,360 230,560'/><polygon points='320,580 385,330 450,580'/><polygon points='560,560 615,350 670,560'/><polygon points='780,585 850,320 920,585'/><polygon points='1000,565 1060,355 1120,565'/>
</g>
<g fill='#06160e'>
<polygon points='40,640 110,400 180,640'/><polygon points='250,660 330,380 410,660'/><polygon points='470,650 545,390 620,650'/><polygon points='690,665 775,360 860,665'/><polygon points='930,655 1010,395 1090,655'/><polygon points='1120,660 1180,430 1240,660'/>
</g>
<rect y='640' width='1200' height='160' fill='#05130c'/>
</svg>`;

/** Neon cyberpunk skyline — for the Cyberpunk theme. A two-row skyline with a
 *  glowing moon and magenta/cyan horizon so the city reads clearly behind a
 *  light scrim. */
const CYBER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
<defs><linearGradient id='night' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='#0a0612'/><stop offset='0.55' stop-color='#1c0c36'/><stop offset='1' stop-color='#0a0612'/>
</linearGradient><radialGradient id='moon' cx='0.5' cy='0.5' r='0.5'>
<stop offset='0' stop-color='#ffb3e6'/><stop offset='0.45' stop-color='#ff2bd6' stop-opacity='0.5'/><stop offset='1' stop-color='#ff2bd6' stop-opacity='0'/>
</radialGradient></defs>
<rect width='1200' height='800' fill='url(#night)'/>
<circle cx='955' cy='185' r='230' fill='url(#moon)'/>
<circle cx='955' cy='185' r='66' fill='#ffd9f2'/>
<ellipse cx='600' cy='600' rx='780' ry='180' fill='#ff2bd6' opacity='0.22'/>
<ellipse cx='600' cy='650' rx='560' ry='120' fill='#22d3ee' opacity='0.16'/>
<g fill='#180b30'>
<rect x='0' y='500' width='95' height='300'/><rect x='110' y='470' width='80' height='330'/><rect x='205' y='520' width='90' height='280'/><rect x='310' y='455' width='85' height='345'/><rect x='410' y='505' width='95' height='295'/><rect x='520' y='480' width='80' height='320'/><rect x='615' y='515' width='90' height='285'/><rect x='720' y='465' width='85' height='335'/><rect x='820' y='500' width='95' height='300'/><rect x='930' y='475' width='80' height='325'/><rect x='1025' y='515' width='90' height='285'/><rect x='1130' y='485' width='90' height='315'/>
</g>
<g fill='#0a0518'>
<rect x='55' y='420' width='95' height='380'/><rect x='175' y='350' width='75' height='450'/><rect x='275' y='460' width='110' height='340'/><rect x='415' y='300' width='85' height='500'/><rect x='525' y='440' width='95' height='360'/><rect x='645' y='370' width='78' height='430'/><rect x='750' y='285' width='105' height='515'/><rect x='880' y='430' width='90' height='370'/><rect x='995' y='340' width='75' height='460'/><rect x='1095' y='460' width='95' height='340'/>
</g>
<g fill='#ff5de0' opacity='0.9'>
<rect x='78' y='440' width='9' height='9'/><rect x='110' y='480' width='9' height='9'/><rect x='112' y='520' width='9' height='9'/><rect x='200' y='380' width='9' height='9'/><rect x='205' y='430' width='9' height='9'/><rect x='450' y='330' width='9' height='9'/><rect x='455' y='400' width='9' height='9'/><rect x='560' y='470' width='9' height='9'/><rect x='778' y='315' width='9' height='9'/><rect x='785' y='390' width='9' height='9'/><rect x='790' y='460' width='9' height='9'/><rect x='915' y='460' width='9' height='9'/><rect x='1020' y='370' width='9' height='9'/><rect x='1025' y='440' width='9' height='9'/>
</g>
<g fill='#5ef0ff' opacity='0.85'>
<rect x='300' y='490' width='9' height='9'/><rect x='305' y='540' width='9' height='9'/><rect x='540' y='460' width='9' height='9'/><rect x='650' y='400' width='9' height='9'/><rect x='655' y='460' width='9' height='9'/><rect x='885' y='460' width='9' height='9'/><rect x='890' y='520' width='9' height='9'/><rect x='1100' y='490' width='9' height='9'/></g>
<rect y='735' width='1200' height='65' fill='#0a0612'/>
</svg>`;

/** Build a `url("data:image/svg+xml,...")` value from raw SVG markup. */
function svgUrl(svg: string): string {
  // Collapse whitespace to trim bytes, then percent-encode for the data URI.
  const encoded = encodeURIComponent(svg.replace(/\n+/g, ''));
  return `url("data:image/svg+xml,${encoded}")`;
}

/** Bundled texture ids -> CSS background-image url() value. */
export const TEXTURES: Record<string, string> = {
  forest: svgUrl(FOREST_SVG),
  cyber: svgUrl(CYBER_SVG),
};

/**
 * Resolve a `material.texture` id to a CSS `url()` value, or null if unknown.
 * (https URLs from an allowlisted CDN are a later, store-phase concern — PRD
 * 6.2 / 13.3 — and intentionally not resolved here.)
 */
export function resolveTexture(id: string): string | null {
  return TEXTURES[id] ?? null;
}
