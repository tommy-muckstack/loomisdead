import AVFoundation
import AppKit
import Combine
import ScreenCaptureKit

/// Drives one recording from "Start recording" to a saved video:
/// pick area → countdown → record (pause = new segment) → stitch → library.
@MainActor
final class RecordingSession: NSObject, ObservableObject {
    static let shared = RecordingSession()
    enum State: Equatable { case idle, choosing, countdown, recording, paused, finishing }
    @Published private(set) var state: State = .idle
    /// Seconds recorded so far, excluding pauses.
    @Published private(set) var elapsed: TimeInterval = 0
    @Published private(set) var cameraVisible = false
    var onStateChange: (() -> Void)?

    private(set) var mode: RecordMode = .screenAndCamera
    private var target: ScreenTarget?
    private var segments: [URL] = []
    private var screenSegment: ScreenSegment?
    private var segmentStart: Date?
    private var banked: TimeInterval = 0
    private var ticker: Timer?
    private var controlBar: ControlBar?
    private var areaFrame: AreaFrame?
    private var selection: SelectionOverlayCoordinator?
    private var startedAt = Date()
    private var countdownTask: Task<Void, Never>?

    var isActive: Bool { state != .idle }
    var isRecordingOrPaused: Bool { state == .recording || state == .paused }

    // MARK: Start

    func start() {
        guard state == .idle else { return }
        let s = SettingsStore.shared
        mode = s.recordMode
        Task { @MainActor in
            if mode.usesScreen, !Permissions.screenGranted {
                CGRequestScreenCaptureAccess()
                ControlMenu.shared.close(); PermissionsWindow.shared.show(reason: .screen); return
            }
            if mode.usesCamera, !(await Permissions.camera()) {
                if mode == .camera { ControlMenu.shared.close(); PermissionsWindow.shared.show(reason: .camera); return }
                mode = .screen
            }
            if mode.usesCamera, Devices.shared.camera(for: s.cameraID) == nil {
                if mode == .camera { Toast.show("Camera only needs a camera. Plug one in and try again.", systemImage: "video.slash"); return }
                mode = .screen
            }
            if s.micOn, !(await Permissions.microphone()) { ControlMenu.shared.close(); PermissionsWindow.shared.show(reason: .microphone); return }
            ControlMenu.shared.close()
            if mode.usesCamera {
                Camera.shared.start(camera: Devices.shared.camera(for: s.cameraID), quality: s.cameraQuality)
                CameraBubble.shared.show(cameraOnly: mode == .camera); cameraVisible = true
            } else { CameraBubble.shared.hide(); Camera.shared.stop(); cameraVisible = false }
            guard mode.usesScreen else { target = nil; beginCountdown(); return }
            switch s.captureArea {
            case .fullScreen, .cameraOnly:
                target = ScreenTarget(displayID: Self.displayID(preferred: s.displayID), rect: nil); beginCountdown()
            case .window:
                state = .choosing; onStateChange?()
                Toast.show("Hover over a window to select", systemImage: "macwindow", duration: 4)
                WindowPicker.shared.pick { [weak self] info in
                    guard let self else { return }
                    Toast.dismiss()
                    guard let info else { self.cancelChoosing(); return }
                    let mainH = NSScreen.screens[0].frame.height
                    let rect = CGRect(x: info.bounds.minX, y: mainH - info.bounds.maxY, width: info.bounds.width, height: info.bounds.height)
                    self.target = ScreenTarget(displayID: Self.displayID(containing: rect), rect: rect); self.beginCountdown()
                }
            case .customSize:
                state = .choosing; onStateChange?()
                let sel = SelectionOverlayCoordinator(frozenCapture: nil, idleTimeout: 30); sel.delegate = self; selection = sel; sel.showAll()
            }
        }
    }

    private func cancelChoosing() {
        state = .idle; onStateChange?()
        CameraBubble.shared.hide(); Camera.shared.stop(); cameraVisible = false
    }

    private func beginCountdown() {
        let s = SettingsStore.shared
        startedAt = Date(); segments = []; banked = 0; elapsed = 0
        if let r = target?.rect { areaFrame = AreaFrame(rect: r); areaFrame?.show() }
        state = .countdown; onStateChange?()
        if s.controls != .alwaysHide { controlBar = ControlBar(session: self, excludedFromVideo: s.controls == .hideInVideo); controlBar?.show() }
        runCountdown()
    }

    private func runCountdown() {
        countdownTask = Task { @MainActor in
            if mode == .camera { let s = SettingsStore.shared; await Camera.shared.prepareMicrophone(s.micOn ? Devices.shared.microphone(for: s.microphoneID) : nil) }
            if SettingsStore.shared.showCountdown {
                guard await CountdownOverlay.run() else { if state == .countdown { cancelNow() }; return }
            }
            guard state == .countdown, !Task.isCancelled else { return }
            await startSegment()
        }
    }

