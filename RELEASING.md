# How to ship a new version

Everything is built on GitHub. You never build the card on your Mac and you never attach a
file to a release by hand.

## Shipping a release (the normal case)

1. Push your changes to `main` as usual.
2. Open <https://github.com/sygad/lovelace-horizon-card/actions> and wait for the
   **Build & Test** run for your push to go green. If it is red, the card is broken — fix it
   before releasing (see [If a run is red](#if-a-run-is-red)).
3. In the left-hand list of workflows, click **Build & Release**.
4. Click the grey **Run workflow** button on the right.
5. In the **Version tag** box, type the version you are shipping, with a leading `v` —
   for example `v2.0.0-tiles.4`.
6. Click the green **Run workflow** button.

That is it. The run takes a couple of minutes and does all of this for you:

- installs dependencies, runs `yarn lint`, `yarn test` and `yarn build`;
- writes the version you typed into the bundle, so the card logs the right version in the
  browser console;
- creates the GitHub release, marks it as the latest one, writes the release notes from your
  commits, and attaches `lovelace-horizon-card.js` to it.

HACS only ever downloads that attached file (it is named in `hacs.json`), so once the run is
green, Home Assistant users will be offered the update.

If you typed a version that already exists, or the lint/tests/build fail, the run stops and
**no release is created** — nothing half-finished is published.

## What version number comes next?

You pick it; nothing is computed automatically. The releases so far are `v2.0.0-tiles.1`,
`v2.0.0-tiles.2` and `v2.0.0-tiles.3`, so the obvious next one is **`v2.0.0-tiles.4`**.

The only rules are: start with `v`, then three numbers separated by dots, then (optionally) a
`-` and whatever you like — `v2.0.1` and `v2.0.0-tiles.4` are both accepted. HACS compares
these to decide whether an update is available, so each new version must sort above the last
one: bump the trailing number rather than reusing or going backwards.

## Betas (optional)

**Build & Pre-release (beta)** works exactly the same way, but the release is flagged as a
pre-release, so only people who ticked "Show beta versions" for this repository in HACS are
offered it. Use a tag like `v2.1.0-beta.1`. Betas never become the "latest" release, so they
cannot disturb the version normal users get.

## What runs by itself

- **Every push to `main` and every pull request** → **Build & Test** (lint, tests, build).
  This publishes nothing.
- **Every push to `main`** → **Validate** (HACS's own repository check).
- **Changes to the translation files** → **Regenerate localization**, which commits the
  regenerated index back for you.

Releases are the one thing that only ever happens when you click the button.

## If a run is red

Click the run, then the failed job, then the step with the red cross — the last lines of its
log say what went wrong. The usual causes are a lint error, a failing test, or a snapshot that
needs updating (`yarn test -u` locally, then commit the updated snapshots).

## One-time repository settings

These are already done, but if you ever fork this repository again:

- **Actions must be switched on.** GitHub does not run workflows on a brand-new fork until the
  owner agrees: go to the repository's **Actions** tab and click the grey
  **"I understand my workflows, go ahead and enable them"** button. Until that is clicked,
  pushes trigger absolutely nothing and the Actions tab stays empty, with no error anywhere.
- **Issues must be switched on** for the HACS **Validate** check to pass: **Settings** →
  scroll to **Features** → tick **Issues**. Forks start with issues turned off, and HACS
  requires a place for users to report problems.
