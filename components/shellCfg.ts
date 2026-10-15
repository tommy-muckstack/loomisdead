import type { ShellCfg } from "@/components/AppShell";
export const shellCfg: ShellCfg = { mode: "side", vars: { "--side-w": "256px", "--accent": "#1868db", "--on-bg": "#e9f2fe", "--on-ink": "#1868db", "--page": "#fff", "--r": "8px" } as Record<string, string>,
  cta: { label: "New video", href: "/app/record", icon: "record" },
  items: [{ label: "Home", href: "/app", icon: "home" }, { label: "My videos", href: "/app#videos", icon: "video" }, { label: "Record", href: "/app/record", icon: "record" }, { label: "Spaces", href: "/app#spaces", icon: "users" }, { label: "Library", href: "/app#library", icon: "library" }],
  foot: [{ label: "Notifications", href: "/app#n", icon: "bell" }, { label: "Settings", href: "/app#s", icon: "settings" }],
  search: "Search for videos", right: [{ label: "Invite teammates", href: "/app#invite" }] };
