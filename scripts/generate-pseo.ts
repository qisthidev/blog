import fs from "node:fs";
import path from "node:path";
import type {
  ErrorGuide,
  PerformanceGuide,
  PSEODataset,
} from "../src/data/pseo/schema";

const BLOG_DIR = path.resolve("src/data/blog");
const PSEO_DIR = path.resolve("src/data/pseo");

// --- CLI args ---
const args = process.argv.slice(2);
const modelArg =
  args.find(a => a.startsWith("--model="))?.split("=")[1] ?? "all";
const dryRun = args.includes("--dry-run");

function today(): string {
  return new Date().toISOString();
}

// --- Error Guide Template ---
function renderErrorGuide(entry: ErrorGuide, _hub: string, hubTags: string[]): string {
  const title = `${entry.error_message}: How to Fix`;
  const description = `${entry.root_cause.slice(0, 155).trim()}...`;
  const tags = [...new Set([...entry.related_topics, ...hubTags])];

  const faqsYaml = entry.faqs
    .map(
      f =>
        `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"')}"`
    )
    .join("\n");

  const symptomsSection = entry.symptoms
    .map(s => `- ${s}`)
    .join("\n");

  const stepsSection = entry.fix_steps
    .map((s, i) => `### Step ${i + 1}: ${s.split(" — ")[0]}\n\n${s}`)
    .join("\n\n");

  const difficultyExplanation =
    entry.difficulty === "beginner"
      ? "This guide is suitable for developers new to this topic. You should be comfortable with basic framework concepts and have a development environment set up. No prior experience with the specific error or optimization technique is required."
      : entry.difficulty === "intermediate"
        ? "This guide assumes familiarity with the framework and its core tooling. You should understand basic database concepts, configuration patterns, and be comfortable reading framework source code when needed. Prior experience with similar issues will help but is not required."
        : "This guide requires deep understanding of framework internals and production debugging techniques. You should be experienced with profiling tools, understand concurrency patterns, and be comfortable debugging issues that only manifest under production load or specific timing conditions.";

  return `---
author: Qisthi Ramadhani
pubDatetime: ${today()}
title: "${title}"
featured: false
draft: false
tags:
${tags.map(t => `  - ${t}`).join("\n")}
description: "${description}"
faqs:
${faqsYaml}
---

## TL;DR

${entry.root_cause.split(". ").slice(0, 2).join(". ")}. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

${symptomsSection}

If any of these symptoms look familiar, you're dealing with **${entry.error_message.toLowerCase()}**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

${entry.root_cause}

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

${stepsSection}

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

\`\`\`${entry.example_code.language}
${entry.example_code.before}
\`\`\`

### After (Fixed)

\`\`\`${entry.example_code.language}
${entry.example_code.after}
\`\`\`

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**${entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)}**

${difficultyExplanation}

---

## Frequently Asked Questions

${entry.faqs.map(f => `### ${f.question}\n\n${f.answer}`).join("\n\n")}
`;
}

// --- Performance Guide Template ---
function renderPerformanceGuide(
  entry: PerformanceGuide,
  _hub: string,
  hubTags: string[]
): string {
  const title = `${entry.topic.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}: ${entry.technology.charAt(0).toUpperCase() + entry.technology.slice(1)} Performance Guide`;
  const description = `${entry.explanation.slice(0, 155).trim()}...`;
  const tags = [...new Set([...entry.related_articles, ...hubTags])];

  const faqsYaml = entry.faqs
    .map(
      f =>
        `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"')}"`
    )
    .join("\n");

  const metricsTable =
    "| Metric | Before | After |\n|--------|--------|-------|\n" +
    entry.metrics.map(m => `| ${m.metric} | ${m.before} | ${m.after} |`).join("\n");

  return `---
author: Qisthi Ramadhani
pubDatetime: ${today()}
title: "${title}"
featured: false
draft: false
tags:
${tags.map(t => `  - ${t}`).join("\n")}
description: "${description}"
faqs:
${faqsYaml}
---

## TL;DR

${entry.explanation.split(". ").slice(0, 2).join(". ")}. **Impact: ${entry.performance_impact}.** This guide walks through the problem, the solution, and how to verify the improvement with real metrics.

---

## The Problem

${entry.problem_scenario}

This is a common scenario in production applications that have been running for months or years. The performance degradation is often gradual, making it hard to notice until it becomes a serious issue affecting users or operational costs.

---

## How It Works

${entry.explanation}

Understanding the underlying mechanism is key to applying this optimization correctly and knowing when it applies to your specific situation versus when a different approach is needed.

---

## Solution

The following before/after comparison demonstrates the complete solution. Study the comments carefully — they explain the reasoning behind each configuration choice.

### Before

\`\`\`${entry.solution_code.language}
${entry.solution_code.before}
\`\`\`

### After

\`\`\`${entry.solution_code.language}
${entry.solution_code.after}
\`\`\`

---

## Performance Impact

${entry.performance_impact}

Here are the measured results from applying this optimization in a production environment:

${metricsTable}

These numbers will vary based on your specific data volume, hardware, and query patterns, but the relative improvement should be consistent. Always measure before and after in your own environment to confirm the impact.

---

## When to Use This

This optimization is most effective when:

- Your application matches the problem scenario described above
- You've confirmed the bottleneck with monitoring or profiling tools
- The data volume is large enough that the optimization makes a meaningful difference

It may not be the right fit if your tables are small (under 100K rows), your queries are already fast (under 10ms), or the bottleneck is elsewhere in your stack (application code, network, or client-side rendering).

---

## Key Takeaways

- **Measure first**: Always profile before optimizing — the bottleneck may not be where you think it is
- **Test in staging**: Apply the optimization in a staging environment with production-like data before deploying
- **Monitor after**: Set up dashboards tracking the metrics above so you can verify the improvement and catch regressions

---

## Frequently Asked Questions

${entry.faqs.map(f => `### ${f.question}\n\n${f.answer}`).join("\n\n")}
`;
}

// --- Hub Pillar Page Template ---
function renderHubPillar(
  dataset: PSEODataset<ErrorGuide | PerformanceGuide>,
  spokeLinks: { title: string; path: string; description: string }[]
): string {
  const tags = dataset.hub_tags;
  const hubFaqs = [
    {
      question: `What is the ${dataset.hub_title} series about?`,
      answer: dataset.hub_description,
    },
    {
      question: `Who should read the ${dataset.hub_title} guides?`,
      answer: `These guides are for developers who are already comfortable with the basics and want to level up their production skills. Each article includes real code examples, performance benchmarks, and practical debugging techniques you can apply to your own projects immediately.`,
    },
  ];

  const faqsYaml = hubFaqs
    .map(
      f =>
        `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"')}"`
    )
    .join("\n");

  return `---
author: Qisthi Ramadhani
pubDatetime: ${today()}
title: "${dataset.hub_title}"
featured: true
draft: false
tags:
${tags.map(t => `  - ${t}`).join("\n")}
description: "${dataset.hub_description.slice(0, 155).trim()}..."
faqs:
${faqsYaml}
---

## TL;DR

${dataset.hub_description} This hub page links to every article in the series — start anywhere based on your current challenge, or work through them in order for a comprehensive understanding.

---

## How It Works

This is the hub page for the **${dataset.hub_title}** series. Each article below dives deep into a specific topic with real code examples, production-tested solutions, and practical advice. The series follows a hub-and-spoke model: this page gives you the big picture, and each spoke article provides deep, focused coverage of a single topic.

Every article in this series includes:

- **Before/after code examples** showing the exact changes to make
- **Performance benchmarks** with real metrics from production environments
- **Common pitfalls** and how to avoid them, drawn from real debugging sessions
- **FAQs** addressing the questions developers actually ask about each topic

---

## Articles in This Series

${spokeLinks.map((s, i) => `### ${i + 1}. [${s.title}](${s.path})\n\n${s.description}`).join("\n\n")}

---

## Getting Started

If you're not sure where to begin, here's a suggested reading order based on impact and complexity:

1. **Start with the fundamentals**: Read the first article in the list above to establish baseline knowledge
2. **Jump to your pain point**: If you're actively debugging an issue, find the article that matches your symptoms
3. **Work through advanced topics**: Once you're comfortable with the basics, tackle the deeper optimization and debugging guides

Each article is self-contained — you don't need to read them in order. But the later articles sometimes reference concepts from earlier ones, so reading in order gives you the most complete picture.

---

## Who Is This For?

This series is for developers who are already comfortable with the basics and want to level up their production skills. You should have:

- Working knowledge of the core technologies covered (check the tags above)
- A development environment where you can test the examples
- Ideally, access to a staging or production environment for performance testing

Whether you're a senior developer optimizing a high-traffic application or a mid-level developer preparing for production deployment, these guides give you the specific knowledge you need.

---

## Example: Quick Diagnostic Check

Here's a quick diagnostic snippet to assess whether your application could benefit from the optimizations covered in this series:

\`\`\`sql
-- Check your database for common performance indicators
SELECT
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
    last_autovacuum,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
\`\`\`

If you see tables with a high dead row percentage or unexpectedly large sizes, the articles in this series will help you diagnose and fix the underlying issues.

---

## Frequently Asked Questions

${hubFaqs.map(f => `### ${f.question}\n\n${f.answer}`).join("\n\n")}
`;
}

// --- Main Generation Logic ---
function generateFromDataset(filePath: string): { generated: string[]; hub: string } {
  const raw = fs.readFileSync(filePath, "utf-8");
  const dataset: PSEODataset<any> = JSON.parse(raw);
  const generated: string[] = [];

  const outDir = path.join(BLOG_DIR, dataset.hub);
  if (!dryRun) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const spokeLinks: { title: string; path: string; description: string }[] = [];

  for (const entry of dataset.entries) {
    let content: string;
    let slug: string;
    let title: string;
    let description: string;

    if (dataset.model === "errors") {
      const e = entry as ErrorGuide;
      content = renderErrorGuide(e, dataset.hub, dataset.hub_tags);
      slug = e.slug;
      title = `${e.error_message}: How to Fix`;
      description = e.root_cause.slice(0, 155).trim() + "...";
    } else if (dataset.model === "performance") {
      const p = entry as PerformanceGuide;
      content = renderPerformanceGuide(p, dataset.hub, dataset.hub_tags);
      slug = p.slug;
      title = `${p.topic.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}: ${p.technology.charAt(0).toUpperCase() + p.technology.slice(1)} Performance Guide`;
      description = p.explanation.slice(0, 155).trim() + "...";
    } else {
      console.warn(`Unknown model: ${dataset.model}, skipping entry`);
      continue;
    }

    const outFile = path.join(outDir, `${slug}.md`);
    const postPath = `/blog/${dataset.hub}/${slug}`;

    spokeLinks.push({ title, path: postPath, description });

    if (dryRun) {
      console.log(`[DRY RUN] Would write: ${outFile}`);
      console.log(`  Title: ${title}`);
      console.log(`  Words: ~${content.split(/\s+/).length}`);
    } else {
      fs.writeFileSync(outFile, content, "utf-8");
      console.log(`✓ Generated: ${outFile}`);
    }
    generated.push(outFile);
  }

  // Generate hub pillar page
  const hubSlug = `${dataset.hub}-guide`;
  const hubFile = path.join(outDir, `${hubSlug}.md`);
  const hubContent = renderHubPillar(dataset, spokeLinks);

  if (dryRun) {
    console.log(`[DRY RUN] Would write hub: ${hubFile}`);
  } else {
    fs.writeFileSync(hubFile, hubContent, "utf-8");
    console.log(`✓ Generated hub: ${hubFile}`);
  }
  generated.push(hubFile);

  return { generated, hub: dataset.hub };
}

// --- Run ---
const models = modelArg === "all" ? ["errors", "performance"] : [modelArg];

let totalGenerated = 0;

for (const model of models) {
  const filePath = path.join(PSEO_DIR, `${model}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Dataset not found: ${filePath}`);
    process.exit(1);
  }
  console.log(`\n--- Generating from: ${model}.json ---`);
  const { generated } = generateFromDataset(filePath);
  totalGenerated += generated.length;
}

console.log(`\n${dryRun ? "[DRY RUN] " : ""}Total: ${totalGenerated} files`);
