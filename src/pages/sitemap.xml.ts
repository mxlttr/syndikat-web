import { getCollection } from "astro:content";
import { site } from "../data/consts";
import { getPostDate, getPostUrl } from "../utils/posts";

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

export async function GET() {
  const [posts, authors] = await Promise.all([getCollection("blog"), getCollection("authors")]);
  const urls = new Map<string, Date | undefined>();

  const pageFiles = Object.keys(import.meta.glob("/src/pages/**/*.{astro,md,mdx}", { eager: false }));

  for (const file of pageFiles) {
    let route = file
      .replace(/^\/src\/pages\//, "")
      .replace(/\.(?:astro|md|mdx)$/, "")
      .replace(/__$/, "");

    if (route.includes("[") || route === "404" || route === "success") continue;
    if (route === "index") route = "";
    urls.set(route ? `/${route}/` : "/", undefined);
  }

  for (const post of posts) {
    const date = getPostDate(post) ?? undefined;
    urls.set(getPostUrl(post), date);
  }

  for (const author of authors) {
    urls.set(author.data.url, undefined);
  }

  urls.set("/blog/", undefined);
  urls.set("/tracking-ignore.html", undefined);

  const pageSize = 6;
  const pageCount = Math.ceil(posts.length / pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    urls.set(`/blog/${page}/`, undefined);
  }

  const entries = [...urls.entries()]
    .map(([path, lastModified]) => {
      const lastmod = lastModified ? `<lastmod>${lastModified.toISOString()}</lastmod>` : "";
      return `<url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmod}</url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
