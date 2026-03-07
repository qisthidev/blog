import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import { BLOG_PATH } from "@/content.config";
import fs from "node:fs";
import path from "node:path";

export const getStaticPaths: GetStaticPaths = async () => {
    const posts = await getCollection("blog", ({ data }) => !data.draft);
    return posts.map(post => ({
        params: { slug: getPath(post.id, post.filePath, false) },
        props: { post },
    }));
};

export const GET: APIRoute = async ({ props }) => {
    const { post } = props;

    // Read the raw markdown file
    const filePath = post.filePath
        ? path.resolve(post.filePath)
        : path.resolve(BLOG_PATH, `${post.id}.md`);

    let rawContent = "";
    try {
        rawContent = fs.readFileSync(filePath, "utf-8");
    } catch {
        return new Response("Post not found", { status: 404 });
    }

    // Strip frontmatter (everything between the first pair of ---)
    const frontmatterRegex = /^---[\s\S]*?---\n*/;
    const markdownBody = rawContent.replace(frontmatterRegex, "").trim();

    // Build metadata header
    const { title, author, description, pubDatetime, modDatetime, tags } =
        post.data;
    const dateStr = modDatetime
        ? `${pubDatetime.toISOString().split("T")[0]} (updated ${modDatetime.toISOString().split("T")[0]})`
        : pubDatetime.toISOString().split("T")[0];

    const header = [
        `# ${title}`,
        "",
        `- **Author**: ${author}`,
        `- **Date**: ${dateStr}`,
        `- **Tags**: ${tags.join(", ")}`,
        `- **Description**: ${description}`,
        "",
        "---",
        "",
    ].join("\n");

    const fullContent = header + markdownBody + "\n";

    return new Response(fullContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
};
