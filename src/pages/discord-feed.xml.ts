import { getCollection } from "astro:content";
import { site } from "../data/consts";
import { getPostDate, getPostExcerpt, getPostUrl } from "../utils/posts";

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });

export async function GET() {
  const posts = await getCollection("blog");
  const latestPost = posts.sort((a, b) => (getPostDate(b)?.getTime() ?? 0) - (getPostDate(a)?.getTime() ?? 0))[0];
  const latestDate = latestPost ? (getPostDate(latestPost) ?? new Date(0)) : new Date(0);
  const channelItem = latestPost
    ? `<item>
      <title>${escapeXml(latestPost.data.title)}</title>
      <link>${escapeXml(`${site.url}${getPostUrl(latestPost)}?utm_source=discord&utm_medium=community&utm_campaign=blog&utm_content=${encodeURIComponent(latestPost.id)}`)}</link>
      <guid isPermaLink="false">${escapeXml(`${site.url}${getPostUrl(latestPost)}`)}</guid>
      <pubDate>${latestDate.toUTCString()}</pubDate>
      <description>${escapeXml(getPostExcerpt(latestPost, 500))}</description>
    </item>`
    : "";

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${site.title} — Discord blog feed`)}</title>
    <link>${escapeXml(site.url)}</link>
    <description>${escapeXml(site.description.trim())}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${channelItem}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
