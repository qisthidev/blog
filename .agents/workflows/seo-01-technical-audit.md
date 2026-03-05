---
description: "Execute Phase 1 & 2: Technical Architecture and Audit Configuration"
---

# Technical Architecture & Automated Auditing

This workflow automates the first 5 days of the Accelerated SEO Foundation roadmap, ensuring the Astro.js blog is technically faultless.

## Steps

1.  **Run Astro Type Check:**
    Verify the TypeScript schemas and project health.
    // turbo
    Run `npm run build` or `npm run astro check` in the terminal to identify any type errors or broken Markdown frontmatter. Fix any errors found.
2.  **Verify Schema Markup Automation:**
    Inspect the `src/content/config.ts` or similar Astro content configuration files.
    Verify that global SEO schemas (JSON-LD) are being generated programmatically (e.g., using `astro-seo` or custom `<head>` injections for `Article` and `FAQPage`).
3.  **Check Hreflang Configuration:**
    Ensure the `src/layouts/Layout.astro` (or equivalent base layout) correctly iterates over available site locales (ID/EN) and injects `<link rel="alternate" hreflang="...">` tags for bilingual support.
4.  **Automate CI/CD Auditing:**
    If the project lacks a GitHub Actions workflow that runs Lighthouse CI or validates broken links on PRs, suggest creating one in `.github/workflows/seo-audit.yml`.
