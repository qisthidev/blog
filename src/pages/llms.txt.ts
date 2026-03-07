import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPath } from "@/utils/getPath";
import { SITE } from "@/config";

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  const baseUrl = site?.href ?? SITE.website;

  const lines: string[] = [
    `# ${SITE.title}`,
    "",
    `> ${SITE.desc}`,
    "",
    `- Author: ${SITE.author}`,
    `- Website: ${baseUrl}`,
    "",
    "## Blog Posts",
    "",
  ];

  for (const post of sortedPosts) {
    const postPath = getPath(post.id, post.filePath);
    const llmMdUrl = new URL(`${postPath}/llm.md`, baseUrl).href;
    lines.push(`- [${post.data.title}](${llmMdUrl}): ${post.data.description}`);
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
