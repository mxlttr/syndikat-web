# Website development

## Setup

Use Node.js 22.22 or newer, then install the dependencies:

```sh
npm ci
```

Start the Astro development server with `npx astro dev --background`. Use `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop` to manage it.

## Build pipeline

- `npm run build` renders the production Astro site.
- `npm run lint` checks source files with ESLint.
- `npm run format:check` checks formatting with Prettier.

## Content authoring

Create pages under `src/pages/` and blog posts under `src/content/blog/`. Reuse an existing layout where possible. Put repeatable structured content in `src/data/` and shared markup in `src/components/`; avoid embedding credentials or environment-specific API values in content.

Processed images belong under `src/assets/`; unchanged public files belong under `public/`. Check responsive image behavior before adding very large assets.

### Campaign links

Tag links shared in Discord with Umami UTM parameters so visits can be attributed even when Discord does not pass a referrer. Keep `utm_source=discord` and `utm_medium=community` consistent, and use lowercase values. Give each campaign a descriptive `utm_campaign`; use `utm_content` when distinguishing posts or placements. For example:

```text
https://syndikat.golf/ratings/?utm_source=discord&utm_medium=community&utm_campaign=ratings-share&utm_content=announcements
```

Umami records UTM parameters automatically; no page-tracking code change is needed. Review the **UTM** report in Umami to see the tagged traffic.

For Readybot's automatic blog posts, use the dedicated `/discord-feed.xml` feed. It adds the same Discord campaign tags to article links while leaving the regular `/feed.xml` links canonical for other feed readers. The Discord feed contains only the latest post to avoid replaying the site's full post archive when connecting it.

## API configuration

Browser code chooses `http://localhost:8080` for `localhost`/`127.0.0.1` and `https://api.syndikat.golf` otherwise. Set `PUBLIC_API_URL` at build time to override this. The consumed features are:

- bag-tag rankings and ratings;
- official and Metrix tournament lists plus route planning;
- product feed and product-search SSE stream;
- training status, participant listing, signup, and removal.

The product feed caches complete Shopify results, including an empty list, for the
API's configured cache lifetime (8 hours with `CACHE_EXPIRY=28800`). Failed refreshes
back off from 15 minutes up to 8 hours and may serve the last complete result.
If every store fails and no prior complete result is available, the API returns
HTTP 503; the browser omits the new-products section and leaves product search
available.

Browser error reporting uses the Sentry Browser SDK. Set `SENTRY_DSN` in the
Netlify build settings to enable it; `SENTRY_ENVIRONMENT` can label events. The DSN is included in the public bundle and
is not a secret. Query strings, request bodies, cookies, headers, UI input, and
console breadcrumbs are removed before events are sent.

Read the API schemas in [mxlttr/syndikat-api](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml) before changing a request or response assumption.

The `/tournaments/on-tour` response includes Syndikat players from both the starter and waiting lists. Each `our_players` entry includes `waitlisted` (boolean); the website lists starters first and groups waiting-list players in parentheses, e.g. “Person 1, Person 2, (Person 3, Person 4)”.

The API exposes `GET /players/{id}` for a positive GT number. It returns one player (`gtNumber`, `name`, `club`, `tournaments`). Each tournament contains `tournamentId`, `pdgaEventId`, `name`, `series`, `startDate`, `endDate`, and `rounds`. Dates use `YYYY-MM-DD`. Each round contains `roundNumber`, `rating`, `division`, `holes`, and `inRating`. Tournament and round order follow the source. An empty history returns `tournaments: []`. Invalid IDs return 400; upstream or parsing failures return 500. The ratings page calls this endpoint when a visitor opens an individual player by click or keyboard. After a successful response, the browser emits `player_loaded` with `gt_number` in the current page and visitor context. It also emits `ratings_loaded` once after the initial ratings list request succeeds, with `resultCount` set to the total filtered results. The existing `ratings_player_open` event records the opening action, including attempts that fail to load. The API endpoint itself emits no player analytics, so requests from other services are not counted as website engagement.

The product search browser emits `product_search` when it starts a stream, `product_search_completed` when the stream ends with the total result count, and `product_search_no_results` when that count is zero. Product click tracking stays on the API redirect endpoint.

Tournament IDs come from the GT and PDGA results links. Both are nullable positive integers; missing, invalid, and placeholder IDs (including PDGA event 0) become `null`. This replaces the earlier flat `player.rounds` response; consumers should read `player.tournaments` and each tournament’s `rounds`.

Player history tolerates omitted club information (`club: ""`) and missing historical hole counts (`holes: null`). Legacy date ranges are normalized to `YYYY-MM-DD`, and tournament IDs also support `german-tour-online.de/events/results/{id}` links.
