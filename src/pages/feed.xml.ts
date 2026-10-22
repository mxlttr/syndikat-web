import { getCollection } from "astro:content";
import { experimental_AstroContainer } from "astro/container";
import FeedPostContent from "../components/FeedPostContent.astro";
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

const absoluteUrl = (path: string) => new URL(path, site.url).href;
const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const stripHydrationArtifacts = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<astro-island\b[^>]*>/gi, "")
    .replace(/<\/astro-island>/gi, "");

export async function GET() {
  const [allPosts, authors] = await Promise.all([getCollection("blog"), getCollection("authors")]);
  const authorNames = new Map(authors.map((author) => [author.id, author.data.name]));
  const posts = allPosts
    .sort((a, b) => (getPostDate(b)?.getTime() ?? 0) - (getPostDate(a)?.getTime() ?? 0))
    .slice(0, 10);
  const latestDate = posts[0] ? (getPostDate(posts[0]) ?? new Date(0)) : new Date(0);
  const container = await experimental_AstroContainer.create();

  const entryMarkup: string[] = [];
  for (const post of posts) {
    const postDate = getPostDate(post) ?? latestDate;
    const postUrl = absoluteUrl(getPostUrl(post));
    const authorId = post.data.author ?? post.data.authors[0];
    const authorName = authorId ? authorNames.get(authorId) : undefined;
    const categories = (post.data.tags?.split(/\s+/).filter(Boolean) ?? [])
      .map((tag) => `<category term="${escapeXml(tag)}" />`)
      .join("");
    const renderedContent = stripHydrationArtifacts(
      await container.renderToString(FeedPostContent, { props: { post } }),
    );
    const summary = post.data.excerpt ?? post.data.description ?? getPostExcerpt(post, 500);
    const mediaUrl = post.data.image?.src ? absoluteUrl(post.data.image.src) : null;

    entryMarkup.push(`<entry>
  <title type="html">${escapeXml(post.data.title)}</title>
  <link href="${escapeXml(postUrl)}" rel="alternate" type="text/html" title="${escapeXml(post.data.title)}" />
  <published>${postDate.toISOString()}</published>
  <updated>${postDate.toISOString()}</updated>
  <id>${escapeXml(postUrl.replace(/\/$/, ""))}</id>
  <content type="html" xml:base="${escapeXml(postUrl)}">${cdata(renderedContent)}</content>
  <summary type="html">${cdata(`<p>${escapeXml(summary)}</p>`)}</summary>
  ${authorName ? `<author><name>${escapeXml(authorName)}</name></author>` : ""}
  ${categories}
  ${
    mediaUrl
      ? `
  <media:thumbnail url="${escapeXml(mediaUrl)}" />
  <media:content medium="image" url="${escapeXml(mediaUrl)}" />`
      : ""
  }
</entry>`);
  }
  const entries = entryMarkup.join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <generator uri="https://astro.build/">Astro</generator>
  <link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(absoluteUrl("/"))}" rel="alternate" type="text/html" />
  <updated>${latestDate.toISOString()}</updated>
  <id>${escapeXml(absoluteUrl("/feed.xml"))}</id>
  <title type="html">${escapeXml(site.title)}</title>
  <subtitle>${escapeXml(site.description.trim())}</subtitle>
  ${entries}
</feed>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
