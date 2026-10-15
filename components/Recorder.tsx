"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BP } from "@/lib/basepath";
import { LIMITS, defaultTitle, formatBytes, formatTime } from "@/lib/video";

type Mode = "screen-cam" | "screen" | "cam";
type Phase = "setup" | "countdown" | "recording" | "paused" | "review" | "saving";
const MIMES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const pickMime = () => (typeof MediaRecorder === "undefined" ? "" : MIMES.find(m => MediaRecorder.isTypeSupported(m)) ?? "");
const MAX_BYTES = LIMITS.bytes - 4 * 1024 * 1024;

/** In-browser recorder: screen, camera or both (camera bubble composited onto a canvas), with microphone, countdown, pause and review. */
export function Recorder() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("screen-cam"); const [mic, setMic] = useState(true); const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3); const [secs, setSecs] = useState(0); const [bytes, setBytes] = useState(0); const [err, setErr] = useState("");
  const [title, setTitle] = useState(""); const [pct, setPct] = useState(0); const [blob, setBlob] = useState<Blob | null>(null); const [url, setUrl] = useState(""); const [thumb, setThumb] = useState("");
  const [bubble, setBubble] = useState<"left" | "right">("left");
  const rec = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const streams = useRef<MediaStream[]>([]); const cleanup = useRef<(() => void)[]>([]);
  const elapsed = useRef(0); const lastTick = useRef(0); const timer = useRef<ReturnType<typeof setInterval> | null>(null); const stopping = useRef(false); const total = useRef(0); const preview = useRef<HTMLVideoElement>(null);
  const bubbleRef = useRef(bubble); bubbleRef.current = bubble;

  const releaseAll = () => { cleanup.current.forEach(f => { try { f(); } catch { /* ignore */ } }); cleanup.current = []; streams.current.forEach(s => s.getTracks().forEach(t => t.stop())); streams.current = []; if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => () => { releaseAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const stopRecording = () => { if (stopping.current) return; stopping.current = true; const r = rec.current; if (r && r.state !== "inactive") r.stop(); else finish(); };
  const finish = () => {
    if (timer.current) clearInterval(timer.current); timer.current = null;
    const b = new Blob(chunks.current, { type: "video/webm" }); releaseAll(); chunks.current = [];
    if (b.size === 0) { setErr("Nothing was recorded. Try again."); setPhase("setup"); stopping.current = false; return; }
    const u = URL.createObjectURL(b); setBlob(b); setUrl(u); setTitle(t => t || defaultTitle()); setPhase("review"); stopping.current = false; makeThumb(u);
  };
  const makeThumb = (u: string) => {
    const v = document.createElement("video"); v.muted = true; v.src = u; v.preload = "auto"; v.playsInline = true;
    v.onloadeddata = () => { try { v.currentTime = 0.1; } catch { /* ignore */ } };
    v.onseeked = () => { try { const c = document.createElement("canvas"); const w = 480, h = Math.round(w * ((v.videoHeight || 9) / (v.videoWidth || 16))); c.width = w; c.height = h; c.getContext("2d")!.drawImage(v, 0, 0, w, h); setThumb(c.toDataURL("image/jpeg", 0.7)); } catch { /* optional */ } v.removeAttribute("src"); };
  };

  async function begin() {
    setErr(""); stopping.current = false; chunks.current = []; total.current = 0; elapsed.current = 0; setSecs(0); setBytes(0);
    const mime = pickMime(); if (!mime) { setErr("This browser can't record video. Try Chrome, Edge or Firefox on a computer."); return; }
    if (mode !== "cam" && !navigator.mediaDevices?.getDisplayMedia) { setErr("Screen recording isn't available on this device. Use camera only, or try a desktop browser."); return; }
    try {
      let screen: MediaStream | null = null, cam: MediaStream | null = null, micStream: MediaStream | null = null;
      if (mode !== "cam") { screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true }); streams.current.push(screen); }
      if (mode !== "screen") { cam = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: mic }); streams.current.push(cam); }
      else if (mic) { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); streams.current.push(micStream); }
      const out = new MediaStream();
      // audio: mix microphone and system/tab audio
      const audioSources = [cam, micStream, screen].filter((s): s is MediaStream => !!s && s.getAudioTracks().length > 0);
      if (audioSources.length) { const ac = new AudioContext(); const dest = ac.createMediaStreamDestination(); for (const s of audioSources) ac.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest); dest.stream.getAudioTracks().forEach(t => out.addTrack(t)); cleanup.current.push(() => { void ac.close(); }); }
      if (mode === "screen-cam" && screen && cam) {
        const sv = document.createElement("video"), cv = document.createElement("video"); sv.muted = cv.muted = true; sv.playsInline = cv.playsInline = true; sv.srcObject = new MediaStream(screen.getVideoTracks()); cv.srcObject = new MediaStream(cam.getVideoTracks()); await Promise.all([sv.play(), cv.play()]);
        const canvas = document.createElement("canvas"); const st = screen.getVideoTracks()[0]!.getSettings(); canvas.width = Math.min(st.width ?? 1280, 1920); canvas.height = Math.min(st.height ?? 720, 1080); const g = canvas.getContext("2d")!;
        const draw = () => { g.drawImage(sv, 0, 0, canvas.width, canvas.height); const d = Math.round(canvas.height * 0.26), m = Math.round(canvas.height * 0.03); const x = bubbleRef.current === "left" ? m : canvas.width - d - m, y = canvas.height - d - m; const ar = (cv.videoWidth || 4) / (cv.videoHeight || 3); const sw = ar > 1 ? d * ar : d, sh = ar > 1 ? d : d / ar;
          g.save(); g.beginPath(); g.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); g.clip(); g.drawImage(cv, x + (d - sw) / 2, y + (d - sh) / 2, sw, sh); g.restore(); g.lineWidth = Math.max(3, d * 0.03); g.strokeStyle = "#fff"; g.beginPath(); g.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); g.stroke(); };
        // A worker timer keeps drawing at full speed even when this tab is in the background (the usual case while screen recording).
        const w = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),33)"], { type: "text/javascript" }))); w.onmessage = draw; cleanup.current.push(() => w.terminate()); draw();
        canvas.captureStream(30).getVideoTracks().forEach(t => out.addTrack(t));
      } else { (screen ?? cam)!.getVideoTracks().forEach(t => out.addTrack(t)); }
      // let the person see themselves while the countdown runs
      const first = screen ?? cam!; first.getVideoTracks()[0]!.addEventListener("ended", () => stopRecording());
      const r = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 2_500_000 }); rec.current = r;
      r.ondataavailable = e => { if (e.data.size) { chunks.current.push(e.data); total.current += e.data.size; setBytes(total.current); if (total.current > MAX_BYTES) stopRecording(); } };
      r.onstop = finish; r.onerror = () => { setErr("Recording failed. Try again."); releaseAll(); setPhase("setup"); };
      setPhase("countdown"); for (let n = 3; n >= 1; n--) { setCount(n); await new Promise(res => setTimeout(res, 1000)); if (stopping.current) return; }
      r.start(1000); lastTick.current = performance.now(); setPhase("recording");
      timer.current = setInterval(() => { const now = performance.now(); if (rec.current?.state === "recording") { elapsed.current += (now - lastTick.current) / 1000; setSecs(elapsed.current); if (elapsed.current >= LIMITS.seconds) stopRecording(); } lastTick.current = now; }, 250);
    } catch (e) {
      releaseAll(); setPhase("setup"); const n = (e as DOMException)?.name;
      setErr(n === "NotAllowedError" ? "Permission was denied. Allow screen, camera or microphone access and try again." : n === "NotFoundError" ? "No camera or microphone was found." : "Couldn't start recording: " + ((e as Error)?.message || "unknown error"));
    }
  }
  const pause = () => { const r = rec.current; if (!r) return; if (r.state === "recording") { r.pause(); setPhase("paused"); } else if (r.state === "paused") { r.resume(); lastTick.current = performance.now(); setPhase("recording"); } };
  const cancelCountdown = () => { stopping.current = true; releaseAll(); setPhase("setup"); stopping.current = false; };
  const discard = () => { setBlob(null); setUrl(""); setThumb(""); setTitle(""); setPhase("setup"); };
  const save = () => {
    if (!blob) return; setErr(""); setPhase("saving"); setPct(0);
    const fd = new FormData(); fd.set("video", blob, "recording.webm"); fd.set("title", title.trim() || defaultTitle()); fd.set("duration", String(Math.max(0.1, elapsed.current))); if (thumb) fd.set("thumb", thumb);
    const x = new XMLHttpRequest(); x.open("POST", `${BP}/api/videos`); x.upload.onprogress = e => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { let j: { id?: string; error?: string } = {}; try { j = JSON.parse(x.responseText); } catch { /* ignore */ } if (x.status === 201 && j.id) { const link = `${location.origin}${BP}/v/${j.id}`; try { void navigator.clipboard.writeText(link); } catch { /* ignore */ } router.push(`/v/${j.id}?new=1`); } else { setErr(x.status === 401 ? "Your session expired. Sign in again to save." : j.error ?? "Couldn't save the video. Try again."); setPhase("review"); } };
    x.onerror = () => { setErr("The upload failed. Check your connection and try again."); setPhase("review"); }; x.send(fd);
  };
  const live = phase === "recording" || phase === "paused";

  if (phase === "review" || phase === "saving") return <div className="lm-rec lm-rec--review" data-testid="review">
    <div className="lm-rec__vid"><video ref={preview} src={url} controls playsInline className="lm-video" data-testid="review-video" /></div>
    <div className="lm-rec__side"><h1 className="ids-h3">Looks good?</h1><p className="ids-muted" style={{ margin: "4px 0 16px" }}>{formatTime(elapsed.current)} · {formatBytes(blob?.size ?? 0)}</p>
      <label className="ids-label" htmlFor="lm-title">Title</label><input id="lm-title" className="ids-input" value={title} maxLength={LIMITS.title} onChange={e => setTitle(e.target.value)} disabled={phase === "saving"} />
      {err && <p className="ids-error" role="alert">{err}</p>}
      {phase === "saving" ? <div className="lm-prog" role="progressbar" aria-valuenow={pct}><i style={{ width: pct + "%" }} /><span>Uploading… {pct}%</span></div>
        : <div className="lm-actions"><button className="ids-btn ids-btn--primary" onClick={save}>Save and copy link</button><a className="ids-btn ids-btn--outline" href={url} download={`${title || "recording"}.webm`}>Download</a><button className="ids-btn ids-btn--ghost" onClick={discard}>Discard</button></div>}</div></div>;

  return <div className="lm-rec" data-testid="recorder">
    <div className="lm-rec__main">
      <div className={"lm-stage" + (live ? " live" : "")}>
        {phase === "countdown" ? <div className="lm-count" data-testid="countdown" aria-live="assertive">{count}</div>
          : live ? <div className="lm-live"><span className={"lm-dot" + (phase === "paused" ? " paused" : "")} /><b data-testid="timer">{formatTime(secs)}</b><span className="ids-muted">{phase === "paused" ? "Paused" : "Recording"} · {formatBytes(bytes)}</span></div>
          : <div className="lm-stage__idle"><div className="lm-mark" aria-hidden>●</div><h1 className="ids-h2">Record a video</h1><p className="ids-muted">Share your screen and talk it through. You get a link the moment you stop.</p></div>}
      </div>
      {live ? <div className="lm-controls"><button className="ids-btn ids-btn--outline" onClick={pause}>{phase === "paused" ? "Resume" : "Pause"}</button><button className="ids-btn ids-btn--primary" onClick={stopRecording} data-testid="stop">Stop</button></div>
        : phase === "countdown" ? <div className="lm-controls"><button className="ids-btn ids-btn--outline" onClick={cancelCountdown}>Cancel</button></div> : null}
    </div>
    {phase === "setup" && <div className="lm-rec__side">
      <fieldset className="lm-modes"><legend className="ids-label">What to record</legend>
        {([["screen-cam", "Screen + camera"], ["screen", "Screen only"], ["cam", "Camera only"]] as [Mode, string][]).map(([m, l]) => <label key={m} className={"lm-mode" + (mode === m ? " on" : "")}><input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />{l}</label>)}</fieldset>
      <label className="lm-check"><input type="checkbox" checked={mic} onChange={e => setMic(e.target.checked)} /> Record my microphone</label>
      {mode === "screen-cam" && <div><span className="ids-label">Camera bubble</span><div className="lm-seg">{(["left", "right"] as const).map(s => <button key={s} type="button" className={bubble === s ? "on" : ""} onClick={() => setBubble(s)}>{s === "left" ? "Bottom left" : "Bottom right"}</button>)}</div></div>}
      {err && <p className="ids-error" role="alert">{err}</p>}
      <button className="ids-btn ids-btn--primary ids-btn--lg" style={{ width: "100%", marginTop: 8 }} onClick={begin} data-testid="start">Start recording</button>
      <p className="ids-muted" style={{ fontSize: 13, margin: "12px 0 0" }}>Your browser will ask which screen or window to share. Nothing leaves your computer until you press Save.</p></div>}
  </div>;
}