    private func startSegment() async {
        let s = SettingsStore.shared
        let mic = s.micOn ? Devices.shared.microphone(for: s.microphoneID) : nil
        let part = Library.supportFolder.appendingPathComponent("Parts", isDirectory: true)
        try? FileManager.default.createDirectory(at: part, withIntermediateDirectories: true)
        do {
            if mode.usesScreen, let target {
                let url = part.appendingPathComponent(UUID().uuidString + ".mp4")
                let seg = ScreenSegment(url: url)
                seg.onFailure = { [weak self] e in self?.failed(e) }
                try await seg.start(target: target, microphone: mic, systemAudio: s.recordSystemAudio, includeControls: s.controls == .show)
                screenSegment = seg; segments.append(url)
            } else {
                let url = part.appendingPathComponent(UUID().uuidString + ".mov")
                try await Camera.shared.startRecording(to: url)
                segments.append(url)
            }
            let first = state == .countdown
            segmentStart = Date()
            if first { Analytics.track("app_recording_started", ["mode": mode.rawValue, "area": mode.usesScreen ? s.captureArea.rawValue : "camera", "mic": mic != nil, "system_audio": s.recordSystemAudio]) }
            state = .recording; onStateChange?()
            if s.playSounds { Sounds.start() }
            if s.highlightClicks, mode.usesScreen { ClickHighlight.shared.start() }
            startTicker()
        } catch { failed(error) }
    }

    private func endSegment() async {
        if let seg = screenSegment { await seg.stop(); screenSegment = nil }
        else if mode == .camera { Camera.shared.resumeRecording(); _ = await Camera.shared.stopRecording() }
        if let st = segmentStart { banked += Date().timeIntervalSince(st) }
        segmentStart = nil; elapsed = banked
    }

    private func startTicker() {
        ticker?.invalidate()
        ticker = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, let st = self.segmentStart else { return }
                self.elapsed = self.banked + Date().timeIntervalSince(st)
            }
        }
    }

    // MARK: Controls

    func togglePause() {
        switch state {
        case .recording:
            state = .paused; onStateChange?(); ticker?.invalidate(); ClickHighlight.shared.stop()
            if SettingsStore.shared.playSounds { Sounds.pause() }
            if mode == .camera {
                // One continuous file: the movie output pauses in place (restarting it costs ~2 s).
                Camera.shared.pauseRecording()
                if let st = segmentStart { banked += Date().timeIntervalSince(st) }; segmentStart = nil; elapsed = banked
            } else { Task { await endSegment() } }
            Analytics.track("app_recording_paused")
        case .paused:
            if mode == .camera {
                Camera.shared.resumeRecording(); segmentStart = Date()
                state = .recording; onStateChange?(); startTicker()
                if SettingsStore.shared.playSounds { Sounds.start() }
            } else { Task { await startSegment() } }
        default: break
        }
    }

    /// Finish and save.
    func stop() {
        switch state {
        case .recording, .paused: break
        case .countdown: cancelNow(); return
        default: return
        }
        let wasMode = mode
        state = .finishing; onStateChange?(); ticker?.invalidate()
        Task { @MainActor in
            await endSegment()
            let parts = segments.filter { FileManager.default.fileExists(atPath: $0.path) }
            let dest = SettingsStore.shared.folderURL.appendingPathComponent(Library.fileName(for: startedAt))
            teardownOverlays()
            if SettingsStore.shared.playSounds { Sounds.stop() }
            do {
                guard !parts.isEmpty else { throw AgentError("EMPTY", "Nothing was recorded.") }
                try await SegmentJoiner.finalize(parts, into: dest)
                let v = await Library.shared.add(file: dest, mode: wasMode, createdAt: startedAt)
                Analytics.track("app_recording_finished", ["mode": wasMode.rawValue, "duration_s": Int(v.duration), "segments": parts.count])
                state = .idle; onStateChange?()
                AfterRecording.run(v)
            } catch {
                state = .idle; onStateChange?()
                Toast.show("Couldn't save the recording: \(error.localizedDescription)", systemImage: "exclamationmark.triangle")
            }
            segments = []
        }
    }

    /// Restart (asks first once something has been recorded).
    func restart() {
        guard [.recording, .paused, .countdown].contains(state) else { return }
        if state == .countdown { return }
        let wasRecording = state == .recording
        if wasRecording { togglePause() }
        guard Self.confirm(kind: "restart") else { if wasRecording { togglePause() }; return }
        countdownTask?.cancel(); ticker?.invalidate()
        Task { @MainActor in
            await endSegment(); discardParts()
            Analytics.track("app_recording_restarted")
            segments = []; banked = 0; elapsed = 0
            state = .countdown; onStateChange?()
            runCountdown()
        }
    }

    /// Cancel and throw away the recording (asks first once something has been recorded).
    func cancel() {
        guard [.recording, .paused, .countdown].contains(state) else { return }
        if state == .countdown { cancelNow(); return }
        let wasRecording = state == .recording
        if wasRecording { togglePause() }
        guard Self.confirm(kind: "cancel") else { if wasRecording { togglePause() }; return }
        cancelNow()
    }

    private func cancelNow() {
        countdownTask?.cancel(); ticker?.invalidate()
        CountdownOverlay.dismiss()
        state = .finishing
        Task { @MainActor in
            await endSegment(); discardParts(); teardownOverlays()
            Analytics.track("app_recording_deleted")
            state = .idle; onStateChange?()
        }
    }

    /// "Are you sure you want to cancel your recording?" — Resume / Cancel recording.
    private static func confirm(kind: String) -> Bool {
        let a = NSAlert()
        a.messageText = "Are you sure you want to \(kind) your recording?"
        a.informativeText = "Your current video progress will be lost."
        a.alertStyle = .warning
        a.addButton(withTitle: kind == "cancel" ? "Cancel recording" : "Restart recording").hasDestructiveAction = true
        a.addButton(withTitle: "Resume")
        NSApp.activate(ignoringOtherApps: true)
        a.window.level = .screenSaver + 1
        return a.runModal() == .alertFirstButtonReturn
    }

    /// Bubble hover X / control bar camera button.
    func closeCamera() {
        if state == .idle { SettingsStore.shared.cameraOn = false; CameraBubble.shared.hide(); Camera.shared.stop(); cameraVisible = false; return }
        guard mode == .screenAndCamera else { return }
        CameraBubble.shared.hide(); cameraVisible = false
    }
    func addCamera() {
        guard mode == .screenAndCamera, isActive else { return }
        CameraBubble.shared.show(); cameraVisible = true
    }

    func toggleDraw() { guard isRecordingOrPaused, mode.usesScreen else { return }; DrawingOverlay.shared.toggle() }
    func confetti() { guard isRecordingOrPaused, mode.usesScreen else { return }; Confetti.burst(); Analytics.track("app_confetti") }

    private func discardParts() { for p in segments { try? FileManager.default.removeItem(at: p) }; segments = [] }

    private func teardownOverlays() {
        controlBar?.close(); controlBar = nil
        areaFrame?.close(); areaFrame = nil
        ClickHighlight.shared.stop(); DrawingOverlay.shared.close()
        CameraBubble.shared.hide(); Camera.shared.stop(); cameraVisible = false
    }

    private func failed(_ error: Error) {
        guard state != .idle, state != .finishing else { return }
        let hadVideo = !segments.isEmpty && state != .countdown
        Toast.show("Recording stopped: \(error.localizedDescription)", systemImage: "exclamationmark.triangle")
        if hadVideo { state = .paused; stop() } else { ticker?.invalidate(); teardownOverlays(); discardParts(); state = .idle; onStateChange?() }
    }

    // MARK: Helpers

    static func displayID(preferred: UInt32) -> CGDirectDisplayID {
        let ids = NSScreen.screens.compactMap { $0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID }
        if preferred != 0, ids.contains(preferred) { return preferred }
        return (NSScreen.main?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID) ?? CGMainDisplayID()
    }
    static func displayID(containing rect: CGRect) -> CGDirectDisplayID {
        let best = NSScreen.screens.max { $0.frame.intersection(rect).width * $0.frame.intersection(rect).height < $1.frame.intersection(rect).width * $1.frame.intersection(rect).height }
        return (best?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID) ?? CGMainDisplayID()
    }
}

