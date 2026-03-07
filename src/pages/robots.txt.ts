import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL, llmsTxtURL: URL) => `
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
LLMs-Txt: ${llmsTxtURL.href}

User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  const llmsTxtURL = new URL("llms.txt", site);
  return new Response(getRobotsTxt(sitemapURL, llmsTxtURL));
};
