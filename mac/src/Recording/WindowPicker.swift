import AppKit

/// Window mode: hover highlights the window under the cursor, click picks it.
@MainActor
final class WindowPicker {
    static let shared = WindowPicker()
    struct Info { let id: CGWindowID; let bounds: CGRect; let app: String }
    private var panels: [PickerPanel] = []
    private var completion: ((Info?) -> Void)?
    private var monitors: [Any] = []
    private var windows: [Info] = []

    func pick(_ completion: @escaping (Info?) -> Void) {
        cancel()
        self.completion = completion
        windows = Self.onScreenWindows()
        for screen in NSScreen.screens { let p = PickerPanel(screen: screen, picker: self); panels.append(p); p.orderFrontRegardless() }
        monitors.append(NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] e in if e.keyCode == 53 { self?.finish(nil); return nil }; return e } as Any)
        monitors.append(NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] _ in self?.refresh() } as Any)
        NSCursor.crosshair.push(); refresh()
    }
    func cancel() { if completion != nil { finish(nil) } }
    fileprivate func finish(_ id: Info?) {
        guard completion != nil else { return }
        NSCursor.pop()
        monitors.forEach { NSEvent.removeMonitor($0) }; monitors = []
        panels.forEach { $0.orderOut(nil) }; panels = []
        let c = completion; completion = nil; c?(id)
    }
    fileprivate var hovered: Info? {
        let mouse = NSEvent.mouseLocation
        let mainH = NSScreen.screens[0].frame.height
        let cgPoint = CGPoint(x: mouse.x, y: mainH - mouse.y)
        return windows.first { $0.bounds.contains(cgPoint) }
    }
    fileprivate func refresh() { panels.forEach { $0.contentView?.needsDisplay = true } }
    fileprivate func clicked() { finish(hovered) }

    static func onScreenWindows() -> [Info] {
        let me = ProcessInfo.processInfo.processIdentifier
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
        return list.compactMap { e in
            guard (e[kCGWindowLayer as String] as? Int) == 0, (e[kCGWindowOwnerPID as String] as? Int32) != me,
                  let id = e[kCGWindowNumber as String] as? CGWindowID, let b = e[kCGWindowBounds as String] as? [String: CGFloat],
                  let w = b["Width"], let h = b["Height"], w > 40, h > 40, (e[kCGWindowAlpha as String] as? Double ?? 1) > 0.05 else { return nil }
            return Info(id: id, bounds: CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: w, height: h), app: e[kCGWindowOwnerName as String] as? String ?? "")
        }
    }
}

private final class PickerPanel: NSPanel {
    init(screen: NSScreen, picker: WindowPicker) {
        super.init(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        level = .screenSaver; isOpaque = false; backgroundColor = .clear; hasShadow = false; ignoresMouseEvents = false
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        contentView = PickerView(frame: screen.frame, picker: picker, screen: screen)
    }
    override var canBecomeKey: Bool { true }
}

private final class PickerView: NSView {
    unowned let picker: WindowPicker; let screen: NSScreen
    init(frame: NSRect, picker: WindowPicker, screen: NSScreen) { self.picker = picker; self.screen = screen; super.init(frame: frame) }
    required init?(coder: NSCoder) { nil }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func mouseMoved(with event: NSEvent) { picker.refresh() }
    override func mouseDown(with event: NSEvent) { picker.clicked() }
    override func viewDidMoveToWindow() { window?.acceptsMouseMovedEvents = true }
    override func draw(_ dirtyRect: NSRect) {
        NSColor.black.withAlphaComponent(0.12).setFill(); bounds.fill()
        guard let w = picker.hovered else { return }
        let mainH = NSScreen.screens[0].frame.height
        let cocoa = CGRect(x: w.bounds.minX, y: mainH - w.bounds.maxY, width: w.bounds.width, height: w.bounds.height)
        let local = convert(cocoa.offsetBy(dx: -screen.frame.minX, dy: -screen.frame.minY), from: nil)
        let r = CGRect(x: cocoa.minX - screen.frame.minX, y: cocoa.minY - screen.frame.minY, width: cocoa.width, height: cocoa.height)
        _ = local
        NSColor.clear.setFill(); r.fill(using: .copy)
        NSColor(red: 0.094, green: 0.408, blue: 0.859, alpha: 0.18).setFill(); r.fill()
        NSColor(red: 0.094, green: 0.408, blue: 0.859, alpha: 1).setStroke()
        let path = NSBezierPath(roundedRect: r.insetBy(dx: 1.5, dy: 1.5), xRadius: 8, yRadius: 8); path.lineWidth = 3; path.stroke()
    }
}
