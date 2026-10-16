import AppKit
import Carbon
import Sparkle
import SwiftUI

@main
struct LoomIsDeadApp {
    @MainActor static var delegate: AppDelegate?
    static func main() {
        MainActor.assumeIsolated {
            let app = NSApplication.shared
            if DebugCLI.runIfRequested() { app.setActivationPolicy(.prohibited); app.run(); return }
            let d = AppDelegate(); delegate = d; app.delegate = d
            app.run()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    static var current: AppDelegate? { LoomIsDeadApp.delegate }
    private var statusItem: NSStatusItem?
    private var updater: SPUStandardUpdaterController?
    private var openWindows = 0
    private var hotkeyIDs: [UInt32] = []
    var statusButton: NSStatusBarButton? { statusItem?.button }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        if Bundle.main.bundleURL.pathExtension == "app" { updater = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil) }
        installMainMenu()
        setUpStatusItem()
        registerHotkeys()
        _ = Devices.shared
        RecordingSession.shared.onStateChange = { [weak self] in self?.refreshStatusIcon() }
        Analytics.track("app_opened")
        // Give the status item a beat to land in the menu bar before anchoring to it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [self] in
            if let route = ProcessInfo.processInfo.environment["LID_ROUTE"] { openRoute(route); return }
            if !UserDefaults.standard.bool(forKey: "onboarded") { PermissionsWindow.shared.show(reason: nil) }
            else { ControlMenu.shared.open(from: statusItem?.button) }
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { ControlMenu.shared.open(from: statusItem?.button) }
        return false
    }

