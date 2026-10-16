import AppKit
import SwiftUI

enum SettingsTab: String, CaseIterable, Identifiable {
    case video, preferences, about
    var id: String { rawValue }
    var title: String { switch self { case .video: "Video & audio"; case .preferences: "Preferences"; case .about: "About" } }
    var symbol: String { switch self { case .video: "video"; case .preferences: "gearshape"; case .about: "info.circle" } }
}

@MainActor
final class SettingsWindow: NSObject, NSWindowDelegate, ObservableObject {
    static let shared = SettingsWindow()
    @Published var tab: SettingsTab = .video
    private var window: NSWindow?

    func show(tab: SettingsTab? = nil) {
        if let tab { self.tab = tab }
        if window == nil {
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 620, height: 480), styleMask: [.titled, .closable, .fullSizeContentView], backing: .buffered, defer: false)
            w.title = "LoomIsDead Settings"; w.titlebarAppearsTransparent = true; w.isReleasedWhenClosed = false; w.delegate = self
            let host = NSHostingView(rootView: SettingsView(model: self)); host.sizingOptions = []
            w.contentView = host; w.center(); window = w
        }
        AppDelegate.current?.windowOpened()
        window?.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        Analytics.track("app_settings_opened", ["tab": self.tab.rawValue])
    }
    func windowWillClose(_ notification: Notification) { AppDelegate.current?.windowClosed() }
}

