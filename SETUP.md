# Go-live checklist

The profile README only renders when the repository name **exactly equals** the GitHub
username. Until the handle changes, this repo stays under a neutral name and does not
render anywhere.

## Now — live

The repo is `nhthinh-axonivy/nhthinh-axonivy`, public, so it renders at
<https://github.com/nhthinh-axonivy> immediately. The name is not a lock-in: renaming a
repo takes seconds and GitHub redirects the old URL.

```bash
gh secret set ACTIVITY_TOKEN --repo nhthinh-axonivy/nhthinh-axonivy   # PAT: repo + read:org
gh workflow run "Engineering Activity" --repo nhthinh-axonivy/nhthinh-axonivy
```

`ACTIVITY_TOKEN` is **required**, not optional. The default `GITHUB_TOKEN` is scoped to a
single repository, so cross-repo `author:` / `reviewed-by:` searches return almost nothing.
Without the secret the weekly run replaces the real numbers with near-zero and commits it.

## In ~3 weeks — after the job change

`github-profile` (private) is the future home. `nhthinh-axonivy/nhthinh-axonivy`
(public) is only the interim renderer and gets deleted.

1. Rename the account: **Settings → Account → Change username** → `nhthinh`.
2. Delete the interim repo: `gh repo delete nhthinh/nhthinh-axonivy --yes`.
3. Rename `github-profile` to **`nhthinh`** — *renaming is required, not optional*.
   A profile README only renders when the repo name equals the username exactly,
   so a public repo still called `github-profile` renders nothing.
4. Make it **public** (Settings → General → Danger Zone).
5. Delete this file — it should not ship on a public profile:
   `git rm SETUP.md && git commit -m "drop setup notes" && git push`
6. Update the hardcoded URLs:

   ```bash
   sed -i 's/nhthinh-axonivy/nhthinh/g' README.md scripts/engineering-activity.mjs
   ```

   The workflow needs no change — it passes `github.repository_owner`, which follows
   the rename automatically. The CV link (`nhthinh-axonivy.github.io/my-cv/`) is the
   one that silently breaks without this, since Pages URLs follow the handle.
7. Add the secret to the new home and confirm the numbers survive:

   ```bash
   gh secret set ACTIVITY_TOKEN --repo nhthinh/nhthinh   # PAT: repo + read:org
   gh workflow run "Engineering Activity" --repo nhthinh/nhthinh
   ```

## Wording that ages after the job change

- **"Product engineering — public repos I ship"** — present tense. The contributions stay
  factual and public, but "ship" becomes past tense once you leave. Consider
  "public repos I've shipped to".
- The metrics themselves are safe: the generator counts **public repositories only**, so
  losing org membership does not change any number.

## What the Action does and does not touch

Generated (rewritten every run, between markers):

- `ACTIVITY` — the KPI card `<picture>` block
- `OSS` — the repository table and its caption
- `HISTORY` — the contribution-history chart block
- all four SVGs

Hand-written (edit these yourself):

- the hero lines and contact links
- the `What I Build` JSON block and the upstream-PR line beneath it
- the closing `Now —` line

## The activity card

`scripts/card.mjs` renders `activity-{light,dark}.svg` and `history-{light,dark}.svg`; the README
references them through a `<picture>` element so GitHub picks the right one for the
viewer's theme. GitHub rewrites the relative paths (including `srcset`) to
`/<owner>/<repo>/raw/main/...` when it renders the page, so the card survives the
username rename with no edit.

Two things to preserve if you touch the card:

- **No timestamp in the SVG.** Anything that changes every run makes the workflow's
  "commit only if changed" guard fire forever.
- **No links inside the SVG.** GitHub serves it through its image pipeline, so `<a>`
  is inert and no webfont loads. That is why the clickable repo table stays Markdown.

## Local commands

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/engineering-activity.mjs --dry-run   # preview
GITHUB_TOKEN=$(gh auth token) node scripts/engineering-activity.mjs            # write README + both SVGs
```
