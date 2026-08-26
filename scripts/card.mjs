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

const W = 860;
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
    .t     { font: 600 11px ${SANS}; fill: ${t.secondary}; letter-spacing: 1.6px; }
    .v     { font: 600 54px ${SANS}; fill: ${t.primary}; text-anchor: middle; }
    .l     { font: 400 13px ${SANS}; fill: ${t.secondary}; text-anchor: middle; letter-spacing: .3px; }
    .f     { font: 400 11px ${SANS}; fill: ${t.secondary}; text-anchor: middle; }
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
