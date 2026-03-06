---
description: "Execute Phase 6: Link Orchestration & GEO Formatting"
---

# Link Orchestration & GEO Formatting

This workflow automates the Day 13-14 requirements: NLP-driven internal linking and content structural audits.

## Steps

1.  **Scan for Semantic Link Opportunities (Dry Run):**
    Given a target pillar page URI by the user (the "Hub"), scan the `src/content/blog/` directory for any related `.md` or `.mdx` files.
    Identify instances where a Spoke file mentions concepts critical to the Hub, or vice versa.
2.  **Ensure Hub-and-Spoke Enforcement:**
    Filter out suggestions to ensure Spoke pages point to their parent Hub page, consolidating authority. Prevent linking a page back to itself.
3.  **Propose Link Injections:**
    Create a list of proposed markdown link replacements across the repository.
    Example: `Change "Learn about Next.js hydration" to "Learn about [Next.js hydration](/blog/nextjs-hydration-guide/)" in file /src/content/blog/react-ecosystem.mdx`
4.  **Audit for Answer-First Formatting:**
    For the target file, verify the existence of an "Explicit TL;DR" in the first 2-3 sentences. If missing, draft one based on the current file content to enhance its Generative Engine Optimization (GEO) compatibility.
