---
description: "Execute Phase 3: AI Semantic Mapping and Discovery"
---

# AI Semantic Mapping & Discovery

This workflow automates the Day 6-8 requirements for finding low-competition, zero-click-proof technical queries.

## Steps

1.  **Extract Seed Topics:**
    Ask the user or review the `PLAN.md` file for initial seed clusters (e.g., "React vs Astro hydration", "Front-end DevOps").
2.  **Target Intent "Zero-Click-Proof":**
    Use your internal logic or external tool (e.g., `search_web` simulating Perplexity/Gemini insights) to discover 10-15 highly specific developer intents surrounding the seed topic.
    *   Focus on long-tail debugging, emerging technologies, or specific sub-entity relationships.
3.  **Compile Output:**
    Present the discovered queries to the user in a Markdown structured table, identifying the seed topic, the discovered query, and the hypothesized User Intent (e.g., "Fix", "Compare", "Learn").
