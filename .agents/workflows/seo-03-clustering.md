---
description: "Execute Phase 4: Intent Categorization and Hub-and-Spoke Clustering"
---

# Intent Categorization & Hub-and-Spoke Clustering

This workflow automates the Day 9-10 requirements, grouping keywords into actionable architectures.

## Steps

1.  **Receive Keyword Data:**
    Ingest the table of 10-15 specific queries from the Semantic Mapping execution or from user-provided data.
2.  **Group by Intent:**
    Identify the "Hub" (the central Pillar Page) and the "Spokes" (the specific subtopics).
    For each Spoke, categorize the required format:
    *   _Tutorial_ (e.g., Step-by-step guide)
    *   _Cheatsheet_ (e.g., Code references, CLI commands)
    *   _Comparison_ (e.g., Framework A vs B)
3.  **Output Architecture Plan:**
    Create a proposed directory structure map using Markdown representing the Astro `/src/content/blog/` directory, showing the exact expected file paths for the Hub and its Spokes.
