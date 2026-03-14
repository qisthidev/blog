#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Migration script: blog_old (Next.js MDX) → blog (AstroPaper MD)
 *
 * Converts frontmatter format and file extensions from the old Next.js blog
 * to AstroPaper-compatible Markdown files.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_ROOT = path.resolve(__dirname, "..");
const OLD_BLOG_ROOT = path.resolve(__dirname, "../../blog_old");
const OUTPUT_DIR = path.join(BLOG_ROOT, "src/data/blog");

// Source directories
const CONTENT_DIR = path.join(OLD_BLOG_ROOT, "content");
const ARTICLE_DIR = path.join(OLD_BLOG_ROOT, "content-article");

/**
 * Slugify a string for use in tags
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse YAML frontmatter from MDX content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No frontmatter found");
  }

  const frontmatterStr = match[1];
  const body = match[2];

  // Parse YAML manually for the fields we need
  const metadata = {};
  let currentKey = null;
  let currentValue = "";
  let inArray = false;
  let arrayItems = [];
  let inFaqs = false;
  let faqs = [];
  let currentFaq = null;

  const lines = frontmatterStr.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for top-level key
    const keyMatch = line.match(/^([a-zA-Z_]+):\s*(.*)/);
    if (keyMatch && !line.startsWith("  ") && !line.startsWith("\t")) {
      // Save previous key
      if (currentKey && inArray) {
        metadata[currentKey] = arrayItems;
        inArray = false;
        arrayItems = [];
      } else if (currentKey && !inFaqs) {
        metadata[currentKey] = currentValue.trim();
      }

      if (inFaqs && currentFaq) {
        faqs.push({ ...currentFaq });
        currentFaq = null;
      }
      if (inFaqs) {
        metadata["faqs"] = faqs;
        inFaqs = false;
        faqs = [];
      }

      currentKey = keyMatch[1];
      const val = keyMatch[2].trim();

      if (currentKey === "faqs") {
        inFaqs = true;
        currentFaq = null;
        continue;
      }

      // Inline array: ["a", "b", "c"]
      if (val.startsWith("[") && val.endsWith("]")) {
        const items = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
        metadata[currentKey] = items;
        currentKey = null;
        continue;
      }

      // Quoted string
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        metadata[currentKey] = val.slice(1, -1);
        currentKey = null;
        continue;
      }

      // Empty value (array or object follows)
      if (val === "") {
        continue;
      }

      currentValue = val;
      continue;
    }

    // Handle FAQ items
    if (inFaqs) {
      const faqItemMatch = line.match(
        /^\s+-\s+question:\s*["'](.+?)["']\s*$/
      );
      if (faqItemMatch) {
        if (currentFaq) faqs.push({ ...currentFaq });
        currentFaq = { question: faqItemMatch[1], answer: "" };
        continue;
      }
      const faqAnswerMatch = line.match(/^\s+answer:\s*["'](.+?)["']\s*$/);
      if (faqAnswerMatch) {
        if (currentFaq) currentFaq.answer = faqAnswerMatch[1];
        continue;
      }
      // Multi-line answer
      const faqAnswerStart = line.match(/^\s+answer:\s*["'](.+)/);
      if (faqAnswerStart) {
        let answer = faqAnswerStart[1];
        // Read until closing quote
        while (i + 1 < lines.length) {
          i++;
          const nextLine = lines[i];
          if (nextLine.match(/['"]$/)) {
            answer += " " + nextLine.trim().replace(/['"]$/, "");
            break;
          }
          answer += " " + nextLine.trim();
        }
        if (currentFaq) currentFaq.answer = answer;
        continue;
      }
      continue;
    }

    // Array items with dash: - "item" or   - item
    const arrayItemMatch = line.match(/^\s+-\s+(.*)/);
    if (arrayItemMatch && currentKey) {
      inArray = true;
      arrayItems.push(arrayItemMatch[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    // Multi-line array items in bracket format
    if (inArray) {
      const item = line.trim().replace(/^["']|["']$/g, "").replace(/,$/, "");
      if (item && item !== "]") {
        arrayItems.push(item.replace(/^["']|["']$/g, ""));
      }
      continue;
    }
  }

  // Save last key
  if (currentKey && inArray) {
    metadata[currentKey] = arrayItems;
  } else if (currentKey && !inFaqs) {
    metadata[currentKey] = currentValue.trim();
  }
  if (inFaqs) {
    if (currentFaq) faqs.push({ ...currentFaq });
    metadata["faqs"] = faqs;
  }

  return { metadata, body };
}

/**
 * Convert old frontmatter to AstroPaper format
 */
