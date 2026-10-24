import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const authors = defineCollection({
  loader: glob({
    pattern: "**/*.json",
    base: "./src/content/authors",
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      url: z.string(),
      image: image().optional(),
      twitter: z.string().optional(),
      same_as: z.array(z.string().url()).default([]),
      bio: z.string().optional(),
    }),
});

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blog",
    generateId: ({ entry }) =>
      entry
        .replace(/\.md$/, "")
        .replace(/\.mdx$/, "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .toLowerCase(),
  }),
  schema: ({ image }) =>
    z.object({
      date: z.coerce.date().optional(),
      title: z.string(),
      image: image(),
      video: z.string().optional(),
      authors: z.array(z.string()).default([]),
      author: z.string().optional(),
      tags: z.string().optional(),
      description: z.string().optional(),
      excerpt: z.string().optional(),
    }),
});

export const collections = { blog, authors };
