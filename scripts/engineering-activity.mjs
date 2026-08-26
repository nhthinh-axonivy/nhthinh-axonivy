#!/usr/bin/env node
/**
 * Engineering Activity generator.
 *
 * Counts merged PRs and code reviews across GitHub, then rewrites the
 * generated blocks in README.md between the ACTIVITY/OSS markers.
 *
 * PUBLIC REPOSITORIES ONLY. Every repository is checked with an explicit
 * `private === false` test before it can influence a number or be named.
 * The filter lives here, in code -- not in the token's scopes -- so that
 * widening the token later cannot leak private or client work.
 *
 * Usage: GITHUB_TOKEN=... node scripts/engineering-activity.mjs [--dry-run]
 */

const USER = process.env.GH_USER ?? 'nhthinh-axonivy';
const TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');
const README = new URL('../README.md', import.meta.url);

/** Orgs whose public repos are shipped products rather than community OSS. */
const PRODUCT_ORGS = new Set(['axonivy', 'axonivy-market']);

if (!TOKEN) {
  console.error('GITHUB_TOKEN is required (needs `repo` + `read:org` for cross-repo review search).');
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': `${USER}-engineering-activity`,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
};

/**
 * One paginated search per query, grouped locally. A per-repo query loop
 * would burn through the 30 requests/minute search rate limit.
 */
const searchItems = async (query) => {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const { items: page_items, total_count } = await api(
      `search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`
    );
    for (const item of page_items) {
      items.push({
        full: item.repository_url.replace('https://api.github.com/repos/', ''),
        // Reviewed PRs may still be open; fall back so every item lands in a year
        // and the bars sum to the headline total.
        year: (item.closed_at ?? item.created_at)?.slice(0, 4) ?? null,
      });
    }
    // GitHub's search API hard-caps at 1000 results; warn rather than plateau silently.
    if (page === 1 && total_count > 1000) {
      console.log(`WARNING: "${query}" has ${total_count} results; only the first 1000 are countable.`);
    }
    if (page * 100 >= Math.min(total_count, 1000) || page_items.length === 0) break;
  }
  return items;
};

const meta = new Map();
const describe = async (full) => {
  if (!meta.has(full)) {
    try {
      const repo = await api(`repos/${full}`);
      meta.set(full, { public: repo.private === false, stars: repo.stargazers_count ?? 0 });
    } catch {
      // Unreadable means we cannot prove it is public. Treat as private.
      meta.set(full, { public: false, stars: 0 });
    }
  }
  return meta.get(full);
};

const mergedItems = await searchItems(`type:pr author:${USER} is:merged`);
const reviewedItems = await searchItems(`type:pr reviewed-by:${USER}`);

// Drop everything we cannot positively confirm is public.
const repos = [...new Set([...mergedItems, ...reviewedItems].map((i) => i.full))];
const publicRepos = [];
for (const full of repos) {
  if ((await describe(full)).public) publicRepos.push(full);
}

const isPublicRepo = new Set(publicRepos);
const tally = (items) => {
  const m = new Map();
  for (const i of items) if (isPublicRepo.has(i.full)) m.set(i.full, (m.get(i.full) ?? 0) + 1);
  return m;
};
const merged = tally(mergedItems);
const reviewed = tally(reviewedItems);

const rows = publicRepos
  .map((full) => ({
    full,
    owner: full.split('/')[0],
    merged: merged.get(full) ?? 0,
    reviewed: reviewed.get(full) ?? 0,
    stars: meta.get(full).stars,
  }))
  .filter((r) => r.merged > 0 || r.reviewed > 0)
  .sort((a, b) => b.merged - a.merged || b.reviewed - a.reviewed);

const external = rows.filter((r) => r.owner !== USER);
const product = external.filter((r) => PRODUCT_ORGS.has(r.owner));
const community = external.filter((r) => !PRODUCT_ORGS.has(r.owner));

