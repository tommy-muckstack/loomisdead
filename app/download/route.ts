import { NextResponse } from "next/server";
import { DOWNLOAD_URL } from "@/site.config";
/** Every "Download" CTA lands here: the latest signed + notarized Mac build on GitHub Releases. */
export const dynamic = "force-static";
export function GET() { return NextResponse.redirect(DOWNLOAD_URL, 307); }
