---
description: Run daily pSEO automation script to generate a new batch of content
---

# Daily pSEO Generation

This workflow automates the daily generation of new pSEO entries by executing the `automate:pseo` script.

## Steps

1. **Gather Requirements:** Ask the user for the specific configuration for today's run.
    *   **model**: either `errors` or `performance`
    *   **hub**: the target hub slug
    *   **query** or **batch**: either a single specific topic query or a list of queries. If the user provides a list of queries, save them to a `daily-queries.txt` file in the project root first.

// turbo-all

2. **Generate AI Content (Native Antigravity):**
    You (Antigravity) generate the content directly using your own intelligence! Do not use the `automate:pseo` script because it requires external API credentials that may not be available.
    Instead, follow these guidelines:
    *   Read the target schema defined in `src/data/pseo/schema.ts` (e.g., `ErrorGuide` or `PerformanceGuide`).
    *   Synthesize deep, technical entries for the requested topics. Be sure to align with the core principles in `SKILL.md` (Zero-Click, highly technical).
    *   Use the `multi_replace_file_content` or `run_command` tools to safely append your valid JSON output into the array inside `src/data/pseo/<model>.json`.

3. **Verify and Commit:**
    *   Verify the output logs to ensure `generate-pseo.ts` and `validate-pseo.ts` completed successfully without errors.
    *   Ask the user if they'd like to commit the resulting changes to the repository.
