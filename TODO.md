# Migration TODO

## Pages and routes

- [x] Migrate the Bag Tags Challenge page at `/bagtags/`.
- [x] Migrate the contact form at `/contact/` and its success page at `/success/`.
- [x] Migrate the Disc Dice game at `/disc-dice/`.
- [x] Migrate the club ratings page at `/ratings/`.
- [x] Migrate the club statutes page at `/satzung/`.
- [x] Migrate the blog tag archive at `/tags/`.
- [x] Migrate the training page at `/training/`.
- [x] Migrate the tracking opt-out page at `/tracking-ignore.html`.
- [x] Migrate the tournament map at `/turniere/`.
- [x] Add a custom not found page for `/404.html`.
- [x] Add author profile routes for `/authors/{author}/`; author data covers all seven Jekyll authors.

## URL and content compatibility

- [x] Reconcile post author frontmatter: support both `author` and `authors`, as used by Jekyll content.
- [x] Preserve the ratings page `noindex` metadata.

## Generated files and feeds

- [x] Restore `/feed.xml` (Atom) and `/discord-feed.xml` (the latest post RSS item).
- [x] Generate `/sitemap.xml` for the Astro routes and content.

## Remaining migration parity

### Integrations and shared behavior

- [x] Restore Sentry initialization, including the `SENTRY_DSN` and environment settings, privacy filtering, and the existing `window.Sentry` error reporting calls.
- [x] Restore site search behavior and provide the `/search.json` data endpoint.
- [x] Load and render the “Syndikat On Tour” table, grouped by tournament week.
- [x] Restore theme initialization and the light/dark mode toggle, including saved preference and system theme handling.
- [x] Restore shared script behavior for post image zoom, form value caching, and social click analytics.

### URLs and generated assets

- [x] Add `/robots.txt` with a sitemap reference.
- [x] Restore the 192×192 and 512×512 PWA icons and the Apple touch icon; update the manifest and head links.
- [x] Preserve or redirect the legacy blog pagination URLs `/blog/page2/` through `/blog/page5/` and the case-sensitive `/blog/WT-Bielefeld/` URL.
- [x] Remove the unintended `/blog__/` route.

### Feed parity

- [x] Include full post HTML and thumbnail metadata in `/feed.xml`, matching the Jekyll Atom feed.

## Deployment

- [x] Configure Netlify for the Astro build and publish directory.
- [ ] Set and verify production environment variables on Netlify, including the Sentry DSN and API configuration.
- [x] Add Netlify redirects for legacy URLs that need to remain available.
