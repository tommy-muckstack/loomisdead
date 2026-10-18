const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/loomisdead";
export default {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
  outputFileTracingIncludes: { "/**": ["./seed/**"] },
  // LoomIsDead is a native Mac app now: the browser recorder, library, sign-in and pricing pages are gone.
  // Old URLs land on the homepage, where every call to action downloads the installer. /v/<id> share links stay.
  async redirects() {
    return ["/app", "/app/:path*", "/login", "/pricing", "/compare", "/api/session/demo", "/api/session/logout"].map((source) => ({ source, destination: "/", permanent: true }));
  },
  // PostHog reverse proxy (<basePath>/ingest → us.i.posthog.com) so ad blockers don't drop analytics.
  skipTrailingSlashRedirect: true,
  async rewrites() { return [{ source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" }, { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }]; },
};
