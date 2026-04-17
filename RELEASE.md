# Release Checklist

Internal notes for cutting a new release. Not part of the HACS listing.

## One-time setup (before the very first release)

1. [ ] Create the GitHub repo at `github.com/delgusto/ha-bulk-entity-editor`.
2. [ ] `git init`, add the remote, push `main`.
3. [ ] On GitHub → Settings → General, enable **Issues** and **Discussions** (optional).
4. [ ] On GitHub → Settings → Actions → General, allow GitHub Actions to run.
5. [ ] Open a PR (or push to `main`) so the **Validate** workflow runs once. All three jobs (HACS, Hassfest, Frontend) must pass green before tagging a release.
6. [ ] Capture real screenshots:
   - Main panel with entities loaded, some selected, action bar visible.
   - Change-area dialog open.
   - Rename dialog with the entity_id warning banner visible.
   Save to `docs/screenshots/` and uncomment the image reference in `README.md`.

## Every release

1. [ ] All work for the release is merged to `main`.
2. [ ] Frontend is rebuilt and the bundle is committed:
       ```bash
       cd frontend-src && npm run build
       git add ../custom_components/bulk_entity_editor/frontend/bulk-entity-editor.js
       ```
3. [ ] Bump the version in **two** places (must match):
   - `custom_components/bulk_entity_editor/manifest.json` → `"version"`
   - `CHANGELOG.md` — move `[Unreleased]` items into a new `[X.Y.Z] - YYYY-MM-DD` section.
4. [ ] Commit: `chore: release vX.Y.Z`.
5. [ ] Wait for the **Validate** workflow to pass on `main`.
6. [ ] Tag and push:
       ```bash
       git tag vX.Y.Z
       git push origin main vX.Y.Z
       ```
7. [ ] On GitHub → Releases → **Draft a new release** → pick the tag → paste the CHANGELOG section for this version as the release notes → **Publish**.

HACS installs from the latest **release**, not from `main`, so users only see the new version after step 7.

## First submission to the HACS default store

Only do this after at least one tagged release exists and the workflow is green.

1. [ ] Make sure the repo has: topics including `home-assistant` and `hacs-integration`, a clear description, and a working screenshot in the README.
2. [ ] Open a PR against [`hacs/default`](https://github.com/hacs/default) adding this repo to `integration`.
3. [ ] Respond to any reviewer feedback and iterate.

Until that PR lands, users install via HACS custom repository.

## If something goes wrong after release

- **Broken release** → tag a patch version (`vX.Y.(Z+1)`) with the fix. Do not delete/retag the broken one — HACS users may have already pulled it, and a retag silently changes their install.
- **Manifest/CHANGELOG version mismatch** → same: ship a patch.
