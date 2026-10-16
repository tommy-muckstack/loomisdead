import AppKit
import SwiftUI

/// The floating recording controls: a dark vertical pill at the left edge
/// with Finish + timer, Pause/Resume, Restart, Cancel, Draw, Confetti and
/// Add Camera. Draggable. Hidden from the video unless Settings says Show.
@MainActor
final class ControlBar {
    private let panel: NSPanel
    init(session: RecordingSession, excludedFromVideo: Bool) {
        let host = NSHostingView(rootView: ControlBarView(session: session))
        host.sizingOptions = []
        let size = NSSize(width: 58 + 20, height: 520)
        let screen = NSScreen.main?.visibleFrame ?? .zero
        let saved = UserDefaults.standard.string(forKey: "controlBarOrigin").map(NSPointFromString)
        // Default: left edge, just above the camera bubble.
        let def = NSPoint(x: screen.minX + 8, y: screen.minY + CameraBubble.margin + SettingsStore.shared.bubbleSize.diameter + 8)
        let origin = saved.flatMap { pt in NSScreen.screens.contains { $0.visibleFrame.contains(pt) } ? pt : nil } ?? NSPoint(x: def.x, y: min(def.y, screen.maxY - size.height))
        panel = NSPanel(contentRect: NSRect(origin: origin, size: size), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isFloatingPanel = true; panel.level = .screenSaver; panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]; panel.isMovableByWindowBackground = true
        if excludedFromVideo { panel.sharingType = .none }
        host.frame = NSRect(origin: .zero, size: size); panel.contentView = host
        NotificationCenter.default.addObserver(forName: NSWindow.didMoveNotification, object: panel, queue: .main) { [panel] _ in
            UserDefaults.standard.set(NSStringFromPoint(panel.frame.origin), forKey: "controlBarOrigin")
        }
    }
    func show() {
        panel.orderFrontRegardless()
        InVideo.controls = [panel.windowNumber]
    }
    func close() { panel.orderOut(nil); InVideo.controls = [] }
}

struct ControlBarView: View {
    @ObservedObject var session: RecordingSession
    @ObservedObject var drawing = DrawingOverlay.shared
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 4) {
                Button { session.stop() } label: {
                    RoundedRectangle(cornerRadius: 3).fill(.white).frame(width: 13, height: 13)
                        .frame(width: 40, height: 40)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(session.state == .recording ? DS.record : Color.white.opacity(0.1)))
                }.buttonStyle(.plain).help("Finish Recording (⌘⇧L)").disabled(!session.isRecordingOrPaused)
                Text(Video.format(session.elapsed)).font(.system(size: 12, weight: .bold).monospacedDigit())
                    .foregroundStyle(session.state == .paused ? DS.textSecondary : .white).padding(.vertical, 4)
                barButton(session.state == .paused ? "play.fill" : "pause.fill", session.state == .paused ? "Resume Recording (⌥⇧P)" : "Pause Recording (⌥⇧P)", tint: session.state == .paused ? DS.blue : nil) { session.togglePause() }
                    .disabled(!session.isRecordingOrPaused)
                barButton("arrow.counterclockwise", "Restart (⌘⇧R)") { session.restart() }.disabled(!session.isRecordingOrPaused)
                barButton("trash", "Cancel (⌥⇧C)") { session.cancel() }
                if session.mode.usesScreen {
                    Rectangle().fill(Color.white.opacity(0.15)).frame(width: 28, height: 1).padding(.vertical, 4)
                    barButton("pencil.tip", "Draw (⌘⇧D)", tint: drawing.isOn ? DS.blue : nil) { session.toggleDraw() }.disabled(!session.isRecordingOrPaused)
                    barButton("party.popper", "Confetti (⌃⌘C)") { session.confetti() }.disabled(!session.isRecordingOrPaused)
                }
                if session.mode == .screenAndCamera, !session.cameraVisible {
                    barButton("video.badge.plus", "Add Camera") { session.addCamera() }
                }
            }
            .padding(8).frame(width: 58)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(DS.bar))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.white.opacity(0.15)))
            .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
            .animation(.easeOut(duration: 0.25), value: session.cameraVisible)
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxHeight: .infinity, alignment: .bottom)
    }
    private func barButton(_ symbol: String, _ help: String, tint: Color? = nil, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Image(systemName: symbol).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white).frame(width: 40, height: 40)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(tint ?? .clear))
                .contentShape(Rectangle())
        }.buttonStyle(BarButtonStyle()).help(help)
    }
}

private struct BarButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { BarButtonBody(configuration: configuration) }
    private struct BarButtonBody: View {
        let configuration: ButtonStyle.Configuration
        @State private var hover = false
        @Environment(\.isEnabled) private var enabled
        var body: some View {
            configuration.label
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.white.opacity(configuration.isPressed ? 0.2 : hover ? 0.1 : 0)))
                .opacity(enabled ? 1 : 0.35)
                .onHover { hover = $0 }
        }
    }
}
