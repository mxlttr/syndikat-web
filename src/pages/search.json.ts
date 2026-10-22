import { getCollection } from "astro:content";
import { getPostDate, getPostExcerpt, getPostUrl } from "../utils/posts";

const pageSources = import.meta.glob<string>("./**/*.{md,mdx}", {
  eager: true,
  query: "?raw",
  import: "default",
});

function searchableText(value: string): string {
  return value
    .replace(/^\s*import\s+.*;?\s*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFrontmatterValue(frontmatter: string, key: string): string {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function pagePath(sourcePath: string): string {
  const route = sourcePath
    .replace(/^\.\//, "")
    .replace(/\.(md|mdx)$/, "")
    .replace(/\/index$/, "");
  return route ? `/${route}/` : "/";
}

export async function GET() {
  const posts = await getCollection("blog");
  const postResults = posts
    .map((post) => ({
      title: post.data.title,
      url: getPostUrl(post),
      date: getPostDate(post)?.toISOString() ?? "",
      tags: post.data.tags?.split(/\s+/).filter(Boolean) ?? [],
      excerpt: getPostExcerpt(post, 180),
      content: searchableText(post.body ?? ""),
      image: post.data.image.src,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const pageResults = Object.entries(pageSources).flatMap(([sourcePath, source]) => {
    const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match) return [];
    const title = getFrontmatterValue(match[1], "title");
    const route = pagePath(sourcePath);
    if (!title || route === "/success/" || route === "/404/") return [];
    const content = searchableText(source.slice(match[0].length));
    return [
      {
        title,
        url: route,
        date: "",
        tags: [],
        excerpt: getFrontmatterValue(match[1], "description") || content.slice(0, 180),
        content,
        image: "",
      },
    ];
  });

  return new Response(JSON.stringify([...postResults, ...pageResults]), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
