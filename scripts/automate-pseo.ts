import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type {
  ErrorGuide,
  PerformanceGuide,
  PSEODataset,
  CodeExample,
  FAQ,
} from "../src/data/pseo/schema";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

const query = getArg("query");
const modelType = getArg("model") as "errors" | "performance" | undefined;
const hubSlug = getArg("hub");
const newHub = getArg("new-hub");
const hubTitle = getArg("hub-title");
const hubTags = getArg("hub-tags");
const batchFile = getArg("batch");
const dryRun = args.includes("--dry-run");
const noGenerate = args.includes("--no-generate");

if (!modelType || !["errors", "performance"].includes(modelType)) {
  console.error("Error: --model=errors|performance is required");
  process.exit(1);
}

if (!hubSlug && !newHub) {
  console.error("Error: --hub=<slug> or --new-hub=<slug> is required");
  process.exit(1);
}

if (newHub && (!hubTitle || !hubTags)) {
  console.error(
    "Error: --new-hub requires --hub-title and --hub-tags"
  );
  process.exit(1);
}

if (!query && !batchFile) {
  console.error("Error: --query=<topic> or --batch=<file> is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function loadEnvFile(): void {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PROVIDER = process.env.PSEO_PROVIDER as
  | "anthropic"
  | "openai"
  | "gemini"
  | undefined;
const API_KEY = process.env.PSEO_API_KEY;
const MODEL_OVERRIDE = process.env.PSEO_MODEL;

if (!PROVIDER || !["anthropic", "openai", "gemini"].includes(PROVIDER)) {
  console.error(
    "Error: PSEO_PROVIDER env var must be anthropic|openai|gemini"
  );
  process.exit(1);
}
if (!API_KEY) {
  console.error("Error: PSEO_API_KEY env var is required");
  process.exit(1);
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

const model = MODEL_OVERRIDE || DEFAULT_MODELS[PROVIDER];

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const PSEO_DIR = path.resolve("src/data/pseo");

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  type: "errors" | "performance",
  hubTagsList: string[]
): string {
  const errorSchema = `interface CodeExample {
  before: string;  // realistic code showing the problem, with comments
  after: string;   // fixed code with comments explaining each change
  language: string; // e.g. "php", "go", "sql", "typescript"
}

interface FAQ {
  question: string; // specific, search-engine friendly question
  answer: string;   // 50+ word detailed answer
}

interface ErrorGuide {
  error_message: string;  // descriptive title of the error/issue
  framework: string;      // e.g. "laravel", "go", "react"
  slug: string;           // kebab-case, technology-prefixed
  root_cause: string;     // 3+ sentences explaining WHY this happens
  symptoms: string[];     // 5+ observable signs of this issue
  fix_steps: string[];    // 6+ ordered steps to resolve
  example_code: CodeExample;
  related_topics: string[]; // tags for categorization
  faqs: FAQ[];            // 2+ frequently asked questions
  difficulty: "beginner" | "intermediate" | "advanced";
}`;

  const perfSchema = `interface CodeExample {
  before: string;  // code showing the problem state, with comments
  after: string;   // optimized code with comments explaining changes
  language: string; // e.g. "sql", "php", "go", "typescript"
}

interface FAQ {
  question: string; // specific, search-engine friendly question
  answer: string;   // 50+ word detailed answer
}

interface PerformanceGuide {
  technology: string;      // e.g. "postgresql", "redis", "go"
  topic: string;           // kebab-case topic identifier
  slug: string;            // kebab-case, technology-prefixed
  explanation: string;     // 3+ sentences explaining the concept/technique
  problem_scenario: string; // realistic production scenario (3+ sentences)
  solution_code: CodeExample;
  performance_impact: string; // one-sentence summary of improvement
  metrics: { metric: string; before: string; after: string }[]; // 4+ metrics
  related_articles: string[]; // tags for categorization
  faqs: FAQ[];             // 2+ frequently asked questions
}`;

  const schema = type === "errors" ? errorSchema : perfSchema;
  const entryType = type === "errors" ? "ErrorGuide" : "PerformanceGuide";

  return `You are a senior software engineer writing structured technical content for a developer blog.

Your task: generate a single JSON object matching the ${entryType} TypeScript interface below.

## Schema

\`\`\`typescript
${schema}
\`\`\`

## Quality Requirements

1. **root_cause / explanation**: Must be 3+ sentences. Be specific about WHY the issue occurs, referencing internals, architecture, or protocol details.
2. **symptoms**: Must have 5+ items. Each should be a concrete, observable sign (error messages, performance degradation, log entries).
3. **fix_steps**: Must have 6+ items. Ordered, actionable steps. Each step should be a complete sentence explaining what to do and why.
4. **Code examples**: Must be realistic, production-quality code with inline comments. Before code shows the problem clearly. After code shows the complete fix. Use proper escaping for JSON strings (\\n for newlines, \\\\ for backslashes, \\" for quotes within strings).
5. **FAQs**: Must have 2+ entries. Questions should be what developers actually search for. Answers must be 50+ words each.
6. **slug**: Must be kebab-case and prefixed with the technology/framework name (e.g., "laravel-race-condition-cache-lock", "postgresql-slow-query-debugging").
7. **related_topics / related_articles**: Must include these hub tags: ${JSON.stringify(hubTagsList)}
${type === "performance" ? "8. **metrics**: Must have 4+ entries with realistic before/after measurements." : ""}

## Important

- Return ONLY the raw JSON object. No markdown fences, no explanation text.
- The JSON must be valid and parseable.
- All string values must be properly escaped for JSON.
- Code in before/after fields uses \\n for newlines.
- Be technically accurate and specific — avoid vague generalities.`;
}

function buildUserPrompt(topicQuery: string, type: "errors" | "performance"): string {
  const entryType = type === "errors" ? "ErrorGuide" : "PerformanceGuide";
  return `Generate a ${entryType} JSON object for this topic:\n\n${topicQuery}\n\nReturn ONLY the JSON object, nothing else.`;
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;

    const status = res.status;
    if ((status === 429 || status === 503) && attempt < retries) {
      console.warn(`  Rate limited (${status}), retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }

    const body = await res.text();
    throw new Error(`API error ${status}: ${body}`);
  }
  throw new Error("Unreachable");
}

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }
  );
  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  const textBlock = data.content.find(b => b.type === "text");
  if (!textBlock) throw new Error("No text block in Anthropic response");
  return textBlock.text;
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }
  );
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });
  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  return data.candidates[0].content.parts[0].text;
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  switch (PROVIDER) {
    case "anthropic":
      return callAnthropic(systemPrompt, userPrompt);
    case "openai":
      return callOpenAI(systemPrompt, userPrompt);
    case "gemini":
      return callGemini(systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${PROVIDER}`);
  }
}

// ---------------------------------------------------------------------------
// JSON extraction & validation
// ---------------------------------------------------------------------------
function extractJSON(raw: string): string {
  // Try parsing directly first
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;

  // Extract from markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Last resort: find first { to last }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Could not extract JSON from LLM response");
}

function validateErrorGuide(obj: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const requiredStrings = [
    "error_message",
    "framework",
    "slug",
    "root_cause",
  ];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || !(obj[field] as string).trim()) {
      missing.push(`${field} (string, required)`);
    }
  }

  if (!Array.isArray(obj.symptoms) || obj.symptoms.length < 5) {
    missing.push("symptoms (array, min 5 items)");
  }
  if (!Array.isArray(obj.fix_steps) || obj.fix_steps.length < 6) {
    missing.push("fix_steps (array, min 6 items)");
  }
  if (!Array.isArray(obj.faqs) || obj.faqs.length < 2) {
    missing.push("faqs (array, min 2 items)");
  }
  if (
    !obj.example_code ||
    typeof obj.example_code !== "object" ||
    typeof (obj.example_code as CodeExample).before !== "string" ||
    typeof (obj.example_code as CodeExample).after !== "string" ||
    typeof (obj.example_code as CodeExample).language !== "string"
  ) {
    missing.push("example_code (CodeExample object)");
  }
  if (!Array.isArray(obj.related_topics)) {
    missing.push("related_topics (array)");
  }
  if (!["beginner", "intermediate", "advanced"].includes(obj.difficulty as string)) {
    missing.push('difficulty ("beginner" | "intermediate" | "advanced")');
  }

  // Validate FAQ answer lengths
  if (Array.isArray(obj.faqs)) {
    for (let i = 0; i < (obj.faqs as FAQ[]).length; i++) {
      const faq = (obj.faqs as FAQ[])[i];
      if (!faq.question || !faq.answer) {
        missing.push(`faqs[${i}] missing question or answer`);
      } else if (faq.answer.split(/\s+/).length < 50) {
        missing.push(
          `faqs[${i}].answer too short (${faq.answer.split(/\s+/).length} words, min 50)`
        );
      }
    }
  }

  // Validate root_cause length
  if (typeof obj.root_cause === "string") {
    const sentences = obj.root_cause.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 3) {
      missing.push(`root_cause too short (${sentences.length} sentences, min 3)`);
    }
  }

  return missing;
}

