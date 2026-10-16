import type { Site } from "@/lib/site-types";
const GH = "https://github.com/tommy-muckstack/loomisdead";
/** Every "Download" CTA goes through /download, which redirects here: the latest signed + notarized Mac build. */
export const DOWNLOAD_URL = `${GH}/releases/latest/download/LoomIsDead.dmg`;
export const site: Site = {
  slug: "loomisdead", name: "LoomIsDead", replaces: "Loom", theme: "loom",
  description: "LoomIsDead is a free, open-source Mac app for recording your screen and camera. Share a link in seconds; viewers react and comment at the exact moment, no account needed.",
  trademark: "LoomIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by Loom, Inc. or Atlassian. Loom is a trademark of its owner.",
  repo: GH,
};
