import Link from "next/link";
import { getVideo } from "@/lib/videos-server";
import { currentUser } from "@/lib/session";
import { toPublic, validId } from "@/lib/video";
import { Logo } from "@/components/Logo";
import { Watch } from "@/components/Watch";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const v = validId(id) ? await getVideo(id) : null; return { title: v ? `${v.title} | LoomIsDead` : "Video not found | LoomIsDead", robots: { index: false } }; }
export default async function WatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params; const sp = await searchParams; const v = validId(id) ? await getVideo(id) : null; const u = await currentUser();
  return <div className="lm-root"><header className="lm-hd"><Link href="/" style={{ color: "inherit", textDecoration: "none" }}><Logo size={26} /></Link><div className="lm-hd__r">{u ? <Link className="ids-btn ids-btn--outline ids-btn--sm" href="/app">My videos</Link> : <><Link className="ids-btn ids-btn--ghost ids-btn--sm" href="/login">Log in</Link><Link className="ids-btn ids-btn--primary ids-btn--sm" href="/login">Record a video</Link></>}</div></header>
    {!v ? <main className="lm-gone ids-card"><h1 className="ids-h3">This video isn't available</h1><p className="ids-muted">It may have been deleted, or the link is wrong.</p><Link className="ids-btn ids-btn--primary" href="/">Go to LoomIsDead</Link></main>
      : <Watch video={toPublic(v)} isOwner={!!u && u.id === v.ownerId} viewer={u ? { id: u.id, name: u.name } : null} justRecorded={sp.new === "1"} />}</div>;
}
