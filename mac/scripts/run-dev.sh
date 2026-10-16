#!/bin/bash
# Dev runner: build, assemble LoomIsDead.app (TCC needs a real bundle with
# usage strings), sign with the Developer ID when present (ad-hoc signatures
# change identity every rebuild and macOS re-prompts for Screen Recording), launch.
set -euo pipefail
cd "$(dirname "$0")/.."
APP_NAME="LoomIsDead"; EXEC="LoomIsDead"; BUNDLE_ID="com.muckstack.loomisdead"
BUILD_DIR=".build/debug"; APP_DIR=".build/dev/$APP_NAME.app"
swift build
pkill -f "$APP_NAME.app/Contents/MacOS/$EXEC" 2>/dev/null || true
rm -rf "$APP_DIR"; mkdir -p "$APP_DIR/Contents/"{MacOS,Frameworks,Resources}
cp "$BUILD_DIR/$EXEC" "$APP_DIR/Contents/MacOS/"
cp assets/AppIcon.icns "$APP_DIR/Contents/Resources/AppIcon.icns"
[ -d "$BUILD_DIR/${EXEC}_${EXEC}.bundle" ] && cp -R "$BUILD_DIR/${EXEC}_${EXEC}.bundle" "$APP_DIR/Contents/Resources/"
while IFS= read -r slice; do for fw in "$slice"/*.framework; do [ -d "$fw" ] && cp -R "$fw" "$APP_DIR/Contents/Frameworks/"; done; done < <(find .build/artifacts -type d -name "macos-arm64_x86_64" 2>/dev/null)
install_name_tool -add_rpath "@executable_path/../Frameworks" "$APP_DIR/Contents/MacOS/$EXEC" 2>/dev/null || true
VERSION="${RELEASE_VERSION:-0.1.0}"; BUILD="${RELEASE_BUILD:-1}"
scripts/write-plist.sh "$APP_DIR/Contents/Info.plist" "$VERSION" "$BUILD"
IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null | grep -m1 "Developer ID Application" | sed 's/.*"\(.*\)"/\1/')
codesign --force --deep --sign "${IDENTITY:--}" "$APP_DIR"
if [ -n "${LID_ROUTE:-}" ]; then open --env "LID_ROUTE=$LID_ROUTE" "$APP_DIR"; else open "$APP_DIR"; fi
echo "Launched $APP_DIR (signed: ${IDENTITY:-ad-hoc})"
