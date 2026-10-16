import AVFoundation
import AppKit
import SwiftUI

/// The recorder menu that drops from the menu-bar icon: record mode, what to
/// capture, camera, microphone, and the big Start recording button. While it is
/// open the camera bubble previews, exactly like LoomIsDead's control menu.
@MainActor
final class ControlMenu: NSObject, NSWindowDelegate {
    static let shared = ControlMenu()
    private var panel: KeyPanel?
    private(set) var isOpen = false
    private var clickMonitor: Any?

    func toggle(from button: NSStatusBarButton?) { isOpen ? close() : open(from: button) }

    func open(from button: NSStatusBarButton? = nil) {
        guard !RecordingSession.shared.isActive else { return }
        let host = NSHostingView(rootView: ControlMenuView())
        host.sizingOptions = []
        let size = fittedSize(ControlMenuView())
        if panel == nil {
            let p = KeyPanel(contentRect: NSRect(origin: .zero, size: size), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.isFloatingPanel = true; p.level = .popUpMenu; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = true
            p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient]; p.delegate = self
            panel = p
        }
        guard let panel else { return }
        panel.contentView = host
        var origin: NSPoint
        if let button, let w = button.window {
            let r = w.convertToScreen(button.convert(button.bounds, to: nil))
            origin = NSPoint(x: r.midX - size.width / 2, y: r.minY - size.height - 6)
            if let screen = w.screen?.visibleFrame { origin.x = min(max(origin.x, screen.minX + 8), screen.maxX - size.width - 8) }
        } else if let screen = NSScreen.main?.visibleFrame {
            origin = NSPoint(x: screen.maxX - size.width - 16, y: screen.maxY - size.height - 8)
        } else { origin = .zero }
        panel.setFrame(NSRect(origin: origin, size: size), display: true)
        panel.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        isOpen = true
        CameraBubble.shared.resetPosition()
        previewCamera()
        clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, let p = self.panel else { return }
                if let b = CameraBubble.shared.frame, b.contains(NSEvent.mouseLocation) { return }
                if !p.frame.contains(NSEvent.mouseLocation) { self.close() }
            }
        }
        Analytics.track("app_recorder_opened")
    }

    func close() {
        guard isOpen else { return }
        isOpen = false
        panel?.orderOut(nil)
        if let clickMonitor { NSEvent.removeMonitor(clickMonitor) }; clickMonitor = nil
        if !RecordingSession.shared.isActive { CameraBubble.shared.hide(); Camera.shared.stop() }
    }

    /// Re-measure after content changes height.
    func relayout() {
        guard let panel else { return }
        let size = fittedSize(ControlMenuView()); var f = panel.frame
        f.origin.y += f.height - size.height; f.size = size; panel.setFrame(f, display: true, animate: false)
    }

    func previewCamera() {
        let s = SettingsStore.shared
        guard isOpen, !RecordingSession.shared.isActive else { return }
        if s.recordMode.usesCamera, Permissions.status(.video) == .notDetermined {
            Task { @MainActor in if await Permissions.camera() { self.previewCamera() } }; return
        }
        if s.recordMode.usesCamera, Permissions.status(.video) == .authorized, let cam = Devices.shared.camera(for: s.cameraID) {
            Camera.shared.start(camera: cam, quality: s.cameraQuality)
            CameraBubble.shared.show(cameraOnly: s.recordMode == .camera)
        } else { CameraBubble.shared.hide(); Camera.shared.stop() }
    }

    func windowDidResignKey(_ notification: Notification) {
        // Picking from a pop-up menu briefly steals key; only close on real outside clicks (monitor above).
    }
}

final class KeyPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override func cancelOperation(_ sender: Any?) { MainActor.assumeIsolated { ControlMenu.shared.close() } }
}

