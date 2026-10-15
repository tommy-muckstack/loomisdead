import type { Site } from "@/lib/site-types";
const GH = "https://github.com/tommy-muckstack/loomisdead";
export const site: Site = {
  slug: "loomisdead", name: "LoomIsDead", replaces: "Loom", theme: "loom",
  glyph: "M12 4.5 A7.5 7.5 0 1 1 11.99 4.5 M10 8.7 L15.4 12 L10 15.3 Z",
  nav: [{ label: "Record", id: "record" }, { label: "How it works", id: "solutions" }, { label: "Resources", id: "resources" }, { label: "Pricing", id: "pricing" }],
  cta: "Record a video",
  hero: { variant: "split", eyebrow: "Free · Open source · No time limit under an hour", title: ["Show it.", "Don't type it."], subtitle: "Record your screen and camera right in the browser, then share a link in seconds. Your team watches, reacts and comments on the exact moment, without another meeting.",
    primary: { label: "Record a video", href: "/login" }, secondary: { label: "See the price comparison", href: "/#pricing" }, shot: "watch.png", shotAlt: "The watch page: a recorded screen with reaction buttons and timestamped comments beside it" },
  audience: "Made for product teams, support, sales, designers, teachers and anyone who is tired of scheduling a call to explain one thing",
  stepsTitle: "From idea to link in four moves",
  steps: [{ t: "Pick what to record", d: "Screen, camera, or screen with a camera bubble. Switch the microphone on or off." }, { t: "Hit record", d: "A three-second countdown, then talk it through. Pause and resume whenever you need." }, { t: "Review and save", d: "Watch it back, give it a title, then save. The link is on your clipboard before you know it." }, { t: "Watch, react, reply", d: "Viewers need no account. They can drop emoji and comment at an exact timestamp." }],
  rows: [
    { id: "record", k: "Record", h: "Screen, camera or both, right in the tab", p: "Share a window or your whole screen, add a round camera bubble and a microphone, and stop whenever you like. It all happens in your browser, so there is nothing to install.", img: "recorder.png", alt: "The recorder with options for screen and camera, microphone and camera bubble position", cta: "Start recording" },
    { id: "watch", k: "Watch", h: "A player made for talking about things", p: "Seek and change speed, jump to a comment from the timeline, and see reactions as they happen. Anyone with the link can watch on any device.", img: "watch.png", alt: "A video player with timeline markers for comments and a row of emoji reactions", cta: "See a demo video" },
    { id: "comments", k: "Comments", h: "Feedback pinned to the exact second", p: "Comments are stamped with the time they refer to. Click one and the video jumps there, so “the button at 0:42” is never a mystery.", img: "comments.png", alt: "A list of comments each with a timestamp button", cta: "Try the demo" },
    { id: "library", k: "Library", h: "Every video in one place", p: "Search your recordings, copy a link, upload an existing video, or delete one for good. See how many people watched, and who replied.", img: "library.png", alt: "A grid of recorded videos with thumbnails, durations and view counts", cta: "Open your library" },
  ],
  statsTitle: "Real numbers, no fine print",
  stats: [{ b: "$0", s: "for unlimited videos" }, { b: "60 min", s: "per recording, not 5" }, { b: "0 accounts", s: "needed to watch or comment" }, { b: "Apache-2.0", s: "fork it, change it, ship it" }],
  integrations: { title: "A link works everywhere", text: "Paste it into chat, email, a doc or a ticket. It opens in any browser on any device, and nobody has to sign in to watch." },
  pricing: { title: "What you'd pay to record videos elsewhere", vendor: "Loom", asOf: "October 2026", plans: [{ name: "Business", perSeatMonth: 18, note: "per creator, billed monthly" }, { name: "Business + AI", perSeatMonth: 24, note: "per creator, billed monthly" }], seats: 5,
    footnote: "Loom's free Starter plan limits you to 25 videos and 5 minutes per recording. Paid plans are billed per creator; viewers are always free. Annual billing is about 17% cheaper.", featuresTitle: "Every feature, no plan gates",
    features: [{ name: "More than 25 videos", plan: "Business" }, { name: "Recordings longer than 5 minutes", plan: "Business" }, { name: "Download your videos", plan: "Business" }, { name: "Upload an existing video", plan: "Business" }, { name: "Know who watched and how often", plan: "Business" }, { name: "Screen + camera bubble", plan: "Starter (free)" }] },
  finalCta: { title: "Stop scheduling. Start showing.", sub: "Your first recording is one click away." },
  footer: [
    { title: "Product", links: [{ label: "Record", href: "/#record" }, { label: "Watch page", href: "/#watch" }, { label: "Comments", href: "/#comments" }, { label: "Pricing", href: "/#pricing" }] },
    { title: "Get started", links: [{ label: "Log in", href: "/login" }, { label: "Try the demo account", href: "/login" }, { label: "Price comparison", href: "/#pricing" }] },
    { title: "Open source", links: [{ label: "GitHub", href: GH }, { label: "Apache-2.0 license", href: GH + "/blob/main/LICENSE" }] },
    { title: "More IsDead apps", links: [{ label: "CalendlyIsDead", href: "/calendlyisdead" }, { label: "LinktreeIsDead", href: "/linktreeisdead" }, { label: "TrelloIsDead", href: "/trelloisdead" }, { label: "BitlyIsDead", href: "/bitlyisdead" }, { label: "WeTransferIsDead", href: "/wetransferisdead" }] },
  ],
  trademark: "LoomIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by Loom, Inc. or Atlassian. Loom is a trademark of its owner.",
  repo: GH,
};
