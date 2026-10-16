#!/bin/bash
set -euo pipefail
# Release build for DIRECT DOWNLOAD: universal binary → Developer ID + hardened
# runtime → notarize + staple → DMG → notarize + staple → Sparkle EdDSA sign →
# upload (Vercel Blob: stable + versioned DMG + appcast) → GitHub release.
# Shares the MuckStack blob store with Mumbls/My Man: every path is prefixed
# "loomisdead-"; never touch the other apps' files.
#
# Usage: ./scripts/build-direct.sh [--skip-notarize] [--no-upload]
# Env:   RELEASE_VERSION RELEASE_BUILD  (defaults below)
#        BLOB_READ_WRITE_TOKEN (or .vercel/.env / .env.local), APPLE_ID+APPLE_APP_PASSWORD (else keychain profile)
cd "$(dirname "$0")/.."; ROOT="$(pwd)"
APP_NAME="LoomIsDead"; EXEC="LoomIsDead"; SLUG="loomisdead"
VERSION="${RELEASE_VERSION:-0.1.0}"; BUILD_NUMBER="${RELEASE_BUILD:-1}"
TEAM_ID="${APPLE_TEAM_ID:-K8NAZ76CBQ}"; NOTARY_PROFILE="mumbls-notary"; SPARKLE_ACCOUNT="loomisdead"
BLOB_HOST="https://ihvfw4x5q9iy9zx1.public.blob.vercel-storage.com"; APPCAST_URL="$BLOB_HOST/$SLUG-appcast.xml"
GH_REPO="tommy-muckstack/loomisdead"
SKIP_NOTARIZE=false; NO_UPLOAD=false
for a in "$@"; do case "$a" in --skip-notarize) SKIP_NOTARIZE=true;; --no-upload) NO_UPLOAD=true;; esac; done
[ -f "$ROOT/secrets.env" ] && { set -a; source "$ROOT/secrets.env"; set +a; }

IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')
[ -n "$IDENTITY" ] || { echo "ERROR: no Developer ID Application certificate"; exit 1; }
echo "==> $APP_NAME $VERSION ($BUILD_NUMBER) — signing as $IDENTITY"

echo "==> Building universal release..."
swift build -c release --arch arm64 --arch x86_64
PRODUCTS="$(swift build -c release --arch arm64 --arch x86_64 --show-bin-path)"
BINARY="$PRODUCTS/$EXEC"; [ -f "$BINARY" ] || { echo "ERROR: $BINARY missing"; exit 1; }