struct ControlMenuView: View {
    @ObservedObject var s = SettingsStore.shared
    @ObservedObject var devices = Devices.shared
    @ObservedObject var library = Library.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header
            VStack(spacing: 10) {
                screenRow
                cameraRow
                micRow
            }
            Button { RecordingSession.shared.start() } label: {
                HStack(spacing: 8) { Circle().strokeBorder(.white, lineWidth: 2).frame(width: 14, height: 14).overlay(Circle().fill(.white).frame(width: 6, height: 6)); Text("Start recording") }
            }
            .buttonStyle(PrimaryButtonStyle(color: DS.record))
            .keyboardShortcut(.defaultAction)
            .help("Start recording (⌘⇧L)")
            rail
        }
        .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
        .frame(width: 320)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(DS.panel))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DS.panelStroke))
        .environment(\.colorScheme, .dark)
        .onChange(of: s.captureArea) { _, _ in ControlMenu.shared.previewCamera() }
        .onChange(of: s.cameraOn) { _, _ in ControlMenu.shared.previewCamera() }
        .onChange(of: s.cameraID) { _, _ in ControlMenu.shared.previewCamera() }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Button { ControlMenu.shared.close(); LibraryWindow.shared.show() } label: {
                HStack(spacing: 8) { TombstoneMark(size: 24); Text("LoomIsDead").font(.system(size: 14, weight: .bold)).foregroundStyle(DS.textStrong) }
            }.buttonStyle(.plain).help("My Videos")
            Spacer()
            Button { ControlMenu.shared.close() } label: {
                Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(DS.textSecondary).frame(width: 28, height: 28)
            }.buttonStyle(.plain).help("Close")
        }
    }

    private var screenRow: some View {
        Menu {
            ForEach([CaptureArea.fullScreen, .window, .customSize]) { a in
                Button { s.captureArea = a } label: { Label((s.captureArea == a ? "✓ " : "") + a.title, systemImage: a.symbol) }
            }
            if NSScreen.screens.count > 1 {
                Menu("Select display") {
                    ForEach(Array(NSScreen.screens.enumerated()), id: \.offset) { _, screen in
                        let id = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? UInt32 ?? 0
                        Button((RecordingSession.displayID(preferred: s.displayID) == id ? "✓ " : "") + screen.localizedName) { s.displayID = id; s.captureArea = .fullScreen }
                    }
                }
            }
            Section("More") {
                Button { s.captureArea = .cameraOnly } label: { Label((s.captureArea == .cameraOnly ? "✓ " : "") + CaptureArea.cameraOnly.title, systemImage: CaptureArea.cameraOnly.symbol) }
            }
        } label: {
            MenuRow(symbol: s.captureArea.symbol, title: areaTitle) { Image(systemName: "chevron.down").font(.system(size: 11, weight: .semibold)).foregroundStyle(DS.textSecondary) }
        }.menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).help("Screen Options")
    }

    private var areaTitle: String {
        if s.captureArea == .fullScreen, NSScreen.screens.count > 1 {
            let id = RecordingSession.displayID(preferred: s.displayID)
            let name = NSScreen.screens.first { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? UInt32) == id }?.localizedName
            return name.map { "Full screen · \($0)" } ?? "Full screen"
        }
        return s.captureArea.title
    }

    private var cameraOnlyMode: Bool { s.captureArea == .cameraOnly }
    private var cameraActive: Bool { (s.cameraOn || cameraOnlyMode) && !devices.cameras.isEmpty }

    private var cameraRow: some View {
        ZStack(alignment: .trailing) {
            Menu {
                Button("No Camera") { s.cameraOn = false }.disabled(cameraOnlyMode)
                Divider()
                ForEach(devices.cameras, id: \.uniqueID) { c in
                    Button((cameraActive && c.uniqueID == devices.camera(for: s.cameraID)?.uniqueID ? "✓ " : "") + Devices.clean(c.localizedName)) { s.cameraID = c.uniqueID; s.cameraOn = true }
                }
                if devices.cameras.isEmpty { Text("No cameras found") }
            } label: {
                MenuRow(symbol: cameraActive ? "video" : "video.slash", title: cameraActive ? devices.name(camera: s.cameraID) : "No Camera", dimmed: !cameraActive) { Color.clear.frame(width: 33, height: 26) }
            }.menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).help("Camera Selector")
            Button { if !cameraOnlyMode { s.cameraOn.toggle() } } label: { OnOffPill(on: cameraActive) }
                .buttonStyle(.plain).padding(.trailing, 14).disabled(devices.cameras.isEmpty || cameraOnlyMode)
                .help(cameraOnlyMode ? "Camera only needs the camera" : (cameraActive ? "Turn camera off" : "Turn camera on"))
        }
    }

    private var micActive: Bool { s.micOn && !devices.microphones.isEmpty }

    private var micRow: some View {
        ZStack(alignment: .trailing) {
            Menu {
                Button("No Microphone") { s.micOn = false }
                Divider()
                Button((micActive && s.microphoneID.isEmpty ? "✓ " : "") + "Default - " + (devices.microphone(for: "").map { Devices.clean($0.localizedName) } ?? "")) { s.microphoneID = ""; s.micOn = true }
                ForEach(devices.microphones, id: \.uniqueID) { m in
                    Button((micActive && m.uniqueID == s.microphoneID ? "✓ " : "") + Devices.clean(m.localizedName)) { s.microphoneID = m.uniqueID; s.micOn = true }
                }
                Divider()
                Toggle("Record computer sounds", isOn: $s.recordSystemAudio).disabled(cameraOnlyMode)
            } label: {
                MenuRow(symbol: micActive ? "mic" : "mic.slash", title: micActive ? devices.name(microphone: s.microphoneID) : "No Microphone", dimmed: !micActive) { Color.clear.frame(width: 33, height: 26) }
            }.menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).help("Mic Selector")
            Button { s.micOn.toggle() } label: { OnOffPill(on: micActive) }
                .buttonStyle(.plain).padding(.trailing, 14).disabled(devices.microphones.isEmpty)
                .help(micActive ? "Turn microphone off" : "Turn microphone on")
        }
    }

    private var rail: some View {
        HStack {
            railButton("rectangle.stack", "Library") { ControlMenu.shared.close(); LibraryWindow.shared.show() }
            Spacer()
            railButton("square.and.arrow.up", "Upload") { ControlMenu.shared.close(); LibraryWindow.shared.show(); LibraryWindow.shared.importVideo() }
            Spacer()
            railButton("gearshape", "Settings") { ControlMenu.shared.close(); SettingsWindow.shared.show() }
            Spacer()
            Menu {
                Button("Open library") { ControlMenu.shared.close(); LibraryWindow.shared.show() }
                Button("Settings…") { ControlMenu.shared.close(); SettingsWindow.shared.show() }
                Button("Check for updates…") { ControlMenu.shared.close(); AppDelegate.current?.checkForUpdates() }
                Button("About LoomIsDead") { ControlMenu.shared.close(); SettingsWindow.shared.show(tab: .about) }
                Button("Help") { NSWorkspace.shared.open(URL(string: "https://github.com/tommy-muckstack/loomisdead#readme")!) }
                Divider()
                Button("Quit LoomIsDead") { NSApp.terminate(nil) }
            } label: { railLabel("ellipsis", "More") }
                .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).fixedSize()
        }
        .padding(.horizontal, 14).padding(.top, 2)
    }

    private func railButton(_ symbol: String, _ title: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) { railLabel(symbol, title) }.buttonStyle(.plain)
    }
    private func railLabel(_ symbol: String, _ title: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: symbol).font(.system(size: 15, weight: .medium)).frame(width: 36, height: 28)
            Text(title).font(.system(size: 11, weight: .medium))
        }.foregroundStyle(DS.textSecondary).contentShape(Rectangle())
    }
}

/// SwiftUI's ideal size for a view (NSHostingView.fittingSize is zero when sizingOptions is empty).
@MainActor
func fittedSize<V: View>(_ view: V, width: CGFloat? = nil) -> NSSize {
    NSHostingController(rootView: view).sizeThatFits(in: NSSize(width: width ?? 10_000, height: 10_000))
}
