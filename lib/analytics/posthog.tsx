"use client";
// PostHog client for the IsDead family (shared project 666931). Requests go through our own origin (<basePath>/ingest →
// PostHog) so ad blockers don't drop them. The key is the project's publishable token; without NEXT_PUBLIC_POSTHOG_KEY
// everything is a no-op.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { superProps, LEGACY_PROPS, EVENTS, type EventName, type Surface } from "./taxonomy";
type PH = typeof import("posthog-js").default;
type Props = Record<string, string | number | boolean | null | undefined>;
let ph: PH | null = null; let loading: Promise<PH | null> | null = null;
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "/loomisdead";
export const analyticsEnabled = !!KEY;
// "app" = the public share pages for recordings uploaded from the Mac app (/v/<id>); everything else is the marketing site
// (the old browser app at /app now redirects home).
const surfaceOf = (pathname: string): Surface => (/^\/v(\/|$)/.test(pathname.slice(BP.length)) ? "app" : "landing");
/** Same-origin marketing destinations that count as CTAs (first path segment after the basePath). */
const CTA_TARGETS: Record<string, string> = {};

// Privacy: URL properties keep only origin + path (query strings and hashes can hold user content like prefilled links),
// path segments listed in PRIVATE_PATHS are masked (tokens/ids that work like passwords), and the page title is dropped
// (it can be a user's own page or document name).
const PRIVATE_PATHS: RegExp[] = [/(\/v\/)[^/?#]+/ /* share links /v/<id> work like passwords */];
// Any key ending in url / referrer / pathname (posthog-js has many: $current_url, $session_entry_url, $initial_referrer, …),
// at the top level and inside $set / $set_once, wherever those sit.
const URL_KEY = /(url|referrer|pathname)$/i;
const cleanUrl = (v: unknown) => { if (typeof v !== "string" || !v || v === "$direct") return v; let u = v.split(/[?#]/)[0]!; for (const re of PRIVATE_PATHS) u = u.replace(re, "$1:id"); return u; };
const cleanBag = (bag: unknown) => { if (!bag || typeof bag !== "object") return; const o = bag as Record<string, unknown>; for (const k of Object.keys(o)) if (URL_KEY.test(k)) o[k] = cleanUrl(o[k]); };
export function scrub(e: any) { if (!e) return e; for (const bag of [e.properties, e.$set, e.$set_once, e.properties?.$set, e.properties?.$set_once]) cleanBag(bag); if (e.properties) delete e.properties.title; return e; }

async function client(): Promise<PH | null> {
  if (!KEY || typeof window === "undefined") return null;
  if (ph) return ph;
  loading ??= import("posthog-js").then(m => {
    const p = m.default;
    // Dev only: verbose logs + accept automated browsers (posthog-js drops bot/webdriver traffic by default).
    const debug = process.env.NODE_ENV !== "production" && typeof localStorage !== "undefined" && localStorage.getItem("isdead_ph_debug") === "1";
    p.init(KEY, {
      api_host: `${location.origin}${BP}/ingest`, ui_host: UI_HOST,
      capture_pageview: false, capture_pageleave: true, autocapture: false, disable_session_recording: true, capture_heatmaps: false, capture_performance: false, capture_dead_clicks: false, capture_exceptions: false, disable_surveys: true, before_send: scrub,
      persistence: "localStorage+cookie", person_profiles: "always", debug, opt_out_useragent_filter: debug,
    });
    // Every IsDead app shares the yourappisdead.com cookie, and super properties persist in it: clear other apps'
    // leftovers, then set ours (otherwise the hub's product=yourappisdead would ride along on this app's events).
    for (const k of LEGACY_PROPS) p.unregister(k);
    p.register({ ...superProps(surfaceOf(location.pathname)), env: process.env.NODE_ENV === "production" ? "production" : "development" });
    ph = p; if (process.env.NODE_ENV !== "production") (window as unknown as { __posthog?: PH }).__posthog = p;
    return p;
  }).catch(err => { if (process.env.NODE_ENV !== "production") console.warn("[analytics] PostHog failed to start", err); return null; });
  return loading;
}
/** Fire a taxonomy event. Safe to call anywhere on the client; drops silently when analytics is off. */
export function track(event: EventName, props: Props = {}) {
  void client().then(p => p?.capture(event, { surface: surfaceOf(location.pathname), ...props }));
}
/** Like track, but sent immediately; await it before navigating away (sign-in redirects). Never throws or hangs past 1.5s. */
export async function trackNow(event: EventName, props: Props = {}) {
  await Promise.race([client().then(p => { p?.capture(event, { surface: surfaceOf(location.pathname), ...props }, { send_instantly: true }); }).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
}
/** Signed-in users are identified by Firebase uid (shared across the family). Guests and demo sessions never are. */
export function identify(uid: string, accountType: "firebase" | "guest" | "demo") {
  void client().then(p => { if (!p) return; p.register({ account_type: accountType }); if (accountType === "firebase") p.identify(uid, { account_type: accountType }); });
}
// reset() wipes super properties too, so put this app's back straight away.
export function resetIdentity() { void client().then(p => { p?.reset(); p?.register({ ...superProps(surfaceOf(location.pathname)), env: process.env.NODE_ENV === "production" ? "production" : "development" }); }); }
/** Mount once in the root layout: boots the client and sends a $pageview per route change. */
export function Analytics() {
  const path = usePathname();
  useEffect(() => { if (!path) return; void client().then(p => { if (!p) return; p.register({ surface: surfaceOf(location.pathname) }); p.capture("$pageview"); }); }, [path]);
  return null;
}

/** Mount where the server knows who is signed in: identifies Firebase accounts, only tags guests and demo sessions. */
export function IdentifyUser({ id, kind }: { id: string; kind: "firebase" | "guest" | "demo" }) {
  useEffect(() => { identify(id, kind); }, [id, kind]);
  return null;
}

// Marketing links are plain <a>/<Link> all over the page, so one delegated listener classifies them instead of an
// onClick on each. Only the kind of destination and the page region are sent, never the link text or URL.
const placementOf = (a: Element): string => {
  if (a.closest("header, nav")) return "nav";
  if (a.closest("footer")) return "footer";
  const s = a.closest("section"); const tok = s ? (s.id || s.className.split(/\s+/).find(Boolean) || "section") : "page";
  return tok.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "page";
};
function onLinkClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null; if (!a) return;
  let u: URL; try { u = new URL(a.href, location.href); } catch { return; }
  const placement = placementOf(a); const own = u.origin === location.origin && (u.pathname === BP || u.pathname.startsWith(BP + "/"));
  const sub = own ? u.pathname.slice(BP.length).replace(/^\/|\/$/g, "") : "";
  if (own && sub === "download") { void trackNow(EVENTS.landing_download_clicked, { target: "mac", placement }); return; }
  if (surfaceOf(location.pathname) !== "landing") return;
  let target: string | null = null;
  if (u.hostname === "github.com") target = /\/releases/.test(u.pathname) ? "releases" : /\/issues/.test(u.pathname) ? "issues" : /LICENSE/.test(u.pathname) ? "license" : "github";
  else if (own) target = CTA_TARGETS[sub.split("/")[0] ?? ""] ?? null;
  else if (/(^|\.)yourappisdead\.com$/.test(u.hostname)) target = "hub";
  if (target === "login" && u.searchParams.get("mode") === "signup") target = "signup";
  if (target) void trackNow(EVENTS.landing_cta_clicked, { target, placement });
}
/** Mount once in the root layout next to <Analytics />. */
export function LinkTracking() {
  useEffect(() => { if (!KEY) return; document.addEventListener("click", onLinkClick, true); return () => document.removeEventListener("click", onLinkClick, true); }, []);
  return null;
}
