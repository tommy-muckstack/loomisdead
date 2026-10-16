import AVFoundation
import Combine

/// Camera + microphone discovery, refreshed when devices are plugged in or out.
@MainActor
final class Devices: ObservableObject {
    static let shared = Devices()
    @Published private(set) var cameras: [AVCaptureDevice] = []
    @Published private(set) var microphones: [AVCaptureDevice] = []
    private var observers: [NSObjectProtocol] = []

    private init() {
        refresh()
        for n in [AVCaptureDevice.wasConnectedNotification, AVCaptureDevice.wasDisconnectedNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: n, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.refresh() }
            })
        }
    }

    func refresh() {
        cameras = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera, .deskViewCamera], mediaType: .video, position: .unspecified).devices
            .filter { !$0.localizedName.localizedCaseInsensitiveContains("desk view") }
        microphones = AVCaptureDevice.DiscoverySession(deviceTypes: [.microphone, .external], mediaType: .audio, position: .unspecified).devices
    }

    /// "" = the system default device.
    func camera(for id: String) -> AVCaptureDevice? {
        cameras.first { $0.uniqueID == id } ?? AVCaptureDevice.default(for: .video) ?? cameras.first
    }
    func microphone(for id: String) -> AVCaptureDevice? {
        microphones.first { $0.uniqueID == id } ?? AVCaptureDevice.default(for: .audio) ?? microphones.first
    }
    /// Device names without the "(xxxx:xxxx)" USB ids some cameras append.
    static func clean(_ name: String) -> String {
        name.replacingOccurrences(of: #"\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)"#, with: "", options: .regularExpression)
    }
    func name(camera id: String) -> String { camera(for: id).map { Self.clean($0.localizedName) } ?? "No camera found" }
    func name(microphone id: String) -> String {
        guard let m = microphone(for: id) else { return "No microphone found" }
        return (id.isEmpty ? "Default - " : "") + Self.clean(m.localizedName)
    }
}

enum Permissions {
    static func camera() async -> Bool { await request(.video) }
    static func microphone() async -> Bool { await request(.audio) }
    private static func request(_ t: AVMediaType) async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: t) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: t)
        default: return false
        }
    }
    static func status(_ t: AVMediaType) -> AVAuthorizationStatus { AVCaptureDevice.authorizationStatus(for: t) }
    static var screenGranted: Bool { CGPreflightScreenCaptureAccess() }
    static func openPrivacyPane(_ anchor: String) {
        if let u = URL(string: "x-apple.systempreferences:com.apple.preference.security?\(anchor)") { NSWorkspace.shared.open(u) }
    }
}

import AppKit