    /// Dev/screenshot hook: LID_ROUTE=menu|library|settings[:tab]|onboarding|video:<id>
    private func openRoute(_ r: String) {
        let parts = r.split(separator: ":", maxSplits: 1).map(String.init)
        switch parts[0] {
        case "library": LibraryWindow.shared.show()
        case "settings": SettingsWindow.shared.show(tab: parts.count > 1 ? SettingsTab(rawValue: parts[1]) : nil)
        case "onboarding": PermissionsWindow.shared.show(reason: nil)
        case "selftest":
            // Records ~5 s with a pause in the middle, then stops (verifies capture + stitching).
            let s = RecordingSession.shared
            s.start()
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(6.5)); s.togglePause()
                try? await Task.sleep(for: .seconds(1)); s.togglePause()
                try? await Task.sleep(for: .seconds(2.5)); s.stop()
            }
        case "video": if parts.count > 1, let v = Library.shared.video(id: parts[1]) ?? Library.shared.videos.first { VideoWindow.open(v) }
        default: ControlMenu.shared.open(from: statusItem?.button)
        }
    }

    // Show a Dock icon while a real window is open, like a normal app.
    func windowOpened() { openWindows += 1; if NSApp.activationPolicy() != .regular { NSApp.setActivationPolicy(.regular) } }
    func windowClosed() {
        openWindows = max(0, openWindows - 1)
        DispatchQueue.main.async { if self.openWindows == 0 { NSApp.setActivationPolicy(.accessory) } }
    }

    // MARK: Status item

    private func setUpStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        item.button?.target = self; item.button?.action = #selector(statusClicked(_:))
        item.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])
        statusItem = item; refreshStatusIcon()
    }

    @objc private func statusClicked(_ sender: NSStatusBarButton) {
        let s = RecordingSession.shared
        if NSApp.currentEvent?.type == .rightMouseUp { showStatusMenu(); return }
        switch s.state {
        case .recording, .paused: s.stop()
        case .countdown: s.cancel()
        case .idle: ControlMenu.shared.toggle(from: sender)
        default: break
        }
    }

    private func showStatusMenu() {
        let m = NSMenu()
        m.addItem(withTitle: "Start recording", action: #selector(openRecorder), keyEquivalent: "").target = self
        m.addItem(withTitle: "Open library", action: #selector(openLibrary), keyEquivalent: "").target = self
        m.addItem(.separator())
        m.addItem(withTitle: "Settings…", action: #selector(openSettings), keyEquivalent: ",").target = self
        m.addItem(withTitle: "Check for updates…", action: #selector(checkForUpdates), keyEquivalent: "").target = self
        m.addItem(.separator())
        m.addItem(withTitle: "Quit LoomIsDead", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        statusItem?.menu = m; statusItem?.button?.performClick(nil); statusItem?.menu = nil
    }

    func refreshStatusIcon() {
        guard let b = statusItem?.button else { return }
        switch RecordingSession.shared.state {
        case .recording, .countdown:
            b.image = NSImage(systemSymbolName: "stop.circle.fill", accessibilityDescription: "Stop recording")?.withSymbolConfiguration(.init(paletteColors: [.systemRed]))
            b.image?.isTemplate = false
        case .paused:
            b.image = NSImage(systemSymbolName: "pause.circle.fill", accessibilityDescription: "Recording paused"); b.image?.isTemplate = true
        default:
            b.image = StatusIcon.template
        }
    }

    @objc func openRecorder() { ControlMenu.shared.open(from: statusItem?.button) }
    @objc func openLibrary() { LibraryWindow.shared.show() }
    @objc func openSettings() { SettingsWindow.shared.show() }
    @objc func checkForUpdates() {
        if let updater { updater.checkForUpdates(nil) } else { Toast.show("Updates work in the installed app, not a dev build", systemImage: "arrow.down.circle") }
    }
    var automaticallyChecksForUpdates: Bool {
        get { updater?.updater.automaticallyChecksForUpdates ?? true }
        set { updater?.updater.automaticallyChecksForUpdates = newValue }
    }

    // MARK: Hotkeys (Carbon, no Accessibility permission needed)

    func registerHotkeys() {
        hotkeyIDs.forEach { HotkeyCenter.shared.unregister($0) }; hotkeyIDs = []
        func reg(_ key: Int, _ mods: Int, _ run: @escaping () -> Void) {
            if case .success(let id) = HotkeyCenter.shared.register(.init(keyCode: UInt32(key), modifiers: UInt32(mods)), handler: { DispatchQueue.main.async(execute: run) }) { hotkeyIDs.append(id) }
        }
        let s = RecordingSession.shared
        reg(kVK_ANSI_L, cmdKey | shiftKey) {
            switch s.state {
            case .idle: ControlMenu.shared.isOpen ? s.start() : ControlMenu.shared.open(from: self.statusItem?.button)
            case .recording, .paused: s.stop()
            case .countdown: s.cancel()
            default: break
            }
        }
        reg(kVK_ANSI_P, optionKey | shiftKey) { s.togglePause() }
        reg(kVK_ANSI_R, cmdKey | shiftKey) { s.restart() }
        reg(kVK_ANSI_C, optionKey | shiftKey) { s.cancel() }
        reg(kVK_ANSI_D, cmdKey | shiftKey) { s.toggleDraw() }
        reg(kVK_ANSI_C, cmdKey | controlKey) { s.confetti() }
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        let s = RecordingSession.shared
        guard s.isRecordingOrPaused else { return .terminateNow }
        if s.state == .recording { s.togglePause() }
        let a = NSAlert()
        a.messageText = "Quit LoomIsDead?"
        a.informativeText = "Your recording has been paused. Are you sure you want to quit?"
        a.addButton(withTitle: "Continue Recording")
        a.addButton(withTitle: "Quit without Saving").hasDestructiveAction = true
        NSApp.activate(ignoringOtherApps: true)
        if a.runModal() == .alertSecondButtonReturn { return .terminateNow }
        s.togglePause(); return .terminateCancel
    }

    // MARK: Menu (so ⌘C/⌘V/⌘W work in windows)

    private func installMainMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let app = NSMenu()
        app.addItem(withTitle: "About LoomIsDead", action: #selector(about), keyEquivalent: "").target = self
        app.addItem(withTitle: "Check for Updates…", action: #selector(checkForUpdates), keyEquivalent: "").target = self
        app.addItem(.separator())
        app.addItem(withTitle: "Settings…", action: #selector(openSettings), keyEquivalent: ",").target = self
        app.addItem(.separator())
        app.addItem(withTitle: "Hide LoomIsDead", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        app.addItem(withTitle: "Quit LoomIsDead", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = app
        let fileItem = NSMenuItem(); main.addItem(fileItem)
        let file = NSMenu(title: "File")
        file.addItem(withTitle: "New Recording", action: #selector(openRecorder), keyEquivalent: "n").target = self
        file.addItem(withTitle: "Open Library", action: #selector(openLibrary), keyEquivalent: "l").target = self
        file.addItem(.separator())
        file.addItem(withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = file
        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit
        NSApp.mainMenu = main
    }

    @objc private func about() { SettingsWindow.shared.show(tab: .about) }
}

/// Menu-bar template icon: the tombstone outline with the X cut out.
enum StatusIcon {
    static let template: NSImage = {
        let img = NSImage(size: NSSize(width: 18, height: 18), flipped: true) { r in
            let k = r.width / 32
            NSColor.black.setFill()
            let stone = NSBezierPath()
            stone.move(to: NSPoint(x: 8 * k, y: 24 * k)); stone.line(to: NSPoint(x: 8 * k, y: 13.5 * k))
            stone.appendArc(withCenter: NSPoint(x: 16 * k, y: 13.5 * k), radius: 8 * k, startAngle: 180, endAngle: 0, clockwise: false)
            stone.line(to: NSPoint(x: 24 * k, y: 24 * k)); stone.close(); stone.fill()
            NSBezierPath(roundedRect: NSRect(x: 5 * k, y: 23 * k, width: 22 * k, height: 4.5 * k), xRadius: 1.6 * k, yRadius: 1.6 * k).fill()
            NSGraphicsContext.current?.compositingOperation = .clear
            let x = NSBezierPath(); x.lineWidth = 2.6 * k; x.lineCapStyle = .round
            x.move(to: NSPoint(x: 12.2 * k, y: 11.8 * k)); x.line(to: NSPoint(x: 19.8 * k, y: 19.4 * k))
            x.move(to: NSPoint(x: 19.8 * k, y: 11.8 * k)); x.line(to: NSPoint(x: 12.2 * k, y: 19.4 * k)); x.stroke()
            return true
        }
        img.isTemplate = true; return img
    }()
}