function validatePerformanceGuide(obj: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const requiredStrings = [
    "technology",
    "topic",
    "slug",
    "explanation",
    "problem_scenario",
    "performance_impact",
  ];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || !(obj[field] as string).trim()) {
      missing.push(`${field} (string, required)`);
    }
  }

  if (
    !obj.solution_code ||
    typeof obj.solution_code !== "object" ||
    typeof (obj.solution_code as CodeExample).before !== "string" ||
    typeof (obj.solution_code as CodeExample).after !== "string" ||
    typeof (obj.solution_code as CodeExample).language !== "string"
  ) {
    missing.push("solution_code (CodeExample object)");
  }
  if (!Array.isArray(obj.metrics) || obj.metrics.length < 4) {
    missing.push("metrics (array, min 4 items)");
  }
  if (!Array.isArray(obj.related_articles)) {
    missing.push("related_articles (array)");
  }
  if (!Array.isArray(obj.faqs) || obj.faqs.length < 2) {
    missing.push("faqs (array, min 2 items)");
  }

  // Validate FAQ answer lengths
  if (Array.isArray(obj.faqs)) {
    for (let i = 0; i < (obj.faqs as FAQ[]).length; i++) {
      const faq = (obj.faqs as FAQ[])[i];
      if (!faq.question || !faq.answer) {
        missing.push(`faqs[${i}] missing question or answer`);
      } else if (faq.answer.split(/\s+/).length < 50) {
        missing.push(
          `faqs[${i}].answer too short (${faq.answer.split(/\s+/).length} words, min 50)`
        );
      }
    }
  }

  // Validate explanation length
  if (typeof obj.explanation === "string") {
    const sentences = obj.explanation.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 3) {
      missing.push(`explanation too short (${sentences.length} sentences, min 3)`);
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Dataset mutation
// ---------------------------------------------------------------------------
function getDatasetPath(hub: string): string {
  // Find existing dataset file that matches the hub
  const files = fs.readdirSync(PSEO_DIR).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(PSEO_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (data.hub === hub) return filePath;
  }
  // For new hubs, use the model type as filename, but avoid conflicts
  const baseName = `${hub}.json`;
  return path.join(PSEO_DIR, baseName);
}

function createNewDataset(
  type: "errors" | "performance",
  hub: string,
  title: string,
  tags: string[]
): PSEODataset<ErrorGuide | PerformanceGuide> {
  return {
    model: type,
    hub,
    hub_title: title,
    hub_description: `Comprehensive guide covering ${title.toLowerCase()} — production-tested techniques, real code examples, and performance benchmarks.`,
    hub_tags: tags,
    entries: [],
  };
}

function appendEntry(
  datasetPath: string,
  entry: ErrorGuide | PerformanceGuide
): void {
  // Read existing, write to temp, then replace
  const raw = fs.readFileSync(datasetPath, "utf-8");
  const dataset: PSEODataset<ErrorGuide | PerformanceGuide> = JSON.parse(raw);

  // Check for duplicate slug
  const slug =
    "slug" in entry ? (entry as ErrorGuide | PerformanceGuide).slug : "";
  const existing = dataset.entries.find((e: ErrorGuide | PerformanceGuide) => {
    if ("slug" in e) return e.slug === slug;
    return false;
  });
  if (existing) {
    console.warn(`  Warning: slug "${slug}" already exists in dataset, skipping`);
    return;
  }

  dataset.entries.push(entry);

  const tmpPath = datasetPath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(dataset, null, 2) + "\n", "utf-8");
  fs.renameSync(tmpPath, datasetPath);
}

