export type Cta = { label: string; href: string };
export type Site = {
  slug: string; name: string; replaces: string; theme: string; glyph: string; // glyph: SVG path (24×24) for our original mark
  nav: { label: string; id: string }[]; // 4 anchors: product, solutions, resources, pricing
  cta: string;
  hero: { variant: "search" | "split" | "center"; eyebrow: string; title: string[]; subtitle: string; primary: Cta; secondary?: Cta; shot: string; shotAlt: string; chips?: string[]; searchPlaceholder?: string };
  audience: string;
  stepsTitle: string; steps: { t: string; d: string }[];
  rows: { id: string; k: string; h: string; p: string; img: string; alt: string; cta: string }[];
  statsTitle: string; stats: { b: string; s: string }[];
  integrations: { title: string; text: string };
  pricing: { title: string; vendor: string; asOf: string; plans: { name: string; perSeatMonth: number; note: string; flat?: boolean; oneTime?: number }[]; seats: number; footnote: string; featuresTitle: string; features: { name: string; plan: string }[] };
  finalCta: { title: string; sub: string };
  footer: { title: string; links: { label: string; href: string }[] }[];
  trademark: string;
  repo: string;
};
