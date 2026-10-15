// Next.js basePath. The app is served under https://yourappisdead.com/loomisdead.
// next/link, router.push and redirect() add it automatically; plain fetch(), <a href>, <img src> and location.href do not, so use BP / withBase.
export const BP: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "/loomisdead";
export const withBase = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? BP + p : p);