DIST="$ROOT/.build/dist"; APP_DIR="$DIST/$APP_NAME.app"; rm -rf "$APP_DIR"; mkdir -p "$APP_DIR/Contents/"{MacOS,Frameworks,Resources}
cp "$BINARY" "$APP_DIR/Contents/MacOS/$EXEC"
install_name_tool -add_rpath "@executable_path/../Frameworks" "$APP_DIR/Contents/MacOS/$EXEC" 2>/dev/null || true
while IFS= read -r slice; do for fw in "$slice"/*.framework; do [ -d "$fw" ] && cp -aR "$fw" "$APP_DIR/Contents/Frameworks/"; done; done < <(find "$ROOT/.build/artifacts" -type d -name "macos-arm64_x86_64")
[ -d "$PRODUCTS/${EXEC}_${EXEC}.bundle" ] && cp -R "$PRODUCTS/${EXEC}_${EXEC}.bundle" "$APP_DIR/Contents/Resources/"
cp assets/AppIcon.icns "$APP_DIR/Contents/Resources/AppIcon.icns"
scripts/write-plist.sh "$APP_DIR/Contents/Info.plist" "$VERSION" "$BUILD_NUMBER"
/usr/libexec/PlistBuddy -c "Add :NSHumanReadableCopyright string 'Apache-2.0. Not affiliated with Loom, Inc. or Atlassian.'" "$APP_DIR/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :SUAutomaticallyUpdate bool true" -c "Add :SUScheduledCheckInterval integer 3600" "$APP_DIR/Contents/Info.plist"

echo "==> Signing (hardened runtime)..."
SP="$APP_DIR/Contents/Frameworks/Sparkle.framework/Versions/B"
for x in "$SP"/XPCServices/*.xpc "$SP/Updater.app" "$SP/Autoupdate"; do [ -e "$x" ] && codesign --force --timestamp --options runtime --sign "$IDENTITY" "$x"; done
for fw in "$APP_DIR"/Contents/Frameworks/*.framework; do codesign --force --timestamp --options runtime --sign "$IDENTITY" "$fw"; done
codesign --force --deep --timestamp --options runtime --entitlements "$ROOT/direct.entitlements" --sign "$IDENTITY" "$APP_DIR"
codesign --verify --deep --strict --verbose=2 "$APP_DIR"

notarize() { for i in 1 2 3; do
  if [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_APP_PASSWORD:-}" ]; then xcrun notarytool submit "$1" --apple-id "$APPLE_ID" --team-id "$TEAM_ID" --password "$APPLE_APP_PASSWORD" --no-s3-acceleration --wait && return 0
  else xcrun notarytool submit "$1" --keychain-profile "$NOTARY_PROFILE" --no-s3-acceleration --wait && return 0; fi
  echo "notarize attempt $i failed; retrying"; sleep 20; done; return 1; }

if ! $SKIP_NOTARIZE; then
  echo "==> Notarizing app..."; ZIP="$DIST/$SLUG-notarize.zip"; rm -f "$ZIP"; /usr/bin/ditto -c -k --keepParent "$APP_DIR" "$ZIP"; notarize "$ZIP"; rm -f "$ZIP"; xcrun stapler staple "$APP_DIR"
fi

DMG="$DIST/$SLUG-$VERSION.dmg"; rm -f "$DMG"
echo "==> Creating DMG..."
if ! create-dmg --volname "$APP_NAME $VERSION" --window-size 540 360 --icon-size 96 --icon "$APP_NAME.app" 140 180 --app-drop-link 400 180 --hide-extension "$APP_NAME.app" --no-internet-enable "$DMG" "$APP_DIR"; then
  STAGE="$DIST/.stage"; rm -rf "$STAGE"; mkdir -p "$STAGE"; cp -aR "$APP_DIR" "$STAGE/"; ln -s /Applications "$STAGE/Applications"
  hdiutil create -volname "$APP_NAME $VERSION" -srcfolder "$STAGE" -ov -format UDZO "$DMG"; rm -rf "$STAGE"
fi
if ! $SKIP_NOTARIZE; then codesign --force --timestamp --sign "$IDENTITY" "$DMG"; echo "==> Notarizing DMG..."; notarize "$DMG"; xcrun stapler staple "$DMG"; fi
cp "$DMG" "$DIST/$APP_NAME.dmg"

if $NO_UPLOAD; then echo "==> Built $DMG (no upload)"; exit 0; fi

SIGN_UPDATE="$(find "$ROOT/.build/artifacts" -path "*Sparkle/bin/sign_update" | head -1)"
SIG_OUT=$("$SIGN_UPDATE" --account "$SPARKLE_ACCOUNT" "$DMG")
ED_SIG=$(echo "$SIG_OUT" | sed -E 's/.*sparkle:edSignature="([^"]+)".*/\1/'); LEN=$(echo "$SIG_OUT" | sed -E 's/.*length="([^"]+)".*/\1/')
APPCAST="$DIST/$SLUG-appcast.xml"
cat > "$APPCAST" <<XML
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel>
<title>$APP_NAME</title><link>$APPCAST_URL</link><description>Updates for $APP_NAME</description><language>en</language>
<item><title>Version $VERSION</title><pubDate>$(date -u "+%a, %d %b %Y %H:%M:%S +0000")</pubDate>
<sparkle:version>$BUILD_NUMBER</sparkle:version><sparkle:shortVersionString>$VERSION</sparkle:shortVersionString><sparkle:minimumSystemVersion>15.0</sparkle:minimumSystemVersion>
<enclosure url="$BLOB_HOST/$SLUG-$VERSION.dmg" sparkle:edSignature="$ED_SIG" length="$LEN" type="application/octet-stream" /></item>
</channel></rss>
XML

[ -z "${BLOB_READ_WRITE_TOKEN:-}" ] && [ -f ".vercel/.env" ] && { set -a; source .vercel/.env; set +a; }
[ -z "${BLOB_READ_WRITE_TOKEN:-}" ] && [ -f ".env.local" ] && { set -a; source .env.local; set +a; }
[ -n "${BLOB_READ_WRITE_TOKEN:-}" ] || { echo "ERROR: BLOB_READ_WRITE_TOKEN missing"; exit 1; }
put() { # put <local> <blob name> <cache seconds> <content-type>
  curl -sS -f -X PUT "https://blob.vercel-storage.com/$2" -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN" -H "x-api-version: 7" -H "x-add-random-suffix: 0" -H "x-allow-overwrite: 1" -H "x-cache-control-max-age: $3" -H "Content-Type: $4" --data-binary "@$1" >/dev/null && echo "    uploaded $2"; }
echo "==> Uploading to Vercel Blob..."
put "$DMG" "$SLUG-$VERSION.dmg" 31536000 application/octet-stream
put "$DMG" "$SLUG.dmg" 300 application/octet-stream
put "$APPCAST" "$SLUG-appcast.xml" 300 application/xml

echo "==> GitHub release v$VERSION..."
cp "$DMG" "$DIST/$APP_NAME.dmg"
gh release create "v$VERSION" --repo "$GH_REPO" --title "$APP_NAME $VERSION" --notes "Signed + notarized Mac build. Download \`$APP_NAME.dmg\`, drag to Applications, grant Screen Recording, Camera and Microphone." "$DIST/$APP_NAME.dmg" "$DMG" || gh release upload "v$VERSION" --repo "$GH_REPO" --clobber "$DIST/$APP_NAME.dmg" "$DMG"
echo "==> Done: $BLOB_HOST/$SLUG.dmg  ·  https://github.com/$GH_REPO/releases/latest/download/$APP_NAME.dmg"
