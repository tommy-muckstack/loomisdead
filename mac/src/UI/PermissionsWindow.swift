import AVFoundation
import AppKit
import SwiftUI

/// First-run welcome + the three macOS permissions a screen recorder needs.
/// Also reopened on the step that's missing when a recording can't start.
@MainActor
final class PermissionsWindow: NSObject, NSWindowDelegate {
    static let shared = PermissionsWindow()
    enum Reason { case screen, camera, microphone }
    private var window: NSWindow?

    func show(reason: Reason?) {
        if window == nil {
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 580, height: 660), styleMask: [.titled, .closable, .fullSizeContentView], backing: .buffered, defer: false)
            w.titlebarAppearsTransparent = true; w.titleVisibility = .hidden; w.isReleasedWhenClosed = false; w.delegate = self
            w.isMovableByWindowBackground = true
            window = w
        }
        let host = NSHostingView(rootView: PermissionsView(reason: reason, done: { [weak self] in self?.finish() }))
        host.sizingOptions = []
        window?.contentView = host; window?.center()
        AppDelegate.current?.windowOpened()
        window?.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        Analytics.track("app_onboarding_viewed", ["step": reason.map { "\($0)" } ?? "welcome"])
    }

    private func finish() {
        UserDefaults.standard.set(true, forKey: "onboarded")
        window?.close()
        Analytics.track("app_onboarding_completed")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { ControlMenu.shared.open(from: AppDelegate.current?.statusButton) }
    }

    func windowWillClose(_ notification: Notification) { UserDefaults.standard.set(true, forKey: "onboarded"); AppDelegate.current?.windowClosed() }
}

struct PermissionsView: View {
    let reason: PermissionsWindow.Reason?
    let done: () -> Void
    @State private var screen = Permissions.screenGranted
    @State private var camera = Permissions.status(.video)
    @State private var mic = Permissions.status(.audio)
    private let poll = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 14) {
                TombstoneMark(size: 64)
                Text(reason == nil ? "Welcome to LoomIsDead" : "LoomIsDead needs one more thing").font(.system(size: 26, weight: .bold))
                Text("Allow LoomIsDead permissions to capture your video and screen").font(.system(size: 15, weight: .semibold))
                Text("Free, open source, no account. Record your screen and camera, then share a link in seconds.")
                    .font(.system(size: 14)).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(maxWidth: 420).fixedSize(horizontal: false, vertical: true)
            }.padding(.top, 44).padding(.bottom, 26)
            VStack(spacing: 10) {
                row("Screen Recording", "display", "Capture your screen to show what you're working on.", granted: screen, highlight: reason == .screen, denied: !screen && UserDefaults.standard.bool(forKey: "askedScreen")) {
                    UserDefaults.standard.set(true, forKey: "askedScreen")
                    if !CGRequestScreenCaptureAccess() { Permissions.openPrivacyPane("Privacy_ScreenCapture") }
                }
                row("Camera", "video", "Use your camera to record your face and screen.", granted: camera == .authorized, highlight: reason == .camera, denied: camera == .denied || camera == .restricted) {
                    if camera == .notDetermined { Task { _ = await Permissions.camera(); camera = Permissions.status(.video) } } else { Permissions.openPrivacyPane("Privacy_Camera") }
                }
                row("Microphone", "mic", "Record your voice so viewers can hear what you're saying.", granted: mic == .authorized, highlight: reason == .microphone, denied: mic == .denied || mic == .restricted) {
                    if mic == .notDetermined { Task { _ = await Permissions.microphone(); mic = Permissions.status(.audio) } } else { Permissions.openPrivacyPane("Privacy_Microphone") }
                }
            }.padding(.horizontal, 40)
            if !screen, UserDefaults.standard.bool(forKey: "askedScreen") {
                Text("After you switch Screen Recording on, macOS asks you to quit and reopen LoomIsDead. Choose Quit & Reopen.")
                    .font(.system(size: 11)).foregroundStyle(.secondary).padding(.top, 10).padding(.horizontal, 40).multilineTextAlignment(.center)
            }
            Spacer()
            Button(action: done) { Text(screen ? "Start recording" : "Continue without Screen Recording") }
                .buttonStyle(PrimaryButtonStyle(color: screen ? DS.blue : Color.gray.opacity(0.6))).frame(width: 300)
            Text("You can change these any time in System Settings → Privacy & Security.").font(.system(size: 11)).foregroundStyle(.tertiary).padding(.top, 10).padding(.bottom, 28)
        }
        .frame(width: 580, height: 660)
        .onReceive(poll) { _ in screen = Permissions.screenGranted; camera = Permissions.status(.video); mic = Permissions.status(.audio) }
    }

    private func row(_ title: String, _ symbol: String, _ detail: String, granted: Bool, highlight: Bool, denied: Bool, action: @escaping () -> Void) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol).font(.system(size: 18, weight: .medium)).foregroundStyle(DS.blue).frame(width: 40, height: 40)
                .background(RoundedRectangle(cornerRadius: 10).fill(DS.blue.opacity(0.12)))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 14, weight: .semibold))
                Text(detail).font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            if granted { Label("Allowed", systemImage: "checkmark.circle.fill").font(.system(size: 12, weight: .semibold)).foregroundStyle(.green) }
            else { Button(denied ? "Open Settings" : "Allow", action: action).buttonStyle(.borderedProminent).tint(DS.blue) }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.primary.opacity(0.04)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(highlight && !granted ? DS.blue : Color.primary.opacity(0.08), lineWidth: highlight && !granted ? 2 : 1))
    }
}
