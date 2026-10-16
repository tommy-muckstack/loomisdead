# LoomIsDead for Mac

A free, open-source screen and camera recorder for macOS. Menu-bar app, no account, no time limit, no video cap. Share links go to the LoomIsDead watch page, where viewers can react and comment without an account.

## Features

- **Recorder menu** from the menu-bar icon: Full screen (pick a display), Specific window, Custom size, or Camera only; camera and microphone pickers with On/Off pills; Record computer sounds.
- **Camera bubble**: round, 200 or 400 px, drag it anywhere; hover for Small / Medium / Close. Camera only mode records a 16:9 frame.
- **Countdown**: 3-2-1 with Cancel, Skip and click-to-pause.
- **Recording controls**: Finish, timer, Pause/Resume (segments are stitched without re-encoding), Restart, Cancel, Draw (strokes fade after 2 s), Confetti, Add Camera. Hidden from the final video by default.
- **Library** (⌘L): every recording on this Mac, search, sort, upload an existing video, copy link, show in Finder, delete to Trash.
- **Share**: Copy link uploads straight to storage (up to 500 MB) and copies `https://yourappisdead.com/loomisdead/v/<id>`.
- **Sparkle** auto-updates, signed and notarized.

| Shortcut | Action |
|---|---|
| ⌘⇧L | Open the recorder, start, or finish |
| ⌥⇧P | Pause / resume |
| ⌘⇧R | Restart |
| ⌥⇧C | Cancel |
| ⌘⇧D | Draw |
| ⌃⌘C | Confetti |

## Build

Requires macOS 15+ and Xcode 16+.

```bash
./scripts/run-dev.sh                       # build, bundle, sign, launch
LID_ROUTE=library ./scripts/run-dev.sh     # open a screen: menu | library | settings[:video|preferences|about] | onboarding | video:<id> | selftest (records ~5 s with a pause)
swift test
```

Headless helpers (run the bundled binary in `.build/dev/LoomIsDead.app/Contents/MacOS/`):
`--join a.mp4 b.mp4 out.mp4` stitches segments, `--import file.mov` adds a video, `--share file.mp4` uploads and prints the link, `--snapshot <view> out.png` renders a view.

## Release

```bash
RELEASE_VERSION=1.0.0 RELEASE_BUILD=1 ./scripts/build-direct.sh
```

Universal build → Developer ID + hardened runtime → notarize → DMG → Sparkle EdDSA signature (Keychain account `loomisdead`) → appcast + DMG on Vercel Blob → GitHub release asset `LoomIsDead.dmg` (the website's `/download` points at the latest release).

## Not affiliated

Apache-2.0. LoomIsDead is an independent project, not affiliated with Loom, Inc. or Atlassian. UI structure was studied from Loom's public desktop build; no Loom code, art, fonts or sounds are included.
