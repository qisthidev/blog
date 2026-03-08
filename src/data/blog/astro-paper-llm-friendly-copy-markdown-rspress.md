---
author: Qisthi Ramadhani
pubDatetime: 2026-03-08T00:00:00.000Z
title: "Adding an LLM-Friendly 'Copy to Markdown' Feature to Astro Paper (Inspired by RSPress)"
featured: true
draft: false
tags:
  - astro
  - web-development
  - frontend
description: "A complete guide to building an RSPress-inspired 'Copy to Markdown' UI and dynamic LLM endpoints in your Astro Paper blog to boost Generative Engine Optimization (GEO)."
ogImage: "../../assets/astro-llm-banner.png"
faqs:
  - question: "Why is HTML text not ideal for copy-pasting to ChatGPT?"
    answer: "Text copied directly from HTML often carries noise like excess whitespace, loses code indentation, and includes navigation elements that confuse the LLM's understanding of the original context."
  - question: "What is the purpose of llms.txt?"
    answer: "Functionally, llms.txt is similar to robots.txt; it guides AI crawlers to discover canonical, structured, and machine-readable markdown data sources on a website."
  - question: "Does Astro Paper support dynamic .md endpoints?"
    answer: "Yes, you can leverage Astro's API Routes and Dynamic Routes features to read .md files via `fs.readFileSync` and serve them back as raw-text endpoints."
---

> **TL;DR:** Transform your Astro Paper blog into an *LLM-ready* resource by adding dynamic `/.md` text endpoints and a split-button `Copy to Markdown` UI component. This approach (inspired by RSPress) guarantees 100% accuracy when readers transfer your blog's content into AI interfaces like Claude and ChatGPT.

![Astro LLM Features Banner](../../assets/astro-llm-banner.png)

The shift from traditional SEO to **GEO (Generative Engine Optimization)** requires us, as developers, to adapt. Today, readers of technical blogs have a new habit: they no longer just stare at the screen; they copy tutorial contents, paste them into ChatGPT or Claude, and ask, *"Can you adapt this script for my Ubuntu environment?"*

Unfortunately, the default browser copy-paste behavior introduces significant technical friction.

## The Conventional Copy-Paste Problem: HTML vs. Markdown

When we highlight text on a browser interface (HTML) to copy it, we aren't just copying text. We often inadvertently copy messy DOM hierarchies, lose indentation spaces in code blocks, and accidentally include UI elements (breadcrumbs, footers) directly into the AI's prompt box.

Prompt engineering research shows that this phenomenon burdens the model. The more noise or irrelevant elements present in the prompt, the higher the potential for **LLM hallucinations**. Markdown, on the other hand, is widely recognized as the "native language" that LLMs understand highly efficiently.

| Comparison Aspect | Copy via HTML Selection (*Bad Practice*) | Raw Markdown Extraction (*Best Practice*) |
| :--- | :--- | :--- |
| **Token Load** | Massive (HTML bloat, empty spaces) | Highly efficient and lightweight |
| **Logical Hierarchy** | Lost (relies strictly on CSS rendering) | Extremely precise (`#`, `##`, `*`) |
| **Code Integrity** | Frequently loses indentation (*tabs/spaces*) | Identical to the original source code (` ``` `) |
| **Contextual Accuracy** | Prone to distraction by navigation text | 100% focused on the tutorial body content |

The optimal solution is to emulate the innovation introduced by **RSPress**: providing a dedicated button that downloads the raw Markdown document and directly loads the pristine configuration into the user's clipboard.

## Implementing the `llm.md` Endpoint in Astro

We are currently using the **Astro Paper** template. The first step is to create a dynamic API endpoint in Astro that automatically returns the pure Markdown version of every post.

Create a new file at `src/pages/blog/[...slug]/llm.md.ts`:

```typescript
import { getCollection } from "astro:content";
import fs from "fs";
import path from "path";
import { BLOG_PATH } from "@/content.config";

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export async function GET({ props }) {
  const { post } = props;
  const filePath = path.join(process.cwd(), BLOG_PATH, `${post.id}.md`);
  const fileContent = fs.readFileSync(filePath, "utf-8");

  // Regex to strip YAML Frontmatter (cleaner for LLMs)
  const markdownContent = fileContent.replace(/^---[\s\S]+?---\n*/, "");

  const header = `> Technical blog by Qisthi Ramadhani\n\n# ${post.data.title}\n\n`;

  return new Response(header + markdownContent, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

The script above statically builds endpoints for all blog pages (thanks to `getStaticPaths`), strips away the unnecessary frontmatter using a Regex, adds simple metadata, and serves the response with a `Content-Type: text/markdown` header.

## Building the UI: The `LlmActions.astro` Component

Once the endpoint is available, the next task is to create a sleek RSPress-style split-button UI using Tailwind CSS and a bit of Alpine-style inline Javascript.

Create `src/components/LlmActions.astro` and import it into your `PostDetails.astro` layout. Here is a simplified wireframe of the code:

```astro
---
interface Props {
  llmMdUrl: string; // example prop passed: /blog/slug/llm.md
}
const { llmMdUrl } = Astro.props;
---

<div class="flex flex-col items-center gap-1">
  <span class="italic">LLM-friendly version:</span>
  <div class="flex gap-2">
    <!-- Button 1: Main Action (Copy to Clipboard) -->
    <button id="llm-copy-md" data-llm-url={llmMdUrl}>
       <span>Copy Markdown</span>
    </button>

    <!-- Button 2: Dropdown Trigger for ChatGPT & Claude -->
    <!-- (Use SVG and Tailwind Dropdown states here) -->
  </div>
</div>

<script is:inline>
  document.getElementById("llm-copy-md").addEventListener("click", async function() {
    const url = this.getAttribute("data-llm-url");
    const doc = await (await fetch(url)).text();
    await navigator.clipboard.writeText(doc); // Write to OS clipboard
    alert("Markdown copied for LLM!");
  });
</script>
```

> **Pro Tip:** Leverage `URLSearchParams` to directly open AI assistants with prompt context. You can structure links like `https://chatgpt.com/?hints=search&q=Read+URL+and+Summarize` inside your dropdown menu options.

## Conclusion

Transitioning from a purely visual era (HTML+CSS) towards providing machine-friendly contextual data (Markdown) marks the evolution of modern platforms. By adding the **Copy to Markdown** feature, an Astro-based blog can secure a top spot in the GEO ecosystem food chain, delivering extreme value for technical readers heavily reliant on AI assistants.