extension RecordingSession: SelectionOverlayDelegate {
    func selectionOverlayDidComplete(with rect: CGRect) {
        selection?.hideAll(); selection = nil
        guard rect.width >= 250, rect.height >= 250 else {
            Toast.show("Minimum area supported is 250 x 250", systemImage: "crop"); cancelChoosing(); return
        }
        target = ScreenTarget(displayID: Self.displayID(containing: rect), rect: rect.integral)
        beginCountdown()
    }
    func selectionOverlayDidCancel() { selection?.hideAll(); selection = nil; cancelChoosing() }
}

/// Dashed outline around the recorded window / custom area (excluded from the video).
@MainActor
final class AreaFrame {
    private let panel: NSPanel
    init(rect: CGRect) {
        panel = NSPanel(contentRect: rect.insetBy(dx: -3, dy: -3), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false; panel.ignoresMouseEvents = true; panel.level = .screenSaver
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]; panel.sharingType = .none
        let v = NSView(); v.wantsLayer = true
        let l = CAShapeLayer(); l.fillColor = nil; l.strokeColor = NSColor.white.cgColor; l.lineWidth = 2; l.lineDashPattern = [8, 5]
        l.path = CGPath(rect: CGRect(origin: .zero, size: panel.frame.size).insetBy(dx: 1, dy: 1), transform: nil)
        v.layer?.addSublayer(l); panel.contentView = v
    }
    func show() { panel.orderFrontRegardless() }
    func close() { panel.orderOut(nil) }
}

enum Sounds {
    static func start() { NSSound(named: "Tink")?.play() }
    static func pause() { NSSound(named: "Morse")?.play() }
    static func stop() { NSSound(named: "Glass")?.play() }
}
