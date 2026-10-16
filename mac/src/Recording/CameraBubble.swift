import AVFoundation
import AppKit
import SwiftUI

/// The draggable round camera bubble. It is an ordinary on-screen window, so
/// screen recordings pick it up exactly where the user put it. In Camera only
/// mode it becomes a 16:9 frame (¼ or ½ of the screen width) in the middle.
@MainActor
final class CameraBubble: NSObject {
    static let shared = CameraBubble()
    private var panel: NSPanel?
    private var preview: BubbleView?
    private(set) var isVisible = false
    private var cameraOnly = false
    var windowNumber: Int? { panel?.windowNumber }
    static let margin: CGFloat = 18

    func show(cameraOnly: Bool = false) {
        let s = SettingsStore.shared
        self.cameraOnly = cameraOnly
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let size: NSSize
        if cameraOnly { let w = (screen.width * s.bubbleSize.widthFraction).rounded(); size = NSSize(width: w, height: (w * 9 / 16).rounded()) }
        else { let d = min(s.bubbleSize.diameter, screen.height - 2 * Self.margin); size = NSSize(width: d, height: d) }
        if panel == nil {
            let p = NSPanel(contentRect: NSRect(origin: .zero, size: size), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.isFloatingPanel = true; p.level = .popUpMenu; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = true
            p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
            p.isMovableByWindowBackground = true; p.hidesOnDeactivate = false
            let v = BubbleView(frame: NSRect(origin: .zero, size: size)); preview = v
            p.contentView = v; panel = p
            let saved = s.persistBubbleLocation ? UserDefaults.standard.string(forKey: "bubbleOrigin").map(NSPointFromString) : nil
            p.setFrameOrigin(saved.flatMap { pt in NSScreen.screens.contains { $0.visibleFrame.contains(pt) } ? pt : nil } ?? NSPoint(x: screen.minX + Self.margin, y: screen.minY + Self.margin))
            NotificationCenter.default.addObserver(self, selector: #selector(moved), name: NSWindow.didMoveNotification, object: p)
        }
        guard let panel, let preview else { return }
        if cameraOnly {
            panel.setFrame(NSRect(x: screen.midX - size.width / 2, y: screen.midY - size.height / 2, width: size.width, height: size.height), display: true)
        } else {
            // Grow/shrink around the bottom-left corner, kept on screen.
            var f = panel.frame
            if f.width > 0, f.width != size.width, let vis = panel.screen?.visibleFrame ?? NSScreen.main?.visibleFrame {
                f.size = size
                f.origin.x = min(max(f.origin.x, vis.minX + Self.margin), vis.maxX - size.width - Self.margin)
                f.origin.y = min(max(f.origin.y, vis.minY + Self.margin), vis.maxY - size.height - Self.margin)
            } else { f.size = size }
            panel.setFrame(f, display: true)
        }
        preview.configure(circle: !cameraOnly, mirrored: s.flipCamera, cameraOnly: cameraOnly)
        panel.orderFrontRegardless(); isVisible = true
    }

    func hide() { panel?.orderOut(nil); isVisible = false }
    func refreshStyle() { if isVisible { show(cameraOnly: cameraOnly) } }
    var frame: CGRect? { isVisible ? panel?.frame : nil }

    /// Back to the default corner (Loom resets the bubble each session unless asked to persist it).
    func resetPosition() {
        guard !SettingsStore.shared.persistBubbleLocation, let panel, let screen = NSScreen.main?.visibleFrame else { return }
        panel.setFrameOrigin(NSPoint(x: screen.minX + Self.margin, y: screen.minY + Self.margin))
    }

    @objc private func moved() {
        guard let p = panel, !cameraOnly else { return }
        UserDefaults.standard.set(NSStringFromPoint(p.frame.origin), forKey: "bubbleOrigin")
    }

    final class BubbleView: NSView {
        private let layerPreview = AVCaptureVideoPreviewLayer(session: Camera.shared.session)
        private var hover: NSTrackingArea?
        private let controls = NSHostingView(rootView: BubbleHoverBar())
        private var cameraOnly = false
        override init(frame: NSRect) {
            super.init(frame: frame)
            wantsLayer = true
            layer?.masksToBounds = true
            layer?.backgroundColor = NSColor(white: 0.12, alpha: 1).cgColor
            layerPreview.videoGravity = .resizeAspectFill
            layer?.addSublayer(layerPreview)
            controls.isHidden = true; addSubview(controls)
        }
        required init?(coder: NSCoder) { fatalError() }
        func configure(circle: Bool, mirrored: Bool, cameraOnly: Bool) {
            self.cameraOnly = cameraOnly
            layer?.cornerRadius = circle ? bounds.width / 2 : 16
            if let c = layerPreview.connection, c.isVideoMirroringSupported { c.automaticallyAdjustsVideoMirroring = false; c.isVideoMirrored = mirrored }
            needsLayout = true
        }
        override func layout() {
            super.layout()
            CATransaction.begin(); CATransaction.setDisableActions(true)
            layerPreview.frame = bounds
            CATransaction.commit()
            let s = fittedSize(BubbleHoverBar())
            controls.frame = NSRect(x: (bounds.width - s.width) / 2, y: bounds.height * (cameraOnly ? 0.06 : 0.1), width: s.width, height: s.height)
        }
        override func updateTrackingAreas() {
            if let hover { removeTrackingArea(hover) }
            let t = NSTrackingArea(rect: bounds, options: [.mouseEnteredAndExited, .activeAlways], owner: self); addTrackingArea(t); hover = t
        }
        override func mouseEntered(with event: NSEvent) { controls.isHidden = false }
        override func mouseExited(with event: NSEvent) { controls.isHidden = true }
        override var mouseDownCanMoveWindow: Bool { true }
    }
}

/// Small / Medium / Close Camera, shown when hovering the bubble.
struct BubbleHoverBar: View {
    @ObservedObject var s = SettingsStore.shared
    var body: some View {
        HStack(spacing: 2) {
            ForEach(BubbleSize.allCases) { size in
                Button { s.bubbleSize = size; CameraBubble.shared.refreshStyle() } label: {
                    Circle().fill(Color.white).frame(width: size == .small ? 8 : 13, height: size == .small ? 8 : 13)
                        .frame(width: 30, height: 30)
                        .background(RoundedRectangle(cornerRadius: 8).fill(s.bubbleSize == size ? Color(white: 0.42) : .clear))
                }.buttonStyle(.plain).help(size.title)
            }
            Button { RecordingSession.shared.closeCamera() } label: {
                Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundStyle(.white).frame(width: 30, height: 30)
            }.buttonStyle(.plain).help("Close Camera")
        }
        .padding(3).background(RoundedRectangle(cornerRadius: 11).fill(DS.bar.opacity(0.92)))
    }
}
