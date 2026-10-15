"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { BP } from "@/lib/basepath";
import { formatTime, timeAgo, viewsLabel, defaultTitle, LIMITS, type PublicVideo } from "@/lib/video";

/** Probe a picked file for its duration (MediaRecorder webm reports Infinity until you seek to the end). */
function probe(file: File): Promise<number> {
  return new Promise(res => { const v = document.createElement("video"); const u = URL.createObjectURL(file); v.preload = "metadata"; v.src = u; const done = (n: number) => { URL.revokeObjectURL(u); res(Number.isFinite(n) ? n : 0); };
    v.onloadedmetadata = () => { if (Number.isFinite(v.duration)) return done(v.duration); v.currentTime = 1e9; v.ontimeupdate = () => { v.ontimeupdate = null; done(v.duration); }; }; v.onerror = () => done(0); setTimeout(() => done(0), 8000); });
}
export function Library({ initial }: { initial: PublicVideo[] }) {
  const [videos, setVideos] = useState(initial); const [q, setQ] = useState(""); const [err, setErr] = useState(""); const [up, setUp] = useState<number | null>(null); const [copied, setCopied] = useState(""); const pick = useRef<HTMLInputElement>(null);
  const shown = videos.filter(v => v.title.toLowerCase().includes(q.trim().toLowerCase()));
  const upload = async (f: File | undefined) => {
    if (!f) return; setErr(""); if (f.size > LIMITS.bytes) return setErr("That file is bigger than 150 MB."); const dur = await probe(f); setUp(0);
    const fd = new FormData(); fd.set("video", f, f.name); fd.set("title", f.name.replace(/\.[a-z0-9]+$/i, "") || defaultTitle()); fd.set("duration", String(dur || 1));
    const x = new XMLHttpRequest(); x.open("POST", `${BP}/api/videos`); x.upload.onprogress = e => { if (e.lengthComputable) setUp(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { setUp(null); let j: { video?: PublicVideo; error?: string } = {}; try { j = JSON.parse(x.responseText); } catch { /* ignore */ } if (x.status === 201 && j.video) setVideos(vs => [j.video!, ...vs]); else setErr(j.error ?? "Couldn't upload that video."); };
    x.onerror = () => { setUp(null); setErr("The upload failed. Check your connection."); }; x.send(fd);
  };
  const del = async (v: PublicVideo) => { if (!confirm(`Delete "${v.title}"? Its link will stop working.`)) return; const r = await fetch(`${BP}/api/videos/${v.id}`, { method: "DELETE" }); if (r.ok) setVideos(vs => vs.filter(x => x.id !== v.id)); };
  const copy = async (v: PublicVideo) => { try { await navigator.clipboard.writeText(`${location.origin}${BP}/v/${v.id}`); } catch { /* ignore */ } setCopied(v.id); setTimeout(() => setCopied(""), 1500); };
  return <main className="lm-lib">
    <div className="lm-lib__top"><div><h1 className="ids-h2" style={{ margin: 0 }}>My videos</h1><p className="ids-muted" style={{ margin: "4px 0 0" }}>{videos.length} video{videos.length === 1 ? "" : "s"}</p></div>
      <div className="lm-lib__tools"><input className="ids-input lm-search" type="search" aria-label="Search videos" placeholder="Search videos" value={q} onChange={e => setQ(e.target.value)} />
        <button className="ids-btn ids-btn--outline" onClick={() => pick.current?.click()} disabled={up !== null}>{up !== null ? `Uploading ${up}%` : "Upload a video"}</button><input ref={pick} type="file" accept="video/webm,video/mp4" hidden aria-label="Upload a video file" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        <Link className="ids-btn ids-btn--primary" href="/app/record" data-testid="new">New video</Link></div></div>
    {err && <p className="ids-error" role="alert">{err}</p>}
    {videos.length === 0 ? <div className="lm-empty ids-card"><h2 className="ids-h3">Record your first video</h2><p className="ids-muted">Share your screen, talk it through, and send a link.</p><Link className="ids-btn ids-btn--primary" href="/app/record">New video</Link></div>
      : shown.length === 0 ? <p className="ids-muted">No videos match “{q}”.</p>
      : <ul className="lm-grid" data-testid="grid">{shown.map(v => <li key={v.id} className="lm-card" data-testid="video-card">
        <Link href={`/v/${v.id}`} className="lm-thumb">{v.hasThumb ? <img src={`${BP}/api/videos/${v.id}/media?thumb=1`} alt="" loading="lazy" /> : <span className="lm-thumb__ph" aria-hidden>▶</span>}<span className="lm-dur">{formatTime(v.duration)}</span></Link>
        <div className="lm-card__body"><Link href={`/v/${v.id}`} className="lm-card__title">{v.title}</Link><p className="ids-muted">{timeAgo(v.createdAt)} · {viewsLabel(v.views)}{v.comments.length ? ` · ${v.comments.length} comment${v.comments.length === 1 ? "" : "s"}` : ""}</p>
          <div className="lm-card__act"><button className="iconbtn" onClick={() => copy(v)}>{copied === v.id ? "Copied!" : "Copy link"}</button><button className="iconbtn" onClick={() => del(v)} aria-label={`Delete ${v.title}`}>Delete</button></div></div></li>)}</ul>}
  </main>;
}
