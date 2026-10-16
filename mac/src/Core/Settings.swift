import AppKit
import Combine
import SwiftUI

/// What gets recorded. Derived, like LoomIsDead's recorder: the screen
/// dropdown picks the source (or Camera only) and the camera's On/Off pill
/// decides between screen + camera and screen only.
enum RecordMode: String {
    case screenAndCamera, screen, camera
    var usesScreen: Bool { self != .camera }
    var usesCamera: Bool { self != .screen }
}

/// The screen dropdown.
enum CaptureArea: String, CaseIterable, Identifiable {
    case fullScreen, window, customSize, cameraOnly
    var id: String { rawValue }
    var title: String {
        switch self { case .fullScreen: "Full screen"; case .window: "Specific window"; case .customSize: "Custom size"; case .cameraOnly: "Camera only" }
    }
    var symbol: String {
        switch self { case .fullScreen: "display"; case .window: "macwindow"; case .customSize: "crop"; case .cameraOnly: "person.crop.rectangle" }
    }
}

/// Bubble sizes (camera-only mode uses 16:9 frames at ¼ / ½ of the screen width).
enum BubbleSize: String, CaseIterable, Identifiable {
    case small, medium
    var id: String { rawValue }
    var diameter: CGFloat { self == .small ? 200 : 400 }
    var title: String { rawValue.capitalized }
    var widthFraction: CGFloat { self == .small ? 0.25 : 0.5 }
}

enum VideoQuality: String, CaseIterable, Identifiable {
    case auto = "Auto", q720 = "720p", q1080 = "1080p", q1440 = "1440p", q4k = "4K"
    var id: String { rawValue }
    /// Long edge cap in pixels. Auto = the display's native resolution, capped at 4K.
    var maxLongEdge: Int { switch self { case .auto, .q4k: 3840; case .q720: 1280; case .q1080: 1920; case .q1440: 2560 } }
}

enum CameraQuality: String, CaseIterable, Identifiable {
    case low, medium, high
    var id: String { rawValue }
    var title: String { switch self { case .low: "Low (480p)"; case .medium: "Med (720p)"; case .high: "High (1080p)" } }
    var detail: String { switch self { case .low: "Lower quality, better performance"; case .medium: "Balanced quality and performance"; case .high: "Best quality, slower performance" } }
}

enum ControlsVisibility: String, CaseIterable, Identifiable {
    case hideInVideo, alwaysHide, show
    var id: String { rawValue }
    var title: String { switch self { case .hideInVideo: "Hide only in final video"; case .alwaysHide: "Hide while recording"; case .show: "Show" } }
}