// ---------------------------------------------------------------------------
// Pipeline execution
// ---------------------------------------------------------------------------
function runPipeline(): void {
  console.log("\nRunning generate-pseo.ts...");
  try {
    execSync("npx tsx scripts/generate-pseo.ts --model all", {
      stdio: "inherit",
      cwd: path.resolve("."),
    });
  } catch {
    console.error("generate-pseo.ts failed");
    process.exit(1);
  }

  console.log("\nRunning validate-pseo.ts...");
  try {
    execSync("npx tsx scripts/validate-pseo.ts", {
      stdio: "inherit",
      cwd: path.resolve("."),
    });
  } catch {
    console.error("validate-pseo.ts failed (see errors above)");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function processQuery(
  topicQuery: string,
  type: "errors" | "performance",
  targetHub: string,
  hubTagsList: string[]
): Promise<ErrorGuide | PerformanceGuide | null> {
  console.log(`\nGenerating ${type} entry for: "${topicQuery}"`);
  console.log(`  Provider: ${PROVIDER} (${model})`);

  const systemPrompt = buildSystemPrompt(type, hubTagsList);
  const userPrompt = buildUserPrompt(topicQuery, type);

  let rawResponse: string;
  try {
    rawResponse = await callLLM(systemPrompt, userPrompt);
  } catch (err) {
    console.error(`  LLM API call failed: ${(err as Error).message}`);
    return null;
  }

  let jsonStr: string;
  try {
    jsonStr = extractJSON(rawResponse);
  } catch (err) {
    console.error(`  JSON extraction failed: ${(err as Error).message}`);
    console.error("  Raw response (first 500 chars):", rawResponse.slice(0, 500));
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error(`  JSON parse failed: ${(err as Error).message}`);
    console.error("  Extracted JSON (first 500 chars):", jsonStr.slice(0, 500));
    return null;
  }

  // Validate
  const issues =
    type === "errors"
      ? validateErrorGuide(parsed)
      : validatePerformanceGuide(parsed);

  if (issues.length > 0) {
    console.error("  Schema validation issues:");
    issues.forEach(i => console.error(`    - ${i}`));
    console.error("  Proceeding with available data (may fail downstream validation)");
  }

  if (dryRun) {
    console.log("\n  [DRY RUN] Generated JSON:");
    console.log(JSON.stringify(parsed, null, 2));
    return parsed as ErrorGuide | PerformanceGuide;
  }

  // Append to dataset
  const datasetPath = getDatasetPath(targetHub);
  console.log(`  Appending to: ${datasetPath}`);
  appendEntry(datasetPath, parsed as ErrorGuide | PerformanceGuide);

  const slug = (parsed as { slug?: string }).slug ?? "unknown";
  console.log(`  Added entry: ${slug}`);

  return parsed as ErrorGuide | PerformanceGuide;
}

async function main(): Promise<void> {
  const targetHub = newHub || hubSlug!;

  // Resolve hub tags
  let hubTagsList: string[];

  if (newHub) {
    // Create new hub dataset
    hubTagsList = hubTags!.split(",").map(t => t.trim());
    const datasetPath = path.join(PSEO_DIR, `${newHub}.json`);

    if (fs.existsSync(datasetPath)) {
      console.error(`Error: dataset file already exists: ${datasetPath}`);
      process.exit(1);
    }

    if (!dryRun) {
      const dataset = createNewDataset(
        modelType!,
        newHub,
        hubTitle!,
        hubTagsList
      );
      fs.writeFileSync(
        datasetPath,
        JSON.stringify(dataset, null, 2) + "\n",
        "utf-8"
      );
      console.log(`Created new hub dataset: ${datasetPath}`);
    } else {
      console.log(`[DRY RUN] Would create hub dataset: ${datasetPath}`);
    }
  } else {
    // Read existing hub tags
    const datasetPath = getDatasetPath(targetHub);
    if (!fs.existsSync(datasetPath)) {
      console.error(`Error: no dataset found for hub "${targetHub}"`);
      console.error(
        "  Use --new-hub to create a new hub, or check the hub slug"
      );
      process.exit(1);
    }
    const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
    hubTagsList = dataset.hub_tags;
  }

  // Collect queries
  let queries: string[];
  if (batchFile) {
    const batchPath = path.resolve(batchFile);
    if (!fs.existsSync(batchPath)) {
      console.error(`Error: batch file not found: ${batchPath}`);
      process.exit(1);
    }
    queries = fs
      .readFileSync(batchPath, "utf-8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));
    console.log(`Loaded ${queries.length} queries from ${batchFile}`);
  } else {
    queries = [query!];
  }

  // Process each query
  let successCount = 0;
  let failCount = 0;

  for (const q of queries) {
    const result = await processQuery(q, modelType!, targetHub, hubTagsList);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`  Queries processed: ${queries.length}`);
  console.log(`  Successful: ${successCount}`);
  if (failCount > 0) console.log(`  Failed: ${failCount}`);

  // Run pipeline unless dry-run or --no-generate
  if (!dryRun && !noGenerate && successCount > 0) {
    runPipeline();
  } else if (dryRun) {
    console.log("\n[DRY RUN] Skipped generate and validate steps");
  } else if (noGenerate) {
    console.log("\n[--no-generate] Skipped generate and validate steps");
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
