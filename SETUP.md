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

1. Rename the account: **Settings → Account → Change username** → `nhthinh`.
2. Rename this repo to `nhthinh` (Settings → General). It is already public.
3. Update the hardcoded URLs:

   ```bash
   sed -i 's/nhthinh-axonivy/nhthinh/g' README.md scripts/engineering-activity.mjs SETUP.md
   ```

   The workflow needs no change — it passes `github.repository_owner`, which follows the
   rename automatically.
4. Replace the email in the hero line with a personal address. The current one
   (`@axonactive.com`) stops working when the job ends.
5. Add the LinkedIn link back to the hero line — it was removed rather than shipped as a
   dead `linkedin.com/in/` URL. Add it as soon as you have the handle; no need to wait.
6. Re-run the workflow and confirm the numbers survived the rename.

## Wording that ages after the job change

- **"Product engineering — public repos I ship"** — present tense. The contributions stay
  factual and public, but "ship" becomes past tense once you leave. Consider
  "public repos I've shipped to".
- The metrics themselves are safe: the generator counts **public repositories only**, so
  losing org membership does not change any number.

## Local commands

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/engineering-activity.mjs --dry-run   # preview
GITHUB_TOKEN=$(gh auth token) node scripts/engineering-activity.mjs            # write
```
