# LoomIsDead

Free, open-source screen and camera recording with a shareable watch page. Part of [IsDead](https://yourappisdead.com): open-source clones of paid SaaS. Served at `https://yourappisdead.com/loomisdead`; videos live at `/loomisdead/v/<id>`.

- **Homepage** (`/`): mirrors Loom's homepage structure (hero, audience line, steps, feature rows, stats, price comparison at `#pricing`) with original copy and art.
- **Login** (`/login`): shared IsDead Firebase auth (email/password + Google); one demo account in demo mode (seeded with three sample videos).
- **Recorder** (`/app/record`): screen + round camera bubble (composited on a canvas; bubble left or right), screen only, or camera only; microphone mixed with tab/system audio; 3-2-1 countdown, pause/resume, live timer and size, auto-stop at 60 minutes or the size cap; review with title, download or discard; saves with upload progress and copies the link. Everything is MediaRecorder in the browser, so nothing is installed.
- **Library** (`/app`): grid with thumbnails, durations, views and comment counts; search; copy link; delete; upload an existing WebM or MP4.
- **Watch page** (`/v/<id>`, public, no account needed): custom player (seek, speed, mute, fullscreen, keyboard shortcuts) with Range-request streaming so seeking works; emoji reactions that float over the video; timestamped comments (click one to jump there, pins on the timeline); view counting once per browser session with crawlers ignored; owners can rename and delete and moderate comments.
- **Safety:** uploads are sniffed by magic bytes (only WebM/MP4), size and length limits are enforced on the server, thumbnails must be small real JPEGs, ids are validated before touching the disk, media is served `nosniff` with a sandbox CSP, and comments are plain text.

Design: theme `loom` in `vendor/isdead-design` (canonical `/workspace/isdead-design`); font Urbanist (OFL) as a lookalike for Loom's proprietary face.

## Run

```
npm ci
npm run dev            # http://localhost:3000/loomisdead  (demo account in dev)
npm test && npm run typecheck
npm run build && npm run shots   # production smoke test (real recording with fake devices, upload, range requests, comments) + screenshots
```

Env (production): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `AUTH_SECRET`, optional `DEMO_MODE=1`, `ISDEAD_DATA_DIR`.

## Gaps

- **Storage:** videos and metadata are written to local disk (`ISDEAD_DATA_DIR`). Vercel's disk is ephemeral and request bodies are capped at 4.5 MB, so production needs object storage (S3/R2/GCS) with signed uploads and Firestore for metadata. The demo seed videos are read from `seed/` and need `outputFileTracingIncludes` on Vercel.
- **Recordings are WebM** (what MediaRecorder produces): they play in every modern desktop browser and Android, and in recent Safari, but there is no transcoding to MP4/HLS, and MediaRecorder files have no duration header (we store it and show it ourselves).
- **Not built:** trim and stitch, drawing and mouse emphasis, auto-transcripts and AI summaries, call-to-action buttons, per-viewer insights (only a view counter), password or private sharing (links are unlisted), folders and workspaces, a desktop or Chrome-extension recorder, and a persistent rate limiter (the current one is per-process).
- Screen capture needs a desktop browser; phones can record camera only.
- Sign-in has not been tested against the live Firebase project (keys pending).

Not affiliated with Loom or Atlassian. Apache-2.0.
