"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BP } from "@/lib/basepath";
import { REACTIONS, formatTime, timeAgo, viewsLabel, sortComments, reactionCounts, LIMITS, type PublicVideo, type Comment } from "@/lib/video";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
/** Public watch page: custom player with comment/reaction markers, timestamped comments, emoji reactions, view counting. */
export function Watch({ video: initial, isOwner, viewer, justRecorded }: { video: PublicVideo; isOwner: boolean; viewer: { id: string; name: string } | null; justRecorded: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial); const [t, setT] = useState(0); const [playing, setPlaying] = useState(false); const [dur, setDur] = useState(initial.duration); const [speed, setSpeed] = useState(1); const [muted, setMuted] = useState(false);
  const [text, setText] = useState(""); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(justRecorded); const [floating, setFloating] = useState<{ k: number; e: string; x: number }[]>([]);
  const [editing, setEditing] = useState(false); const [title, setTitle] = useState(initial.title); const [tl, setTl] = useState(true);
  const vid = useRef<HTMLVideoElement>(null); const bar = useRef<HTMLDivElement>(null); const counted = useRef(false); const stage = useRef<HTMLDivElement>(null); const kid = useRef(0);
  const link = typeof location === "undefined" ? "" : `${location.origin}${BP}/v/${v.id}`;
  const comments = useMemo(() => sortComments(v.comments), [v.comments]); const counts = reactionCounts(v.reactions);
  useEffect(() => { if (copied) { const x = setTimeout(() => setCopied(false), 4000); return () => clearTimeout(x); } }, [copied]);

  const onMeta = () => { const e = vid.current!; if (Number.isFinite(e.duration) && e.duration > 0) setDur(e.duration); else { /* MediaRecorder webm has no duration: keep the saved one */ } };
  const onPlay = () => { setPlaying(true); if (!counted.current) { counted.current = true; const k = `lm-viewed:${v.id}`; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); void fetch(`${BP}/api/videos/${v.id}/view`, { method: "POST" }).then(r => r.json()).then(j => { if (j.counted) setV(x => ({ ...x, views: j.views })); }).catch(() => {}); } } };
  const toggle = () => { const e = vid.current!; if (e.paused) void e.play(); else e.pause(); };
  const seekTo = (s: number, play = false) => { const e = vid.current!; e.currentTime = Math.max(0, Math.min(s, dur)); setT(e.currentTime); if (play) void e.play(); };
  const scrub = (clientX: number) => { const r = bar.current!.getBoundingClientRect(); seekTo(((clientX - r.left) / r.width) * dur); };
  const onKey = (e: React.KeyboardEvent) => { if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "INPUT") return; if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); } else if (e.key === "ArrowRight") seekTo(t + 5); else if (e.key === "ArrowLeft") seekTo(t - 5); else if (e.key === "m") setMuted(m => !m); else if (e.key === "f") void stage.current?.requestFullscreen?.(); };
  useEffect(() => { if (vid.current) { vid.current.playbackRate = speed; vid.current.muted = muted; } }, [speed, muted]);

  const react = (emoji: string) => {
    const k = ++kid.current; setFloating(f => [...f, { k, e: emoji, x: 10 + Math.random() * 70 }]); setTimeout(() => setFloating(f => f.filter(x => x.k !== k)), 1800);
    setV(x => ({ ...x, reactions: [...x.reactions, { emoji: emoji as never, at: t }] }));
    void fetch(`${BP}/api/videos/${v.id}/reactions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emoji, at: t }) }).catch(() => {});
  };
  const post = async () => {
    if (busy) return; setBusy(true); setErr("");
    const r = await fetch(`${BP}/api/videos/${v.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, name, at: tl ? t : 0 }) }); const j = await r.json().catch(() => ({}));
    setBusy(false); if (r.ok) { setV(x => ({ ...x, comments: [...x.comments, j.comment as Comment] })); setText(""); } else setErr(j.error ?? "Couldn't post your comment.");
  };
  const delComment = async (cid: string) => { const r = await fetch(`${BP}/api/videos/${v.id}/comments?cid=${cid}`, { method: "DELETE" }); if (r.ok) setV(x => ({ ...x, comments: x.comments.filter(c => c.id !== cid) })); };
  const saveTitle = async () => { const r = await fetch(`${BP}/api/videos/${v.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) }); if (r.ok) { const j = await r.json(); setV(j.video); setTitle(j.video.title); setEditing(false); } };
  const del = async () => { if (!confirm("Delete this video? The link will stop working.")) return; const r = await fetch(`${BP}/api/videos/${v.id}`, { method: "DELETE" }); if (r.ok) router.push("/app"); };
  const copy = async () => { try { await navigator.clipboard.writeText(link); } catch { /* ignore */ } setCopied(true); };

  const pctOf = (s: number) => (dur ? Math.min(100, (s / dur) * 100) : 0);
  return <div className="lm-watch" onKeyDown={onKey}>
    <div className="lm-watch__main">
      <div ref={stage} className="lm-player" data-testid="player">
        <video ref={vid} className="lm-video" src={`${BP}/api/videos/${v.id}/media`} poster={v.hasThumb ? `${BP}/api/videos/${v.id}/media?thumb=1` : undefined} preload="metadata" playsInline onClick={toggle} onLoadedMetadata={onMeta} onDurationChange={onMeta}
          onTimeUpdate={e => setT(e.currentTarget.currentTime)} onPlay={onPlay} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} data-testid="video" />
        {!playing && <button className="lm-bigplay" onClick={toggle} aria-label="Play video"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></button>}
        <div className="lm-float" aria-hidden>{floating.map(f => <span key={f.k} style={{ left: f.x + "%" }}>{f.e}</span>)}</div>
        <div className="lm-bar">
          <button className="lm-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
          <span className="lm-time" data-testid="time">{formatTime(t)} / {formatTime(dur)}</span>
          <div ref={bar} className="lm-scrub" role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrub(e.clientX); }} onPointerMove={e => { if (e.buttons) scrub(e.clientX); }}>
            <i className="lm-scrub__fill" style={{ width: pctOf(t) + "%" }} />{comments.map(c => <b key={c.id} className="lm-pin" style={{ left: pctOf(c.at) + "%" }} title={`${c.name}: ${c.text}`} />)}</div>
          <button className="lm-btn lm-btn--txt" onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!)} aria-label="Playback speed">{speed}x</button>
          <button className="lm-btn" onClick={() => setMuted(m => !m)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
          <button className="lm-btn" onClick={() => void stage.current?.requestFullscreen?.()} aria-label="Fullscreen">⛶</button></div>
      </div>
      <div className="lm-react" role="group" aria-label="React"><div className="lm-react__btns">{REACTIONS.map(e => <button key={e} onClick={() => react(e)} aria-label={`React ${e}`}>{e}{counts[e] ? <small>{counts[e]}</small> : null}</button>)}</div></div>
      <div className="lm-meta">
        {editing ? <form className="lm-titleedit" onSubmit={e => { e.preventDefault(); void saveTitle(); }}><input className="ids-input" aria-label="Video title" value={title} maxLength={LIMITS.title} onChange={e => setTitle(e.target.value)} autoFocus /><button className="ids-btn ids-btn--primary ids-btn--sm">Save</button><button type="button" className="ids-btn ids-btn--ghost ids-btn--sm" onClick={() => { setTitle(v.title); setEditing(false); }}>Cancel</button></form>
          : <h1 className="ids-h2 lm-title" data-testid="title">{v.title}</h1>}
        <p className="ids-muted lm-sub"><span className="lm-avatar" aria-hidden>{v.ownerName.slice(0, 1).toUpperCase()}</span>{v.ownerName} · {timeAgo(v.createdAt)} · <span data-testid="views">{viewsLabel(v.views)}</span></p>
        <div className="lm-actions"><button className="ids-btn ids-btn--primary ids-btn--sm" onClick={copy}>{copied ? "Link copied!" : "Copy link"}</button><a className="ids-btn ids-btn--outline ids-btn--sm" href={`${BP}/api/videos/${v.id}/media`} download={`${v.title}.${v.type === "video/mp4" ? "mp4" : "webm"}`}>Download</a>
          {isOwner && <><button className="ids-btn ids-btn--outline ids-btn--sm" onClick={() => setEditing(true)}>Rename</button><button className="ids-btn ids-btn--ghost ids-btn--sm" onClick={del}>Delete</button></>}</div>
      </div>
    </div>
    <aside className="lm-side" aria-label="Comments"><h2 className="ids-h3" style={{ margin: 0 }}>Comments <span className="ids-muted" data-testid="ccount">{comments.length}</span></h2>
      <div className="lm-compose">
        {!viewer && <input className="ids-input" aria-label="Your name" placeholder="Your name (optional)" maxLength={40} value={name} onChange={e => setName(e.target.value)} />}
        <textarea className="ids-input lm-ta" aria-label="Add a comment" placeholder="Leave a comment…" value={text} maxLength={LIMITS.comment} onChange={e => setText(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void post(); }} />
        <label className="lm-check"><input type="checkbox" checked={tl} onChange={e => setTl(e.target.checked)} /> Add at {formatTime(t)}</label>
        {err && <p className="ids-error" role="alert">{err}</p>}
        <button className="ids-btn ids-btn--primary ids-btn--sm" onClick={post} disabled={busy || !text.trim()}>Comment</button></div>
      <ul className="lm-comments" data-testid="comments">{comments.length === 0 ? <li className="ids-muted">No comments yet. Be the first.</li> : comments.map(c => <li key={c.id}>
        <span className="lm-avatar" aria-hidden>{c.name.slice(0, 1).toUpperCase()}</span><div><div className="lm-chead"><b>{c.name}</b><button className="lm-stamp" onClick={() => seekTo(c.at, true)} aria-label={`Jump to ${formatTime(c.at)}`}>{formatTime(c.at)}</button><span className="ids-muted">{timeAgo(c.createdAt)}</span>
          {(isOwner || (viewer && c.userId === viewer.id)) && <button className="lm-x" onClick={() => void delComment(c.id)} aria-label="Delete comment">×</button>}</div><p>{c.text}</p></div></li>)}</ul>
      <p className="ids-muted" style={{ fontSize: 12, margin: 0 }}>Made with <Link href="/">LoomIsDead</Link>, free and open source.</p></aside>
  </div>;
}
