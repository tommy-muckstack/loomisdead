// Analytics taxonomy for the shared IsDead PostHog project 666931 (contract: yourappisdead/ANALYTICS.md, see docs/ANALYTICS.md).
// Super properties: product (this app's slug), surface ("landing" = logged-out marketing pages, "app" = the working product
// and anything it publishes), platform ("web"). Page views are PostHog's built-in $pageview.
// Events are `app_<object>_<action>` (or `landing_<object>_<action>` for marketing CTAs); the product name lives in
// `product`, never in an event name. Never send user content (titles, URLs, emails, text) as properties.
export const APP = "loomisdead" as const;
export type Surface = "landing" | "app";
export const EVENTS = {
  // No web sign-in: recording and sign-in happen in the Mac app (mac/, its own Swift analytics).
  landing_download_clicked: "landing_download_clicked", // target ("mac"), placement (page region: "nav" | "footer" | section class)
  // public share page /v/<id> for recordings uploaded from the Mac app (never the title or comment text)
  app_recording_viewed: "app_recording_viewed",         // owner (bool), signed_in (bool), comments (count), reactions (count), just_recorded (bool)
  app_recording_played: "app_recording_played",         // owner (bool); once per page load
  app_reaction_added: "app_reaction_added",             // emoji (one of the fixed REACTIONS set)
  app_comment_added: "app_comment_added",               // timestamped (bool), signed_in (bool)
  app_comment_deleted: "app_comment_deleted",           // owner (bool)
  app_recording_renamed: "app_recording_renamed",
  app_recording_deleted: "app_recording_deleted",
  app_recording_downloaded: "app_recording_downloaded", // owner (bool)
  app_shared: "app_shared",                             // method ("copy_link")
  landing_cta_clicked: "landing_cta_clicked", // target ("github" | "releases" | "issues" | "license" | "hub"), placement
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export const EVENT_PREFIXES = ["app_", "landing_"] as const;
/** Super properties every event carries (yourappisdead/ANALYTICS.md §1). */
export const superProps = (surface: Surface) => ({ product: APP, surface, platform: "web" as const });
/** Super properties older IsDead taxonomies persisted in the shared yourappisdead.com cookie. Unregistered at boot. */
export const LEGACY_PROPS = ["app", "app_family", "base_path", "suite_id", "app_id", "schema_version", "source", "site_id", "environment", "ads_blocked", "account_type"] as const;
