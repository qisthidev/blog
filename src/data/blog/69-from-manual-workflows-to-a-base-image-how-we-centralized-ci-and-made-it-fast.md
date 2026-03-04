---
author: Qisthi Ramadhani
pubDatetime: 2025-10-09T00:00:00.000Z
title: "From Manual Workflows to a Base Image: How We Centralized CI and Made It Fast"
slug: from-manual-workflows-to-a-base-image-how-we-centralized-ci-and-made-it-fast
featured: false
draft: true
tags:
  - blog
  - web-development
description: "How we moved from ad-hoc CI setup to a reusable base image, fixing permission issues and speeding up runs."
---

When you ship software across multiple apps and teams, the biggest silent tax is “setup drift”—each workflow subtly different, tooling versions not quite aligned, and permissions behaving inconsistently across runners. This post is the story of how we moved our CI from hand-assembled steps to a central, reusable base image, and why that change now pays us back every single run.

## TL;DR

- We replaced ad‑hoc runner setup with a containerized CI using [`laravoltdev/image-browser:php8.4-base`](https://hub.docker.com/r/laravoltdev/image-browser).
- We fixed permission headaches by matching the runner’s user in the container.
- We centralized Node/Composer/Playwright installs and added targeted caches.
- Result: fewer flakes, faster runs, and a repeatable workflow that any repo can adopt with near-zero friction.

---

## A: The Pain We Lived With (Manual CI)

Our old pipeline did what most do: check out code, set up PHP via an action, set up Node via another action, install dependencies, build assets, run tests. It worked—but it wasn’t resilient:

- Version drift: Tooling differences between jobs and repos meant hard-to-reproduce failures.
- Permissions: CI writes (node_modules, vendor, build artifacts) sometimes didn’t match the runner user, causing “permission denied.”
- Cold starts: Every run redownloaded browsers and dependencies, ballooning run time.

These issues don’t appear every day, but they accumulate friction and slow down teams.

---

## B: The Base Image Approach (Infrastructure, Not Steps)

We flipped the model: instead of configuring tools per run, bake the environment into a base image and run the workflow inside that container.

### Key Ideas We Adopted

1. Configure the runner user once:
   - A lightweight `configure` job captures `UID:GID` from the runner and exports it as an output.
   - The `ci` job then runs the container with `--user UID:GID`, eliminating permission mismatches.

2. Standardize the toolchain in a base image:
   - The container carries PHP 8.4, Composer, Node toolchain, and common dependencies already aligned.
   - No more “setup-php” + “setup-node” drift; we control versions centrally.

3. Cache the super-costly bits:
   - Composer vendor directory cache.
   - Node `node_modules` cache.
   - Playwright browser cache (`~/.cache/ms-playwright`) keyed to package manifests.

4. Explicit install + build:
   - `npm install`, install Playwright, `npx playwright install`, then `npm run build`.
   - `composer install` with production-friendly flags.

5. Coverage as a first-class citizen:
   - Tests run with `XDEBUG_MODE=coverage` to ensure we can track and improve quality.

Together, this yields a CI that feels like production: consistent, predictable, fast.

---

## E: What Changed Concretely (Commit‑Driven Story)

We didn’t land this all at once. Here’s the arc:

- “chore: using laravoltdev/image-browser:php8.4-base” — switch CI to run inside the base image.
- “fix: permission denied” — map runner UID/GID into the container to align file ownership.
- “add caching” — introduce caches for Composer and Node to reduce cold starts.
- “fix: c not found” and “fix: command update” — iron out command paths and installs inside the container.
- “Cache Playwright Browsers” — persist expensive browser binaries across runs.
- “revert: unaffected” — trim experiments that didn’t move the needle.
- “update” — polish flags and sequence to stabilize the pipeline.

Each commit pushed us from step-based configuration to infrastructure-as-a-platform for CI.

---

## Why This Matters for the Team (Centralized Infrastructure)

- One image to rule them all: Everyone shares the same base toolchain. Versions are unified. Docs are simpler.
- Faster onboarding: New repos copy a known-good workflow that “just works.”
- Consistency across services: Builds, tests, and coverage behave the same everywhere.
- Easier maintenance: Update the base image, not N different workflow files.

Think of the workflow as a thin control plane; the heavy lifting happens in the standardized runtime you can evolve centrally.

---

## Results: Fast CI, Fewer Surprises

- Cold-start runs drop time thanks to Composer/Node/Playwright caches.
- Permission flakiness disappears when user IDs are aligned.
- Coverage becomes reliable and actionable with `XDEBUG_MODE=coverage`.
- Containerized jobs reduce variability between GitHub runners.

In practice, we’ve seen fewer failed runs due to environment issues and a smoother developer experience—especially for juniors who should focus on code, not CI quirks.

---

## How To Adopt This (Copy‑Ready Patterns)

1. Add a `configure` job that outputs the runner’s `UID:GID`.
2. Run your `ci` job in the base image with `--user ${{ needs.configure.outputs.uid_gid }}`.
3. Add caches:
   - Composer: key off `composer.json`.
   - Node: key off `package.json`.
   - Playwright: cache `~/.cache/ms-playwright`.
4. Install deps + browsers, build assets, run tests with coverage:
   - `npm install && npm install playwright@latest && npx playwright install`
   - `composer install --no-interaction --prefer-dist --optimize-autoloader`
   - `XDEBUG_MODE=coverage composer test`

After that, any repo can standardize on the same image and workflow with minimal edits.

---

## Lessons Learned

- Centralize the environment, not the steps: Containers beat per-run setup for consistency.
- Always solve permissions first: Map user IDs; don’t fight file ownership.
- Cache what’s heavy: Composer, Node modules, and Playwright browsers pay back every run.
- Treat coverage as a product metric: Make it reliable and cheap to collect.
- Keep the workflow thin: The container is your infrastructure; the workflow orchestrates it.

---

## What’s Next

- Publish and version the base image formally with changelogs.
- Add smoke tests inside the image to catch regressions early.
- Expand caches to language-specific artifacts where it makes sense.
- Document a “golden path” template so new services adopt this in minutes.

By moving from manually assembled CI to an image-first platform, we’ve turned our pipeline into shared infrastructure: faster, safer, and easier to reason about. If your team is wrestling with setup drift or flaky runs, start by baking your environment into a base image and let your workflow be the simple, reliable conductor.