const sum = (list, key) => list.reduce((acc, r) => acc + r[key], 0);

const totalMerged = sum(rows, 'merged');
const totalReviewed = sum(rows, 'reviewed');

const tiles = [
  { value: totalMerged, label: 'PRs merged' },
  { value: totalReviewed, label: 'Code reviews' },
  { value: rows.length, label: 'Public repos' },
];

// The card is an image, so the numbers also live in the alt text -- otherwise
// they vanish from screen readers, raw Markdown and text search.
const alt = tiles.map((t) => `${t.value} ${t.label}`).join(', ');

const perYear = (items) => {
  const m = new Map();
  for (const i of items) if (i.year && isPublicRepo.has(i.full)) m.set(i.year, (m.get(i.year) ?? 0) + 1);
  return m;
};
const my = perYear(mergedItems);
const ry = perYear(reviewedItems);
const allYears = [...new Set([...my.keys(), ...ry.keys()])].sort();
// The newest year in the data is by definition still in progress.
const latest = allYears[allYears.length - 1];
const years = allYears.map((year) => ({
  year,
  merged: my.get(year) ?? 0,
  reviews: ry.get(year) ?? 0,
  partial: year === latest,
}));
const histAlt = years
  .map((y) => `${y.year}${y.partial ? ' (to date)' : ''}: ${y.merged} merged, ${y.reviews} reviewed`)
  .join('; ');

const picture = (name, altText) =>
  [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${name}-dark.svg">`,
    `  <img alt="${altText}" src="${name}-light.svg" width="100%">`,
    '</picture>',
  ].join('\n');

const activity = picture('activity', `Engineering activity: ${alt}.`);
const history = picture('history', `Contributions per year, public repositories only. ${histAlt}.`);

const stars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const table = (list, withStars = false) =>
  [
    `| Repository | Merged | Reviewed |${withStars ? ' Stars |' : ''}`,
    `| :--- | ---: | ---: |${withStars ? ' ---: |' : ''}`,
    ...list.map(
      (r) =>
        `| [${r.full}](https://github.com/${r.full}) | ${r.merged} | ${r.reviewed} |` +
        (withStars ? ` ${stars(r.stars)} |` : '')
    ),
  ].join('\n');

const section = (title, list, withStars = false) =>
  list.length ? [`**${title}**`, '', table(list, withStars), ''].join('\n') : '';

const oss = [
  section('Product engineering — public repos I ship', product),
  section('Community open source', community, true),
  `_${sum(external, 'merged')} merged · ${sum(external, 'reviewed')} reviewed across ${external.length} public repositories outside my own account._`,
].filter(Boolean).join('\n');

const replaceBlock = (text, name, body) => {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(text)) throw new Error(`Missing ${name}:START/${name}:END markers in README.md`);
  return text.replace(re, `$1\n${body}\n$2`);
};

const fs = await import('node:fs/promises');
const { renderCard, renderHistory } = await import('./card.mjs');
let readme = await fs.readFile(README, 'utf8');
readme = replaceBlock(readme, 'ACTIVITY', activity);
readme = replaceBlock(readme, 'HISTORY', history);
readme = replaceBlock(readme, 'OSS', oss);

if (DRY_RUN) {
  console.log(activity + '\n\n' + oss);
} else {
  await fs.writeFile(README, readme);
  for (const mode of ['light', 'dark']) {
    await fs.writeFile(new URL(`../activity-${mode}.svg`, import.meta.url), renderCard(tiles, mode));
    await fs.writeFile(new URL(`../history-${mode}.svg`, import.meta.url), renderHistory(years, mode));
  }
  console.log(`Updated README.md — ${totalMerged} merged, ${totalReviewed} reviewed, ${rows.length} public repos.`);
}

const skipped = repos.length - publicRepos.length;
if (skipped > 0) console.log(`Excluded ${skipped} non-public repositor${skipped === 1 ? 'y' : 'ies'}.`);