@MainActor
final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()
    private let d = UserDefaults.standard

    @Published var captureArea: CaptureArea { didSet { d.set(captureArea.rawValue, forKey: "captureArea") } }
    @Published var displayID: UInt32 { didSet { d.set(Int(displayID), forKey: "displayID") } }
    @Published var cameraOn: Bool { didSet { d.set(cameraOn, forKey: "cameraOn") } }
    /// "" = system default device.
    @Published var cameraID: String { didSet { d.set(cameraID, forKey: "cameraID") } }
    @Published var micOn: Bool { didSet { d.set(micOn, forKey: "micOn") } }
    @Published var microphoneID: String { didSet { d.set(microphoneID, forKey: "microphoneID") } }
    @Published var recordSystemAudio: Bool { didSet { d.set(recordSystemAudio, forKey: "recordSystemAudio") } }

    @Published var bubbleSize: BubbleSize { didSet { d.set(bubbleSize.rawValue, forKey: "bubbleSize") } }
    @Published var flipCamera: Bool { didSet { d.set(flipCamera, forKey: "flipCamera") } }
    @Published var persistBubbleLocation: Bool { didSet { d.set(persistBubbleLocation, forKey: "persistBubbleLocation") } }
    @Published var cameraQuality: CameraQuality { didSet { d.set(cameraQuality.rawValue, forKey: "cameraQuality") } }

    @Published var showCountdown: Bool { didSet { d.set(showCountdown, forKey: "showCountdown") } }
    @Published var controls: ControlsVisibility { didSet { d.set(controls.rawValue, forKey: "controls") } }
    @Published var highlightClicks: Bool { didSet { d.set(highlightClicks, forKey: "highlightClicks") } }
    @Published var quality: VideoQuality { didSet { d.set(quality.rawValue, forKey: "quality") } }
    @Published var fps: Int { didSet { d.set(fps, forKey: "fps") } }
    @Published var playSounds: Bool { didSet { d.set(playSounds, forKey: "playSounds") } }

    @Published var afterRecording: AfterRecording { didSet { d.set(afterRecording.rawValue, forKey: "afterRecording") } }
    @Published var shareBaseURL: String { didSet { d.set(shareBaseURL, forKey: "shareBaseURL") } }
    @Published var saveFolder: String { didSet { d.set(saveFolder, forKey: "saveFolder") } }
    @Published var launchAtLogin: Bool { didSet { d.set(launchAtLogin, forKey: "launchAtLogin"); LoginItem.set(launchAtLogin) } }

    enum AfterRecording: String, CaseIterable, Identifiable {
        case openPreview, uploadAndCopy, revealInFinder
        var id: String { rawValue }
        var title: String {
            switch self { case .openPreview: "Open the video"; case .uploadAndCopy: "Upload, copy the link and open the watch page"; case .revealInFinder: "Show the file in Finder" }
        }
    }

    var recordMode: RecordMode { captureArea == .cameraOnly ? .camera : (cameraOn ? .screenAndCamera : .screen) }

    static let defaultShareBase = "https://yourappisdead.com/loomisdead"

    private init() {
        func e<T: RawRepresentable>(_ k: String, _ def: T) -> T where T.RawValue == String { (UserDefaults.standard.string(forKey: k)).flatMap(T.init(rawValue:)) ?? def }
        func b(_ k: String, _ def: Bool) -> Bool { UserDefaults.standard.object(forKey: k) == nil ? def : UserDefaults.standard.bool(forKey: k) }
        captureArea = e("captureArea", CaptureArea.fullScreen)
        displayID = UInt32(UserDefaults.standard.integer(forKey: "displayID"))
        cameraOn = b("cameraOn", true)
        cameraID = UserDefaults.standard.string(forKey: "cameraID") ?? ""
        micOn = b("micOn", true)
        microphoneID = UserDefaults.standard.string(forKey: "microphoneID") ?? ""
        recordSystemAudio = b("recordSystemAudio", false)
        bubbleSize = e("bubbleSize", BubbleSize.small)
        flipCamera = b("flipCamera", true)
        persistBubbleLocation = b("persistBubbleLocation", false)
        cameraQuality = e("cameraQuality", CameraQuality.medium)
        showCountdown = b("showCountdown", true)
        controls = e("controls", ControlsVisibility.hideInVideo)
        highlightClicks = b("highlightClicks", false)
        quality = e("quality", VideoQuality.auto)
        let f = UserDefaults.standard.integer(forKey: "fps"); fps = [30, 60].contains(f) ? f : 30
        playSounds = b("playSounds", true)
        afterRecording = e("afterRecording", AfterRecording.openPreview)
        shareBaseURL = UserDefaults.standard.string(forKey: "shareBaseURL") ?? SettingsStore.defaultShareBase
        saveFolder = UserDefaults.standard.string(forKey: "saveFolder") ?? SettingsStore.currentFolder.path
        launchAtLogin = b("launchAtLogin", false)
    }

    var folderURL: URL { Self.currentFolder }
    /// Readable off the main actor (file paths are resolved from background work).
    nonisolated static var currentFolder: URL {
        let path = UserDefaults.standard.string(forKey: "saveFolder") ?? FileManager.default.urls(for: .moviesDirectory, in: .userDomainMask)[0].appendingPathComponent("LoomIsDead").path
        let u = URL(fileURLWithPath: (path as NSString).expandingTildeInPath, isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }
}

import ServiceManagement
enum LoginItem {
    static func set(_ on: Bool) {
        do { if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() } } catch { NSLog("LoomIsDead login item: \(error)") }
    }
}
