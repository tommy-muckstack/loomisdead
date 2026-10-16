import AppKit
import QuartzCore
import SwiftUI

// MARK: Draw

/// Draw on screen while recording. Strokes are part of the video and fade
/// two seconds after you stop drawing. The palette stays out of the video.
@MainActor
final class DrawingOverlay: ObservableObject {
    static let shared = DrawingOverlay()
    @Published private(set) var isOn = false
    @Published var color = DrawingOverlay.colors[0]
    @Published var brush: CGFloat = 10
    static let colors: [NSColor] = [0xC9372C, 0xFCA700, 0x1F845A, 0x1868DB, 0x625DF5, 0xFFFFFF, 0x292A2E].map {
        NSColor(srgbRed: CGFloat(($0 >> 16) & 0xFF) / 255, green: CGFloat(($0 >> 8) & 0xFF) / 255, blue: CGFloat($0 & 0xFF) / 255, alpha: 1)
    }
    private var canvas: NSPanel?
    private var palette: NSPanel?

    func toggle() { isOn ? close() : open() }

    func open() {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        if canvas == nil {
            let p = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.level = .screenSaver; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = false
            p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
            p.contentView = CanvasView(frame: NSRect(origin: .zero, size: screen.frame.size))
            canvas = p
        }
        canvas?.setFrame(screen.frame, display: true)
        canvas?.ignoresMouseEvents = false
        canvas?.orderFrontRegardless()
        if let n = canvas?.windowNumber { InVideo.windows.insert(n) }
        if palette == nil {
            let host = NSHostingView(rootView: PaletteView(model: self)); host.sizingOptions = []
            let size = fittedSize(PaletteView(model: self))
            let p = NSPanel(contentRect: NSRect(origin: .zero, size: size), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.level = NSWindow.Level(rawValue: NSWindow.Level.screenSaver.rawValue + 1); p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = true
            p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]; p.isMovableByWindowBackground = true; p.sharingType = .none
            host.frame = NSRect(origin: .zero, size: size); p.contentView = host
            p.setFrameOrigin(NSPoint(x: screen.visibleFrame.minX + 90, y: screen.visibleFrame.midY - size.height / 2))
            palette = p
        }
        palette?.orderFrontRegardless()
        isOn = true
        NSCursor.crosshair.push()
        Analytics.track("app_draw_toggled", ["on": true])
    }

    func close() {
        guard isOn else { return }
        isOn = false
        canvas?.ignoresMouseEvents = true
        palette?.orderOut(nil)
        NSCursor.pop()
        // Leave the canvas up briefly so the last strokes can fade, then hide it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { [weak self] in
            guard let self, !self.isOn else { return }
            (self.canvas?.contentView as? CanvasView)?.clear(); self.canvas?.orderOut(nil)
        }
    }

    final class CanvasView: NSView {
        private var strokes: [(path: NSBezierPath, color: NSColor)] = []
        private var current: NSBezierPath?
        private var last: NSPoint = .zero
        private var fadeTimer: Timer?
        private var alpha: CGFloat = 1
        override var acceptsFirstResponder: Bool { true }
        override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
        func clear() { strokes = []; current = nil; alpha = 1; needsDisplay = true }
        override func mouseDown(with e: NSEvent) {
            fadeTimer?.invalidate(); alpha = 1
            let m = DrawingOverlay.shared
            let p = NSBezierPath(); p.lineWidth = m.brush; p.lineCapStyle = .round; p.lineJoinStyle = .round
            last = convert(e.locationInWindow, from: nil); p.move(to: last); current = p
            strokes.append((p, m.color)); needsDisplay = true
        }
        override func mouseDragged(with e: NSEvent) {
            guard let current else { return }
            let pt = convert(e.locationInWindow, from: nil)
            let mid = NSPoint(x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2)
            current.curve(to: mid, controlPoint1: last, controlPoint2: last); last = pt; needsDisplay = true
        }
        override func mouseUp(with e: NSEvent) {
            current?.line(to: convert(e.locationInWindow, from: nil)); current = nil; needsDisplay = true
            fadeTimer?.invalidate()
            fadeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: false) { [weak self] _ in MainActor.assumeIsolated { self?.fade() } }
        }
        private func fade() {
            fadeTimer = Timer.scheduledTimer(withTimeInterval: 1 / 30, repeats: true) { [weak self] t in
                MainActor.assumeIsolated {
                    guard let self else { t.invalidate(); return }
                    self.alpha -= 0.08
                    if self.alpha <= 0 { t.invalidate(); self.clear() } else { self.needsDisplay = true }
                }
            }
        }
        override func draw(_ dirtyRect: NSRect) {
            for s in strokes { s.color.withAlphaComponent(alpha).setStroke(); s.path.stroke() }
        }
    }
}

