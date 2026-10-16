# LoomIsDead

A free, open-source Mac app for recording your screen and camera, plus the public watch page where shared videos live. Part of [IsDead](https://yourappisdead.com): open-source clones of paid SaaS. The website is served at `https://yourappisdead.com/loomisdead`; shared videos live at `/loomisdead/v/<id>`.

- **Mac app** (`mac/`): the recorder. Signed, notarized and auto-updating with Sparkle. See `mac/README.md`.
- **Homepage** (`/`): follows the structure of loom.com's homepage with original copy and CSS art. Every call to action downloads the Mac app.
- **Download** (`/download`): 307 to `https://github.com/tommy-muckstack/loomisdead/releases/latest/download/LoomIsDead.dmg`, the latest release.
- **Watch page** (`/v/<id>`, public, no account needed): custom player (seek, speed, mute, fullscreen, keyboard shortcuts), emoji reactions that float over the video, timestamped comments (click one to jump there, pins on the timeline), view counting once per browser session with crawlers ignored. The uploader's session can rename, delete and moderate comments.
- **Gone:** the in-browser recorder, the library, sign-in and the pricing page. `/app`, `/app/*`, `/login`, `/pricing` and `/compare` 308 to `/`.

Design: theme `loom` in `vendor/isdead-design`; font Urbanist (OFL) as a lookalike for Loom's proprietary face. Icon: the IsDead tombstone-with-X on `#1868DB` (`app/icon.svg`, `app/apple-icon.png`, `components/Logo.tsx`).

## Mac app uploads

Vercel caps function request bodies at 4.5 MB, so the Mac app uploads recordings straight to a dedicated Vercel Blob store (`loomisdead-videos`, public) and only registers them with the server. Every call carries the guest session cookie.

1. `POST /loomisdead/api/session/guest` → `200 { ok: true }` and sets `isdead_guest` (HMAC-signed, 180 days) when there is no session yet.
2. `POST /loomisdead/api/videos/direct` with JSON `{ "size": <bytes>, "contentType": "video/mp4" }` → `200 { "clientToken", "pathname" }`. `pathname` is `videos/<20 random chars>.mp4`. Limits: 500 MB; `video/mp4`, `video/quicktime` or `video/webm`; the token is valid for one hour and only for that pathname. 401 without a session, 400 for a bad body, 429 when rate-limited, 503 if Blob isn't configured.
3. `PUT https://blob.vercel-storage.com/<pathname>` with headers `authorization: Bearer <clientToken>`, `x-api-version: 7`, `x-content-type: video/mp4` and the file as the body → `200 { "url", "downloadUrl", "pathname", "contentType", "contentDisposition" }`. A different pathname or content type gets a 403.
4. `POST /loomisdead/api/videos/direct/complete` with JSON `{ "url": <url from step 3>, "title": "…", "duration": <seconds>, "thumb": "data:image/jpeg;base64,…" (optional, ≤ 400 KB) }` → `201 { "id", "video" }`. The server only accepts URLs on its own store under `videos/`, and reads size and type with `head()` rather than trusting the client.
5. The share link is `https://yourappisdead.com/loomisdead/v/<id>`. The media route redirects Blob-hosted videos to the CDN (which handles Range requests); `?download=1` asks for an attachment.

Deleting a video through `DELETE /api/videos/<id>` also deletes its blob. The older multipart `POST /api/videos` (bytes through the function, about 4 MB in production) still works for small files.

## Run

```
npm ci
npm run dev            # http://localhost:3000/loomisdead
npm test && npm run typecheck
```

Env (production): `BLOB_READ_WRITE_TOKEN` (from the connected Blob store), `AUTH_SECRET` (guest sessions), `FIREBASE_SERVICE_ACCOUNT_JSON` (Firestore metadata), `NEXT_PUBLIC_FIREBASE_*`, optional `ISDEAD_DATA_DIR` (local file storage when Firestore isn't configured).

## Gaps

- **Not built on the watch page:** auto-transcripts and AI summaries, call-to-action buttons, per-viewer insights (only a view counter), password or private sharing (links are unlisted), folders and workspaces.
- The rate limiter is per-process, not shared across function instances.
- Blob-hosted videos are public to anyone who has the 20-character URL; the share page itself is unlisted, not private.

Not affiliated with Loom, Inc. or Atlassian. Apache-2.0.
