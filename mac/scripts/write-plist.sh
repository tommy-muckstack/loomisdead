#!/bin/bash
# write-plist.sh <Info.plist path> <version> <build>
set -euo pipefail
cat > "$1" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>LoomIsDead</string>
    <key>CFBundleIdentifier</key><string>com.muckstack.loomisdead</string>
    <key>CFBundleName</key><string>LoomIsDead</string>
    <key>CFBundleDisplayName</key><string>LoomIsDead</string>
    <key>CFBundleShortVersionString</key><string>$2</string>
    <key>CFBundleVersion</key><string>$3</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleIconFile</key><string>AppIcon</string>
    <key>LSMinimumSystemVersion</key><string>15.0</string>
    <key>LSUIElement</key><true/>
    <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
    <key>NSHighResolutionCapable</key><true/>
    <key>NSScreenCaptureUsageDescription</key>
    <string>LoomIsDead records your screen when you start a recording.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>LoomIsDead records your voice with your video when the microphone is on.</string>
    <key>NSAudioCaptureUsageDescription</key>
    <string>LoomIsDead records sound from your Mac when Computer audio is on.</string>
    <key>NSCameraUsageDescription</key>
    <string>LoomIsDead shows your camera in the bubble and records it with your video.</string>
    <key>SUFeedURL</key>
    <string>https://ihvfw4x5q9iy9zx1.public.blob.vercel-storage.com/loomisdead-appcast.xml</string>
    <key>SUPublicEDKey</key>
    <string>k84n69jUNgpSWXcG9kuTgSqzUDFqjkmCbpJEOEppWw0=</string>
    <key>SUEnableAutomaticChecks</key><true/>
</dict>
</plist>
PLIST