private struct PaletteView: View {
    @ObservedObject var model: DrawingOverlay
    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 10) {
                ForEach(0..<DrawingOverlay.colors.count, id: \.self) { i in
                    let c = DrawingOverlay.colors[i]
                    Button { model.color = c } label: {
                        Circle().fill(Color(nsColor: c)).frame(width: 16, height: 16)
                            .overlay(Circle().strokeBorder(Color.white.opacity(0.5), lineWidth: c == DrawingOverlay.colors[6] ? 1 : 0))
                            .padding(3).overlay(Circle().strokeBorder(Color.white, lineWidth: model.color == c ? 2 : 0))
                    }.buttonStyle(.plain)
                }
            }
            Slider(value: $model.brush, in: 2...24).rotationEffect(.degrees(-90)).frame(width: 120).frame(width: 24, height: 120).help("Brush size")
            Button("Done") { DrawingOverlay.shared.close() }.buttonStyle(.plain).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white)
                .padding(.horizontal, 8).frame(height: 26).background(RoundedRectangle(cornerRadius: 8).fill(DS.blue))
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(DS.bar))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.white.opacity(0.15)))
        .environment(\.colorScheme, .dark)
    }
}

// MARK: Confetti

/// A burst of confetti from the bottom corners. On screen, so it's in the video.
@MainActor
enum Confetti {
    static func burst() {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        let p = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        p.level = .screenSaver; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = false; p.ignoresMouseEvents = true
        p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        let v = NSView(frame: NSRect(origin: .zero, size: screen.frame.size)); v.wantsLayer = true; p.contentView = v
        let colors: [NSColor] = [.systemRed, .systemYellow, .systemGreen, .systemBlue, .systemPurple, .systemOrange, .systemPink]
        for (x, angle) in [(CGFloat(0), CGFloat.pi / 3), (screen.frame.width, CGFloat.pi * 2 / 3)] {
            let e = CAEmitterLayer()
            e.emitterPosition = CGPoint(x: x, y: 0); e.emitterShape = .point; e.birthRate = 1
            e.emitterCells = colors.map { c in
                let cell = CAEmitterCell()
                cell.contents = confettiPiece(c); cell.birthRate = 60; cell.lifetime = 5
                cell.velocity = 1100; cell.velocityRange = 350; cell.emissionLongitude = angle; cell.emissionRange = .pi / 8
                cell.yAcceleration = -650; cell.spin = 4; cell.spinRange = 8; cell.scale = 0.9; cell.scaleRange = 0.4
                return cell
            }
            v.layer?.addSublayer(e)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { e.birthRate = 0 }
        }
        p.orderFrontRegardless()
        InVideo.windows.insert(p.windowNumber)
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { InVideo.windows.remove(p.windowNumber); p.orderOut(nil) }
    }
    private static func confettiPiece(_ c: NSColor) -> CGImage? {
        let img = NSImage(size: NSSize(width: 10, height: 6), flipped: false) { r in c.setFill(); NSBezierPath(rect: r).fill(); return true }
        return img.cgImage(forProposedRect: nil, context: nil, hints: nil)
    }
}

// MARK: Click highlight

/// A 64 px yellow circle at 50% where you click (Settings → Highlight mouse clicks).
@MainActor
final class ClickHighlight {
    static let shared = ClickHighlight()
    private var monitors: [Any] = []
    private var panels: [NSPanel] = []

    func start() {
        stop()
        let down = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { _ in Task { @MainActor in ClickHighlight.shared.ripple(at: NSEvent.mouseLocation) } }
        let downLocal = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { e in ClickHighlight.shared.ripple(at: NSEvent.mouseLocation); return e }
        monitors = [down, downLocal].compactMap { $0 }
    }
    func stop() { monitors.forEach(NSEvent.removeMonitor); monitors = []; panels.forEach { $0.orderOut(nil) }; panels = [] }

    private func ripple(at pt: NSPoint) {
        let d: CGFloat = 64
        let p = NSPanel(contentRect: NSRect(x: pt.x - d / 2, y: pt.y - d / 2, width: d, height: d), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        p.level = .screenSaver; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = false; p.ignoresMouseEvents = true
        p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        let v = NSView(frame: NSRect(x: 0, y: 0, width: d, height: d)); v.wantsLayer = true
        let c = CALayer(); c.frame = v.bounds; c.cornerRadius = d / 2; c.backgroundColor = NSColor(srgbRed: 0xFB / 255, green: 0xC8 / 255, blue: 0x28 / 255, alpha: 0.5).cgColor
        v.layer?.addSublayer(c); p.contentView = v
        let grow = CABasicAnimation(keyPath: "transform.scale"); grow.fromValue = 0; grow.toValue = 1; grow.duration = 0.2; grow.timingFunction = CAMediaTimingFunction(name: .easeOut)
        c.add(grow, forKey: "grow")
        p.orderFrontRegardless(); InVideo.windows.insert(p.windowNumber); panels.append(p)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { [weak self] in
            NSAnimationContext.runAnimationGroup({ $0.duration = 0.25; p.animator().alphaValue = 0 }, completionHandler: {
                Task { @MainActor in InVideo.windows.remove(p.windowNumber); p.orderOut(nil); self?.panels.removeAll { $0 === p } }
            })
        }
    }
}
