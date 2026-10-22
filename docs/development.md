# Website development

## Setup

Use Node.js 22.18 or newer (the critical-CSS generator requires it), then install the Node and Ruby dependencies:

```sh
npm install
bundle install
```

Start both development processes with `npm run dev`. Use `npm run dev:jekyll` or `npm run dev:svelte` when working on only one side.

## Build pipeline

- `npm run build:svelte` delegates to `svelte-components/` and bundles the product-search UI.
- `npm run build:css` minifies CSS.
- `npm run build:assets` runs both asset tasks in parallel.
- `npm run build:jekyll` renders the production static site.
- `npm run build` runs assets, Jekyll, and critical-CSS generation in sequence. This is Netlify's build command.

## Content authoring

Create regular pages as root-level Markdown files with front matter and posts as dated files in `_posts/`. Reuse an existing layout where possible. Put repeatable structured content in `_data/` and shared markup in `_includes/`; avoid embedding credentials or environment-specific API values in content.

Images and other static files belong under `assets/`. Check responsive image and image-CDN behavior before adding very large assets. Editing `_config.yml` requires restarting Jekyll because it is not reloaded by `jekyll serve`.

### Translations (German and English)

German is the default language and lives at the site root; English lives under `/en/`. The logic is in `_plugins/i18n.rb`, and the languages are listed under `languages:` in `_config.yml`.

- **Pages:** add the English version under `en/` using the same file name, e.g. `en/training.md` for `training.md`. Pages are paired by URL (`/training/` ↔ `/en/training/`). If a page sets a `permalink`, prefix it with `/en`. To pair pages whose URLs don't match, give both the same `ref:` front-matter key.
- **Posts:** English posts go in `_en_posts/` with the same file name as the German post in `_posts/`, so they get the URL `/en/blog/<slug>/`. They automatically show a note that the post was translated with AI. Set `ai_translated: false` once someone has reviewed the translation.
- **UI strings:** templates use `{{ 'key.path' | t }}` with the dictionaries `_data/i18n/de.yml` and `_data/i18n/en.yml`. Add every new key to both files. A missing key logs an `i18n:` warning during the build.
- **Data files:** `{% assign faqs = 'faqs' | localized_data %}` reads `_data/en/faqs.yml` on English pages and `_data/faqs.yml` otherwise. Copies under `_data/en/` exist for menus, FAQs, plans, registration fields, tools, the checklist and the footer gallery. When you change prices, Stripe links or field ids, update both copies.
- **Links:** `{{ '/register/' | localize_url }}` gives `/en/register/` on English pages. Menu and tool links in data files are localized automatically.
- **JavaScript:** `assets/js/common.js` defines `PAGE_LANG`, `PAGE_LOCALE` and `localize({ de, en })`, and Svelte components import the same helpers from `svelte-components/src/i18n.js`.
- **Pagination:** the German blog uses `jekyll-paginate`, the English blog uses `paginate_collection: en_posts` (in `en/blog/index.html`).

### Campaign links

Tag links shared in Discord with Umami UTM parameters so visits can be attributed even when Discord does not pass a referrer. Keep `utm_source=discord` and `utm_medium=community` consistent, and use lowercase values. Give each campaign a descriptive `utm_campaign`; use `utm_content` when distinguishing posts or placements. For example:

```text
https://syndikat.golf/ratings/?utm_source=discord&utm_medium=community&utm_campaign=ratings-share&utm_content=announcements
```

Umami records UTM parameters automatically; no page-tracking code change is needed. Review the **UTM** report in Umami to see the tagged traffic.

For Readybot's automatic blog posts, use the dedicated `/discord-feed.xml` feed. It adds the same Discord campaign tags to article links while leaving the regular `/feed.xml` links canonical for other feed readers. The Discord feed contains only the latest post to avoid replaying the site's full post archive when connecting it.

## API configuration

Browser code currently chooses `http://localhost:8080` for `localhost`/`127.0.0.1` and `https://api.syndikat.golf` otherwise. The Svelte build additionally accepts `API_URL` at build time. The consumed features are:

- bag-tag rankings and ratings;
- official and Metrix tournament lists plus route planning;
- product feed and product-search SSE stream;
- training status, participant listing, signup, and removal.

Browser error reporting uses the Sentry Browser SDK. Set the public Sentry `SENTRY_DSN`
environment variable in the Netlify build settings to enable it; `SENTRY_ENVIRONMENT`
can override the build context used to label events. The DSN is included in the public
bundle and is not a secret. Query strings, request bodies, cookies, headers, UI input,
and console breadcrumbs are removed before events are sent. Production source maps are
published with the bundles so Sentry can display original source locations.

Read the API schemas in [mxlttr/syndikat-api](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml) before changing a request or response assumption.

The `/tournaments/on-tour` response includes Syndikat players from both the starter and waiting lists. Each `our_players` entry includes `waitlisted` (boolean); the website lists starters first and groups waiting-list players in parentheses, e.g. “Person 1, Person 2, (Person 3, Person 4)”.

The API exposes `GET /players/{id}` for a positive GT number. It returns one player (`gtNumber`, `name`, `club`, `tournaments`). Each tournament contains `tournamentId`, `pdgaEventId`, `name`, `series`, `startDate`, `endDate`, and `rounds`. Dates use `YYYY-MM-DD`. Each round contains `roundNumber`, `rating`, `division`, `holes`, and `inRating`. Tournament and round order follow the source. An empty history returns `tournaments: []`. Invalid IDs return 400; upstream or parsing failures return 500. The website does not yet call this endpoint.

Tournament IDs come from the GT and PDGA results links. Both are nullable positive integers; missing, invalid, and placeholder IDs (including PDGA event 0) become `null`. This replaces the earlier flat `player.rounds` response; consumers should read `player.tournaments` and each tournament’s `rounds`.

Player history tolerates omitted club information (`club: ""`) and missing historical hole counts (`holes: null`). Legacy date ranges are normalized to `YYYY-MM-DD`, and tournament IDs also support `german-tour-online.de/events/results/{id}` links.
