---
description: "Execute Phase 5: Programmatic Engineering"
---

# Programmatic Engineering & SEO Generation

This workflow automates the Day 11-12 requirements: generating programmatic comparisons and technical reference pages at scale.

## Steps

1.  **Ingest Structured Data:**
    Ask the user to provide a sample JSON array (or `.yaml`) containing structured topic data.
    E.g., for a "Framework Comparison" Hub:
    ```json
    [
      {"name": "React", "learningCurve": "Medium", "rendering": "CSR/SSR"},
      {"name": "Astro", "learningCurve": "Low", "rendering": "SSG/Islands"}
    ]
    ```
2.  **Generate Dynamic Template Drafts:**
    Based on the provided JSON data structure, propose the content of an Astro generic route file (e.g., `src/pages/compare/[slug].astro`).
    *   Ensure the template enforces the "40% Unique Value Rule" outlined in `PLAN.md` (e.g., programmatic Mermaid charts based on `rendering` flags or contextual Markdown text insertion).
3.  **Validate SEO Frontmatter (GEO):**
    Ensure the proposed `.astro` component leverages the structured JSON to dynamically set the `<title>`, `<meta name="description">`, and JSON-LD schema (e.g., `TechArticle`).
