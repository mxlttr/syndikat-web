# syndikat-web

The Astro-based public website for Syndikat Disc Golf Cologne. It combines Markdown and MDX content with interactive product search, ratings, bag tags, training signup, and tournament tools.

## Architecture

The ratings page requests paginated `/ratings` data. Optional `club`, `division`, and `search` query parameters filter results; `club` accepts comma-separated alternatives. Player details load from `/players/{id}`.

Astro renders pages from `src/pages/` and blog posts from `src/content/blog/` into a static site. Shared layouts, components, and data live in `src/layouts/`, `src/components/`, and `src/data/`. Svelte powers interactive features. See [development](docs/development.md) for content conventions and API configuration.

## Prerequisites

- Node.js 22.22 or newer and npm

## Setup and commands

```sh
npm ci
npx astro dev --background
```

Use `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop` to manage the background development server. For a production build and source checks:

```sh
npm run build
npm run lint
npm run format:check
```

Netlify runs `npm run build` and publishes `dist/`.

When changing a website API call, coordinate the implementation and [API contract](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml) in `mxlttr/syndikat-api`.