struct SettingsView: View {
    @ObservedObject var model: SettingsWindow
    @ObservedObject var s = SettingsStore.shared
    @ObservedObject var devices = Devices.shared
    @State private var autoUpdate = AppDelegate.current?.automaticallyChecksForUpdates ?? true

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 2) {
                ForEach(SettingsTab.allCases) { t in
                    Button { model.tab = t } label: {
                        Label(t.title, systemImage: t.symbol).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).frame(height: 30)
                            .background(RoundedRectangle(cornerRadius: 7).fill(model.tab == t ? DS.blue.opacity(0.16) : .clear))
                            .foregroundStyle(model.tab == t ? DS.blue : .primary)
                    }.buttonStyle(.plain)
                }
                Spacer()
            }.padding(.horizontal, 10).padding(.top, 44).frame(width: 170).background(Color.primary.opacity(0.03))
            Divider()
            ScrollView { content.padding(24).frame(maxWidth: .infinity, alignment: .leading) }.padding(.top, 20)
        }
        .frame(width: 620, height: 480)
    }

    @ViewBuilder private var content: some View {
        switch model.tab {
        case .video: video
        case .preferences: preferences
        case .about: about
        }
    }

    private func row<C: View>(_ title: String, _ detail: String, @ViewBuilder control: () -> C) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 13, weight: .semibold))
                Text(detail).font(.system(size: 11)).foregroundStyle(.secondary)
            }
            Spacer()
            control()
        }.padding(.vertical, 4)
    }

    private var video: some View {
        Form {
            Section {
                row("Video Quality", "Auto chooses best available option") {
                    Picker("", selection: $s.quality) { ForEach(VideoQuality.allCases) { Text($0 == .auto ? "Auto (native)" : $0.rawValue).tag($0) } }.labelsHidden().fixedSize()
                }
                row("Frame rate", "60 fps looks smoother but makes bigger files") {
                    Picker("", selection: $s.fps) { Text("30 fps").tag(30); Text("60 fps").tag(60) }.labelsHidden().fixedSize()
                }
                row("Camera Quality", s.cameraQuality.detail) {
                    Picker("", selection: $s.cameraQuality) { ForEach(CameraQuality.allCases) { Text($0.title).tag($0) } }.labelsHidden().fixedSize()
                }
                row("Recording Controls", "Choose to hide recording controls") {
                    Picker("", selection: $s.controls) { ForEach(ControlsVisibility.allCases) { Text($0.title).tag($0) } }.labelsHidden().fixedSize()
                }
            }
            Section {
                row("Highlight mouse clicks", "Help your viewers follow along easily") { Toggle("", isOn: $s.highlightClicks).labelsHidden().toggleStyle(.switch) }
                row("Recording countdown", "Turn the recording countdown on or off") { Toggle("", isOn: $s.showCountdown).labelsHidden().toggleStyle(.switch) }
                row("Flip camera", "Flip the orientation of your camera") { Toggle("", isOn: $s.flipCamera).labelsHidden().toggleStyle(.switch) }
                row("Persist camera bubble location", "Leave the camera bubble at its last position") { Toggle("", isOn: $s.persistBubbleLocation).labelsHidden().toggleStyle(.switch) }
                row("Use system audio", "Record audio from other apps on your device") { Toggle("", isOn: $s.recordSystemAudio).labelsHidden().toggleStyle(.switch) }
                row("Recording sounds", "Play a sound when recording starts, pauses and stops") { Toggle("", isOn: $s.playSounds).labelsHidden().toggleStyle(.switch) }
            }
        }.formStyle(.grouped)
    }

    private var preferences: some View {
        Form {
            Section("System") {
                row("Automatically install updates", "LoomIsDead updates itself in the background") {
                    Toggle("", isOn: $autoUpdate).labelsHidden().toggleStyle(.switch).onChange(of: autoUpdate) { _, v in AppDelegate.current?.automaticallyChecksForUpdates = v }
                }
                row("Launch at startup", "Open LoomIsDead when you log in") { Toggle("", isOn: $s.launchAtLogin).labelsHidden().toggleStyle(.switch) }
            }
            Section("After recording") {
                Picker("When a recording finishes", selection: $s.afterRecording) { ForEach(SettingsStore.AfterRecording.allCases) { Text($0.title).tag($0) } }
            }
            Section("Saving and sharing") {
                LabeledContent("Save videos to") {
                    HStack {
                        Text((s.saveFolder as NSString).abbreviatingWithTildeInPath).lineLimit(1).truncationMode(.middle).foregroundStyle(.secondary)
                        Button("Change…") { pickFolder() }
                    }
                }
                LabeledContent("Share links") { TextField("", text: $s.shareBaseURL).textFieldStyle(.roundedBorder).frame(width: 260) }
                Text("Self-hosting LoomIsDead? Point share links at your own server.").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            Section("Video shortcuts") {
                LabeledContent("Start/stop") { key("⌘⇧L") }
                LabeledContent("Pause/unpause") { key("⌥⇧P") }
                LabeledContent("Restart") { key("⌘⇧R") }
                LabeledContent("Cancel") { key("⌥⇧C") }
                LabeledContent("Draw") { key("⌘⇧D") }
                LabeledContent("Confetti") { key("⌃⌘C") }
            }
        }.formStyle(.grouped)
    }

    private var about: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                TombstoneMark(size: 56)
                VStack(alignment: .leading, spacing: 4) {
                    Text("LoomIsDead").font(.system(size: 22, weight: .bold))
                    Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev") (\(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"))").foregroundStyle(.secondary)
                }
            }
            Text("A free, open-source screen and camera recorder. No account, no time limit, no video cap.").fixedSize(horizontal: false, vertical: true)
            HStack {
                Button("Check for updates…") { AppDelegate.current?.checkForUpdates() }
                Button("Source code") { NSWorkspace.shared.open(URL(string: "https://github.com/tommy-muckstack/loomisdead")!) }
                Button("More IsDead apps") { NSWorkspace.shared.open(URL(string: "https://yourappisdead.com")!) }
            }
            Text("Apache-2.0. LoomIsDead is an independent project, not affiliated with Loom, Inc. or Atlassian.").font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            Toggle("Send anonymous usage stats", isOn: Binding(get: { !UserDefaults.standard.bool(forKey: "analyticsOptOut") }, set: { UserDefaults.standard.set(!$0, forKey: "analyticsOptOut") }))
        }
    }

    private func key(_ k: String) -> some View {
        Text(k).font(.system(size: 12, weight: .medium, design: .rounded)).padding(.horizontal, 8).padding(.vertical, 3).background(RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(0.08)))
    }

    private func pickFolder() {
        let p = NSOpenPanel(); p.canChooseDirectories = true; p.canChooseFiles = false; p.canCreateDirectories = true; p.prompt = "Choose"
        guard p.runModal() == .OK, let url = p.url else { return }
        let old = s.folderURL
        // Move existing recordings so the library keeps working.
        for v in Library.shared.videos { try? FileManager.default.moveItem(at: old.appendingPathComponent(v.fileName), to: url.appendingPathComponent(v.fileName)) }
        s.saveFolder = url.path
        Library.shared.load()
    }
}
