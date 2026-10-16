import "@/vendor/isdead-design/css/loom.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { site } from "@/site.config";
export const metadata = { title: `${site.name}: free, open-source ${site.replaces} alternative for Mac`, description: site.description };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="loom"><body className="ids-root">{children}</body></html>;
}
