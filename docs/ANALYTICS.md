# Analytics (PostHog)

One PostHog project (US cloud, project **666931**) collects the hub and every IsDead app. The contract is the hub's
`yourappisdead/ANALYTICS.md`; this file is how LoomIsDead follows it.
The web side is the homepage (every CTA downloads the Mac installer) and the public share pages `/v/<id>` for recordings uploaded from the Mac app. The Mac app in `mac/` has its own Swift analytics and is not covered here.

## Setup
- `NEXT_PUBLIC_POSTHOG_KEY` (the project's publishable token) and `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com` are set on the Vercel project. No key → analytics is a no-op.
- Requests go through this app's own origin: `<basePath>/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true`).
- `<Analytics />` and `<LinkTracking />` are mounted once in `app/layout.tsx`. `Analytics` sends PostHog's `$pageview` per route change. Autocapture, session replay, heatmaps and web-vitals capture are off.
- Privacy: `scrub` (before_send) keeps only origin + path in URL properties, drops `title`, and masks private path segments (`/v/<id>` share links work like passwords, so they become `/v/:id`; the page title, which is the recording title, is dropped).
- posthog-js drops automated browsers. In dev, `localStorage.isdead_ph_debug = "1"` turns on verbose logs and lets Playwright capture (used by the kit's `ph-check.mjs`); production keeps the bot filter.

## Super properties (registered on every event)
| property | value | meaning |
| --- | --- | --- |
| `product` | `loomisdead` | the one property to filter by |
| `surface` | `landing` \| `app` | `landing` = the homepage; `app` = the share pages `/v/<id>` |
| `platform` | `web` | |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `guest` \| `demo` | registered on share pages for a viewer with a session; only `firebase` users are identified |

## Identity
There is no web sign-in. If a share-page viewer already has a session cookie, `IdentifyUser` in `app/v/[id]/page.tsx` identifies Firebase users by uid; guests and demo sessions are only tagged.

## Events
| event | properties | where |
| --- | --- | --- |
| `landing_download_clicked` | `target` (`mac`), `placement` | any link to `/download` (homepage, share-page header) |
| `landing_cta_clicked` | `target` (`github`, `releases`, `issues`, `license`, `hub`), `placement` | other homepage links |
| `app_recording_viewed` | `owner`, `signed_in`, `comments`, `reactions`, `just_recorded` | `components/Watch.tsx` (page load) |
| `app_recording_played` | `owner` | first play per page load |
| `app_reaction_added` | `emoji` (one of the fixed reaction set) | |
| `app_comment_added` | `timestamped`, `signed_in` | never the comment text or name |
| `app_comment_deleted` | `owner` | |
| `app_recording_renamed` | | owner only; never the title |
| `app_recording_deleted` | | owner only |
| `app_recording_downloaded` | `owner` | |
| `app_shared` | `method` (`copy_link`) | |

## Rules
- Event names are `app_<object>_<action>` / `landing_<object>_<action>`, snake_case, past tense, never containing the product name. They are defined only in `lib/analytics/taxonomy.ts`; the unit test enforces the prefixes.
- Properties are kinds, counts, ids and booleans only. Never titles, file names, messages, comment text, emails or URLs. Don't use the legacy super-property names (`source`, `app`, `app_id`, `site_id`, `environment`) as event properties.
- `landing_cta_clicked` / `landing_download_clicked` come from one delegated click listener (`LinkTracking` in `lib/analytics/posthog.tsx`) that classifies `<a>` destinations, so new marketing links are tracked without code. `placement` is the page region (`nav`, `footer`, or the enclosing section's id/class).

## Where the calls live
`lib/analytics/` (client, taxonomy, link tracking, scrub). Tests: `tests/unit/analytics.test.ts`.
