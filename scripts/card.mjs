/**
 * Renders the Engineering Activity card as a standalone SVG.
 *
 * Form: a KPI row of stat tiles. Three headline numbers are not a chart --
 * a one-bar bar chart per metric would say less and occupy more.
 *
 * Constraints this file is written against:
 *  - GitHub renders README images through its image pipeline, so `<a>` inside
 *    the SVG is inert and no webfont will load. Hence: no links here (the
 *    clickable repo breakdown stays in Markdown) and generic font stacks only.
 *  - Text is positioned with text-anchor="middle" against fixed anchors, never
 *    hand-computed left offsets, because glyph widths vary by viewer font.
 *  - No timestamp anywhere. A "last updated" string would make the file differ
 *    on every run and the workflow would commit forever.
 */

/** Chart chrome and ink, per theme. Values are the design-system tokens. */
const THEMES = {
  light: {
    surface: '#fcfcfb',
    primary: '#0b0b0b',
    secondary: '#52514e',
    rule: '#e1e0d9',
    border: 'rgba(11,11,11,0.10)',
    accent: '#2a78d6',
  },
  dark: {
    surface: '#1a1a19',
    primary: '#ffffff',
    secondary: '#c3c2b7',
    rule: '#2c2c2a',
    border: 'rgba(255,255,255,0.10)',
    accent: '#3987e5',
  },
};

const W = 760;
const H = 196;
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * @param {{value:number,label:string}[]} tiles exactly three headline metrics
 * @param {'light'|'dark'} mode
 */
export const renderCard = (tiles, mode) => {
  const t = THEMES[mode];
  const col = W / tiles.length;
  const centers = tiles.map((_, i) => col * i + col / 2);

  const cells = tiles
    .map(
      (tile, i) => `
    <text class="v" x="${centers[i].toFixed(1)}" y="126">${esc(tile.value.toLocaleString('en-US'))}</text>
    <text class="l" x="${centers[i].toFixed(1)}" y="152">${esc(tile.label)}</text>`
    )
    .join('');

  // Hairline separators sit between columns, never at the card edges.
  const rules = centers
    .slice(1)
    .map(
      (_, i) =>
        `<line class="r" x1="${(col * (i + 1)).toFixed(1)}" y1="72" x2="${(col * (i + 1)).toFixed(1)}" y2="158" />`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <style>
    .card  { fill: ${t.surface}; stroke: ${t.border}; }
    .accent{ fill: ${t.accent}; }
    .t     { font: 600 13px ${SANS}; fill: ${t.secondary}; letter-spacing: 1.6px; }
    .v     { font: 600 58px ${SANS}; fill: ${t.primary}; text-anchor: middle; }
    .l     { font: 400 16px ${SANS}; fill: ${t.secondary}; text-anchor: middle; letter-spacing: .3px; }
    .f     { font: 400 13px ${SANS}; fill: ${t.secondary}; text-anchor: middle; }
    .r     { stroke: ${t.rule}; stroke-width: 1; }
  </style>
  <clipPath id="card"><rect x="0" y="0" width="${W}" height="${H}" rx="10" /></clipPath>
  <rect class="card" x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" />
  <rect class="accent" x="0" y="0" width="${W}" height="3" clip-path="url(#card)" />
  <text class="t" x="32" y="46">ENGINEERING ACTIVITY</text>
  ${rules}${cells}
  <text class="f" x="${W / 2}" y="180">Public repositories only · recalculated weekly by GitHub Actions</text>
</svg>
`;
};

/** Categorical slots 1-2. Validated for CVD separation on both surfaces. */
const SERIES = {
  light: { merged: '#2a78d6', reviews: '#eb6834' },
  dark: { merged: '#3987e5', reviews: '#d95926' },
};

/**
 * Grouped column chart: merged PRs and reviews per year.
 *
 * Every bar is direct-labelled. The usual rule against a number on every mark
 * assumes a hover tooltip is available; an SVG served through GitHub's image
 * pipeline has no interaction layer, so the labels ARE the table view.
 *
 * @param {{year:string,merged:number,reviews:number,partial:boolean}[]} years
 * @param {'light'|'dark'} mode
 */
export const renderHistory = (years, mode) => {
  const t = THEMES[mode];
  const c = SERIES[mode];
  const w = 760;
  const h = 252;
  const base = 202;      // baseline y
  const top = 74;        // top of plot
  const padX = 46;

  const max = Math.max(...years.flatMap((y) => [y.merged, y.reviews]));
  const scale = (v) => (v / max) * (base - top);
  const band = (w - padX * 2) / years.length;
  const bw = 26;

  const bar = (x, v, fill) => {
    if (!v) return '';
    const bh = scale(v);
    // Drawn past the baseline and clipped, so only the data-end stays rounded.
    return `<rect x="${x.toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${bw}" height="${(bh + 6).toFixed(1)}" rx="4" fill="${fill}" clip-path="url(#plot)" />`;
  };

  const groups = years
    .map((y, i) => {
      const cx = padX + band * i + band / 2;
      // 2px surface gap between the adjacent pair.
      const xa = cx - bw - 1;
      const xb = cx + 1;
      const lbl = (x, v) =>
        v ? `<text class="n" x="${(x + bw / 2).toFixed(1)}" y="${(base - scale(v) - 7).toFixed(1)}">${v}</text>` : '';
      return `
    ${bar(xa, y.merged, c.merged)}${bar(xb, y.reviews, c.reviews)}
    ${lbl(xa, y.merged)}${lbl(xb, y.reviews)}
    <text class="x" x="${cx.toFixed(1)}" y="${base + 20}">${esc(y.year)}${y.partial ? '*' : ''}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <style>
    .card { fill: ${t.surface}; stroke: ${t.border}; }
    .t    { font: 600 13px ${SANS}; fill: ${t.secondary}; letter-spacing: 1.6px; }
    .n    { font: 600 11px ${SANS}; fill: ${t.secondary}; text-anchor: middle; }
    .x    { font: 400 12px ${SANS}; fill: ${t.secondary}; text-anchor: middle; }
    .lg   { font: 400 12px ${SANS}; fill: ${t.secondary}; }
    .f    { font: 400 11px ${SANS}; fill: ${t.secondary}; }
    .ax   { stroke: ${t.rule}; stroke-width: 1; }
  </style>
  <clipPath id="plot"><rect x="0" y="0" width="${w}" height="${base}" /></clipPath>
  <rect class="card" x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" />
  <text class="t" x="30" y="40">CONTRIBUTION HISTORY</text>
  <rect x="${w - 218}" y="31" width="10" height="10" rx="2" fill="${c.merged}" />
  <text class="lg" x="${w - 202}" y="40">Merged</text>
  <rect x="${w - 128}" y="31" width="10" height="10" rx="2" fill="${c.reviews}" />
  <text class="lg" x="${w - 112}" y="40">Reviews</text>
  <line class="ax" x1="${padX - 10}" y1="${base}" x2="${w - padX + 10}" y2="${base}" />
  ${groups}
  <text class="f" x="30" y="${h - 12}">* year to date · public repositories only</text>
</svg>
`;
};
