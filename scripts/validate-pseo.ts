import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve("src/data/blog");

// Auto-discover all hub directories under the blog data dir
const PSEO_DIRS = fs.existsSync(BLOG_DIR)
  ? fs.readdirSync(BLOG_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  : [];

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

function validateFile(filePath: string): ValidationResult {
  const content = fs.readFileSync(filePath, "utf-8");
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    errors.push("Missing frontmatter");
    return { file: filePath, errors, warnings };
  }

  const frontmatter = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Check required frontmatter fields
  const requiredFields = ["title", "pubDatetime", "description"];
  for (const field of requiredFields) {
    if (!frontmatter.includes(`${field}:`)) {
      errors.push(`Missing required frontmatter field: ${field}`);
    }
  }

  // Check tags exist
  if (!frontmatter.includes("tags:")) {
    warnings.push("No tags defined");
  }

  // Check FAQs
  const faqMatches = frontmatter.match(/- question:/g);
  const faqCount = faqMatches ? faqMatches.length : 0;
  if (faqCount < 2) {
    errors.push(`FAQs array has ${faqCount} entries (minimum 2 required)`);
  }

  // Word count (body only, excluding frontmatter)
  const wordCount = body
    .replace(/```[\s\S]*?```/g, "") // exclude code blocks from word count
    .replace(/[#*_\-|`>]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // Count code block words separately
  const codeBlockMatches = body.match(/```[\s\S]*?```/g);
  const codeWordCount = codeBlockMatches
    ? codeBlockMatches
        .join(" ")
        .split(/\s+/)
        .filter(w => w.length > 0).length
    : 0;

  const totalWords = wordCount + codeWordCount;

  if (totalWords < 800) {
    errors.push(`Content too short: ${totalWords} words (minimum 800)`);
  }

  // Check for at least 1 code block
  const codeBlocks = body.match(/```/g);
  const codeBlockCount = codeBlocks ? Math.floor(codeBlocks.length / 2) : 0;
  if (codeBlockCount < 1) {
    errors.push("No code blocks found (minimum 1 required)");
  }

  // Check for root cause / explanation section
  const hasExplanation =
    body.includes("## Root Cause") ||
    body.includes("## How It Works") ||
    body.includes("## The Problem") ||
    body.includes("## Explanation");
  if (!hasExplanation) {
    warnings.push("No Root Cause or Explanation section found");
  }

  // Check for FAQ section in body
  if (!body.includes("## Frequently Asked Questions")) {
    warnings.push("No FAQ section found in body");
  }

  // Check title is not too long (SEO: keep under 60 chars ideally)
  const titleMatch = frontmatter.match(/title:\s*"(.+?)"/);
  if (titleMatch && titleMatch[1].length > 70) {
    warnings.push(
      `Title may be too long for SEO: ${titleMatch[1].length} chars (recommended < 70)`
    );
  }

  // Check description length (SEO: 150-160 chars ideal)
  const descMatch = frontmatter.match(/description:\s*"(.+?)"/);
  if (descMatch) {
    if (descMatch[1].length > 160) {
      warnings.push(
        `Description may be truncated in SERPs: ${descMatch[1].length} chars (recommended < 160)`
      );
    }
    if (descMatch[1].length < 80) {
      warnings.push(
        `Description may be too short: ${descMatch[1].length} chars (recommended > 80)`
      );
    }
  }

  return { file: filePath, errors, warnings };
}

function collectMdFiles(dirs: string[]): string[] {
  const files: string[] = [];
  for (const dir of dirs) {
    const fullDir = path.join(BLOG_DIR, dir);
    if (!fs.existsSync(fullDir)) {
      console.warn(`Directory not found: ${fullDir}`);
      continue;
    }
    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(path.join(fullDir, entry));
      }
    }
  }
  return files;
}

function checkDuplicateSlugs(files: string[]): string[] {
  const slugs = new Map<string, string>();
  const dupes: string[] = [];
  for (const file of files) {
    const slug = path.basename(file, ".md");
    if (slugs.has(slug)) {
      dupes.push(`Duplicate slug "${slug}": ${slugs.get(slug)} and ${file}`);
    } else {
      slugs.set(slug, file);
    }
  }
  return dupes;
}

// --- Run ---
console.log("Validating pSEO generated content...\n");

const files = collectMdFiles(PSEO_DIRS);

if (files.length === 0) {
  console.error(
    "No generated files found. Run `npx tsx scripts/generate-pseo.ts --model all` first."
  );
  process.exit(1);
}

console.log(`Found ${files.length} files to validate.\n`);

// Check duplicate slugs
const dupes = checkDuplicateSlugs(files);
if (dupes.length > 0) {
  console.error("DUPLICATE SLUGS:");
  dupes.forEach(d => console.error(`  ✗ ${d}`));
  console.log();
}

// Validate each file
let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
  const result = validateFile(file);
  const relPath = path.relative(process.cwd(), result.file);

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`✓ ${relPath}`);
  } else {
    if (result.errors.length > 0) {
      console.log(`✗ ${relPath}`);
      result.errors.forEach(e => console.log(`    ERROR: ${e}`));
    } else {
      console.log(`~ ${relPath}`);
    }
    result.warnings.forEach(w => console.log(`    WARN:  ${w}`));
  }

  totalErrors += result.errors.length;
  totalWarnings += result.warnings.length;
}

console.log(
  `\nResults: ${files.length} files, ${totalErrors} errors, ${totalWarnings} warnings`
);

if (totalErrors > 0) {
  console.error("\nValidation FAILED — fix errors before publishing.");
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log("\nValidation PASSED with warnings.");
} else {
  console.log("\nValidation PASSED.");
}
