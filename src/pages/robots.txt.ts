import type { APIRoute } from "astro";
import { site } from "../data/consts";

export const GET: APIRoute = () => {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site.url).href}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
