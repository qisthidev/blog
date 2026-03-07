---
description: "Generate a GEO-optimized blog article from the clustering architecture plan"
---

# Content Generation Workflow

This workflow automates the creation of GEO-optimized blog articles based on the Hub-and-Spoke architecture defined in `_clustering-architecture.md` and the semantic mapping in `_semantic-mapping.md`.

## Prerequisites

- `_clustering-architecture.md` exists in the project root with Hub-and-Spoke definitions.
- `_semantic-mapping.md` exists in the project root with discovered queries.
- The Astro dev server can be started with `npm run dev`.

## Steps

### 1. Receive the Target Query

The user provides one of:
- A **query string** from the semantic mapping (e.g., "Laravel race condition fix Cache::lock vs database locks")
- A **spoke filename** from the clustering architecture (e.g., `race-condition-fix-cache-lock-vs-database`)
- A general topic description

### 2. Identify the Spoke Context

// turbo
Read `_clustering-architecture.md` and `_semantic-mapping.md` to find:
- The **Hub** this spoke belongs to (e.g., "High-Performance Laravel")
- The **Format** (Tutorial, Comparison, or Cheatsheet)
- The **exact query** being targeted
- The **zero-click resistance** rating

### 3. Check for Existing Coverage

// turbo
Scan `src/data/blog/` for existing posts that may already cover this topic:
```bash
ls src/data/blog/*.md | xargs grep -l "<relevant keywords>" 2>/dev/null
```
Report any overlaps to the user before proceeding. If significant overlap exists, ask the user whether to proceed or pivot.

### 4. Research the Topic

Use `search_web` to gather current, authoritative information on the target query. Focus on:
- **Stack Overflow / GitHub Issues** — real developer pain points
- **Official documentation** — Laravel, Redis, PostgreSQL, Go, Astro docs
- **Community threads** — Reddit, Laracasts, Dev.to discussions
- **Recent changes** — version-specific fixes, new features in 2026

Collect at least 3-5 concrete data points, code patterns, or configuration examples.

### 5. Generate the Article

Create the article at `src/data/blog/<spoke-filename>.md` following the strict schema and GEO formatting rules below.

#### Frontmatter Schema (MANDATORY)

Every field must match the Zod schema in `src/content.config.ts`:

```yaml
---
author: Qisthi Ramadhani
pubDatetime: <YYYY-MM-DDT00:00:00.000Z>   # MUST be a valid ISO 8601 date
modDatetime:                                # optional, nullable
title: "<Title with target query keywords>"
featured: false
draft: false
tags:                                       # MUST be lowercase, kebab-case
  - <primary-technology>
  - <secondary-technology>
  - <category-tag>
description: "<150-160 char meta description with primary keywords>"
canonicalURL:                               # optional
faqs:                                       # optional, array of Q&A pairs
  - question: "<Question from People Also Ask or community forums>"
    answer: "<Concise 1-2 sentence answer>"
  - question: "..."
    answer: "..."
---
```

> [!CAUTION]
> - `pubDatetime` must be a **Date object**, NOT a string like `"2026-03-07"`. Use format: `2026-03-07T00:00:00.000Z`
> - Tags must be **lowercase**. Use `laravel` not `Laravel`.
> - The file goes in `src/data/blog/`, NOT `src/content/blog/`.
> - Do NOT include raw `<script>` tags for JSON-LD — the `faqs` frontmatter field auto-generates the FAQPage schema via `Layout.astro`.

#### GEO Body Structure (Answer-First)

Follow this exact structure depending on the **Format**:

**All Formats:**
1. **TL;DR blockquote** — First element after frontmatter. 2-3 sentences max. Extractable by AI engines.
2. **Dense entity relationships** — Use inline code for technical terms (`SKIP LOCKED`, `pprof`, `EXPLAIN ANALYZE`).
3. **Numbered lists** and **tables** — AI models parse these with high accuracy.
4. **Code snippets** with language tags — Always include a "Bad Practice" vs "Best Practice" pair when applicable.

**Comparison Format:**
- Must include a Markdown comparison table with 4+ dimensions
- Structure: Problem → Table → Recommendation per use case

**Tutorial Format:**
- Must include step-by-step numbered instructions
- Structure: Problem → Prerequisites → Steps → Verification → Troubleshooting

**Cheatsheet Format:**
- Must include categorized code blocks or command references
- Structure: TL;DR → Categories → Quick Reference Table → Pro Tips

### 6. Validate the Build

// turbo
Start the dev server (if not already running) and verify:
```bash
npm run dev
```

Then open the article URL in the browser at:
```
http://localhost:4321/blog/<spoke-filename>
```

Verify:
- [ ] Page renders (not 404)
- [ ] Title displays correctly
- [ ] TL;DR blockquote is visible
- [ ] Tables render properly
- [ ] Code blocks have syntax highlighting
- [ ] Tags appear at the bottom
- [ ] FAQs are present in the page's `<head>` as JSON-LD (view page source)

Capture a screenshot as proof of the Definition of Done.

### 7. Commit and Report

Ask the user whether to commit. If yes:
```bash
git add src/data/blog/<spoke-filename>.md
git commit -m "content: add <spoke-title-short>

- GEO-optimized <format> article for the <Hub Name> hub
- <brief description of content>
- FAQ schema via frontmatter faqs field for rich snippets"
```

### 8. Suggest Internal Links (Optional)

After committing, suggest 2-3 internal link opportunities:
- From the **new spoke** → its **Hub pillar page** (if it exists)
- From **related existing posts** → the **new spoke**
- From the **new spoke** → **sibling spokes** in the same hub

## Quick Reference: Tag Conventions

| Hub | Recommended Tags |
|:----|:----|
| High-Performance Laravel | `laravel`, `redis`, `performance`, `laravel-and-php` |
| Mastering Astro.js | `astro`, `frontend`, `web-development` |
| From Laravel to Go | `go`, `laravel`, `migration`, `clean-architecture` |
| Advanced PostgreSQL | `postgresql`, `database`, `performance`, `laravel-and-php` |
| Modern DevOps | `devops`, `docker`, `github-actions`, `ci-cd` |