function convertFrontmatter(metadata, filename, isDraft) {
  const tags = [];

  // Add original tags
  if (metadata.tags && Array.isArray(metadata.tags)) {
    tags.push(...metadata.tags.map((t) => t.toLowerCase()));
  }

  // Add category as a tag
  if (metadata.category) {
    const catTag = slugify(metadata.category);
    if (!tags.includes(catTag)) {
      tags.push(catTag);
    }
  }

  // Add series as a tag
  if (metadata.series) {
    const seriesTag = "series-" + slugify(metadata.series);
    if (!tags.includes(seriesTag)) {
      tags.push(seriesTag);
    }
  }

  // Convert publishedAt to ISO 8601
  const dateStr = metadata.publishedAt || "2025-01-01";
  const isoDate = new Date(dateStr + "T00:00:00Z").toISOString();

  // Build slug from filename (strip numeric prefix and underscore prefix)
  let slug = filename
    .replace(/\.mdx$/, "")
    .replace(/^_/, "")
    .replace(/^\d+-/, "");

  const fm = {
    author: "Qisthi Ramadhani",
    pubDatetime: isoDate,
    title: metadata.title || "Untitled",
    slug: slug,
    featured: false,
    draft: isDraft,
    tags: tags,
    description: metadata.summary || "",
  };

  // Build YAML frontmatter string
  let yaml = "---\n";
  yaml += `author: ${fm.author}\n`;
  yaml += `pubDatetime: ${fm.pubDatetime}\n`;
  yaml += `title: ${JSON.stringify(fm.title)}\n`;
  yaml += `slug: ${fm.slug}\n`;
  yaml += `featured: ${fm.featured}\n`;
  yaml += `draft: ${fm.draft}\n`;
  yaml += `tags:\n`;
  for (const tag of fm.tags) {
    yaml += `  - ${tag}\n`;
  }
  yaml += `description: ${JSON.stringify(fm.description)}\n`;
  yaml += "---\n";

  return yaml;
}

/**
 * Fix internal links in content body
 */
function fixLinks(body) {
  let fixed = body;

  // Fix blog links: /blog/slug → /posts/slug
  fixed = fixed.replace(
    /\]\(\/blog\/([^)]+)\)/g,
    "](/posts/$1)"
  );

  // Fix article links: /article/slug → /posts/slug
  fixed = fixed.replace(
    /\]\(\/article\/([^)]+)\)/g,
    "](/posts/$1)"
  );

  // Fix series links like /blog/series/name → /tags/series-name
  fixed = fixed.replace(
    /\]\(\/blog\/series\/([^)]+)\)/g,
    (_, seriesSlug) => {
      return `](/tags/series-${seriesSlug})`;
    }
  );

  // Fix Laravel Octane series link
  fixed = fixed.replace(
    /\]\(\/laravel-octane-series\)/g,
    "](/tags/series-laravel-octane-mastery)"
  );

  // Fix the-laravolt-way links
  fixed = fixed.replace(
    /\]\(\/the-laravolt-way\)/g,
    "](/tags/series-the-laravolt-way)"
  );

  return fixed;
}

/**
 * Process a single MDX file
 */
function processFile(filePath, outputDir) {
  const filename = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  const isDraft = filename.startsWith("_");

  let metadata, body;
  try {
    ({ metadata, body } = parseFrontmatter(content));
  } catch (e) {
    console.error(`  ❌ Failed to parse ${filename}: ${e.message}`);
    return false;
  }

  const newFrontmatter = convertFrontmatter(metadata, filename, isDraft);
  const fixedBody = fixLinks(body);

  // Output filename: strip underscore prefix, change extension to .md
  const outputFilename = filename.replace(/^_/, "").replace(/\.mdx$/, ".md");
  const outputPath = path.join(outputDir, outputFilename);

  fs.writeFileSync(outputPath, newFrontmatter + fixedBody, "utf-8");
  console.log(
    `  ✅ ${filename} → ${outputFilename}${isDraft ? " (draft)" : ""}`
  );
  return true;
}

/**
 * Main migration
 */
function main() {
  console.log("🚀 Blog Migration: blog_old → blog (AstroPaper)\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalMigrated = 0;
  let totalFailed = 0;

  // Migrate content/ posts
  console.log(`📁 Migrating content/ posts...`);
  const contentFiles = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"));
  for (const file of contentFiles) {
    const success = processFile(path.join(CONTENT_DIR, file), OUTPUT_DIR);
    if (success) totalMigrated++;
    else totalFailed++;
  }

  // Migrate content-article/ posts
  console.log(`\n📁 Migrating content-article/ posts...`);
  const articleFiles = fs
    .readdirSync(ARTICLE_DIR)
    .filter((f) => f.endsWith(".mdx"));
  for (const file of articleFiles) {
    const success = processFile(path.join(ARTICLE_DIR, file), OUTPUT_DIR);
    if (success) totalMigrated++;
    else totalFailed++;
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`   Migrated: ${totalMigrated}`);
  console.log(`   Failed:   ${totalFailed}`);
}

main();
