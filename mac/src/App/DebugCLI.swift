import AppKit

/// Headless hooks for testing without clicking through the UI:
///   LoomIsDead --join <part1> <part2> ... <out.mp4>   stitch segments like a paused recording
///   LoomIsDead --import <movie>                        add a file to the library
///   LoomIsDead --snapshot <menu|bar|countdown|onboarding|settings-video|settings-prefs> <out.png>
///   LoomIsDead --share <movie>                         import, upload and print the share link
@MainActor
enum DebugCLI {
    static func runIfRequested() -> Bool {
        let a = CommandLine.arguments
        guard a.count >= 3, ["--join", "--import", "--share", "--snapshot"].contains(a[1]) else { return false }
        Task { @MainActor in
            do {
                if a[1] == "--snapshot", a.count >= 4 {
                    try snapshot(a[2], to: URL(fileURLWithPath: a[3])); print("wrote \(a[3])")
                } else if a[1] == "--join" {
                    let urls = a.dropFirst(2).map { URL(fileURLWithPath: $0) }
                    try await SegmentJoiner.join(Array(urls.dropLast()), into: urls.last!)
                    print("joined → \(urls.last!.path)")
                } else if a[1] == "--share" {
                    let v = try await Library.shared.importFile(URL(fileURLWithPath: a[2]))
                    guard let link = await ShareUploader.shared.share(v, copy: false) else { print("error: upload failed"); exit(1) }
                    print("shared → \(link)")
                } else {
                    let v = try await Library.shared.importFile(URL(fileURLWithPath: a[2]))
                    print("imported \(v.id) \(v.durationLabel) \(v.width)x\(v.height) → \(v.fileURL.path)")
                }
                exit(0)
            } catch { print("error: \(error.localizedDescription)"); exit(1) }
        }
        return true
    }

    private static func snapshot(_ name: String, to url: URL) throws {
        let view: AnyView
        switch name {
        case "menu": view = AnyView(ControlMenuView())
        case "bar": view = AnyView(ControlBarView(session: RecordingSession.shared).frame(width: 80, height: 470).background(Color(white: 0.55)))
        case "countdown": view = AnyView(CountdownPreview().frame(width: 1000, height: 640))
        case "onboarding": view = AnyView(PermissionsView(reason: nil, done: {}))
        case "settings-video": SettingsWindow.shared.tab = .video; view = AnyView(SettingsView(model: SettingsWindow.shared))
        case "settings-prefs": SettingsWindow.shared.tab = .preferences; view = AnyView(SettingsView(model: SettingsWindow.shared))
        default: throw AgentError("SNAP", "unknown view")
        }
        let host = NSHostingView(rootView: view.environment(\.colorScheme, .dark))
        let size = fittedSize(view)
        host.frame = NSRect(origin: .zero, size: size)
        let w = NSWindow(contentRect: host.frame, styleMask: .borderless, backing: .buffered, defer: false)
        w.appearance = NSAppearance(named: .darkAqua); w.backgroundColor = NSColor(white: 0.16, alpha: 1); w.contentView = host
        host.layoutSubtreeIfNeeded(); RunLoop.main.run(until: Date().addingTimeInterval(0.6)); host.layoutSubtreeIfNeeded()
        guard let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) else { throw AgentError("SNAP", "no rep") }
        host.cacheDisplay(in: host.bounds, to: rep)
        try rep.representation(using: .png, properties: [:])!.write(to: url)
    }
}

import SwiftUI
