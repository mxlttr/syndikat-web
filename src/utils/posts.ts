import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

export const getPostDate = (post: BlogPost): Date | null => {
  const frontmatterDate = post.data.date;

  if (frontmatterDate instanceof Date && !Number.isNaN(frontmatterDate.getTime())) {
    return frontmatterDate;
  }

  const match = post.filePath?.match(/(\d{4}-\d{2}-\d{2})-[^/]+\.mdx?$/);

  return match ? new Date(`${match[1]}T00:00:00Z`) : null;
};

export const getPostUrl = (post: BlogPost): string => {
  return `/blog/${post.id}/`;
};

export const getPostExcerpt = (post: BlogPost, length = 130): string => {
  const source = post.data.excerpt ?? post.data.description ?? post.body ?? "";
  const text = source
    .replace(/^\s*import\s+.*;?\s*$/gm, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > length ? text.slice(0, length).trimEnd() + "…" : text;
};
