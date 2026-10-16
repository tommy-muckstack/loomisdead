import AVFoundation
import AppKit
import ScreenCaptureKit

/// Where on screen to record, in AppKit desktop coordinates (bottom-left origin).
struct ScreenTarget {
    var displayID: CGDirectDisplayID
    /// nil = the whole display.
    var rect: CGRect?
}

/// One continuous screen recording to an .mp4 file (ScreenCaptureKit's
/// SCRecordingOutput). Pausing ends a segment; the session stitches them.
@MainActor
final class ScreenSegment: NSObject {
    private var stream: SCStream?
    private var output: SCRecordingOutput?
    let url: URL
    var onFailure: ((Error) -> Void)?

    init(url: URL) { self.url = url }

    func start(target: ScreenTarget, microphone: AVCaptureDevice?, systemAudio: Bool, includeControls: Bool) async throws {
        let s = SettingsStore.shared
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        let displays = DisplayLayout.allDisplays(from: content)
        guard let display = displays.first(where: { $0.id == target.displayID }) ?? displays.first else { throw AgentError("DISPLAY", "No display to record.") }
        // Keep LoomIsDead's own chrome out of the video; the bubble, drawings,
        // confetti and click highlights stay in (and the controls, if asked).
        let me = Bundle.main.bundleIdentifier
        var keep = InVideo.windows
        if let b = CameraBubble.shared.windowNumber { keep.insert(b) }
        if includeControls { keep.formUnion(InVideo.controls) }
        let excluded = content.windows.filter { $0.owningApplication?.bundleIdentifier == me && !keep.contains(Int($0.windowID)) }
        let filter = SCContentFilter(display: display.scDisplay, excludingWindows: excluded)
        let cfg = SCStreamConfiguration()
        let scale = display.scaleFactor
        var pxW: CGFloat, pxH: CGFloat
        if let r = target.rect?.intersection(display.frame), !r.isNull, r.width > 4 {
            cfg.sourceRect = CGRect(x: r.minX - display.frame.minX, y: display.frame.maxY - r.maxY, width: r.width, height: r.height)
            pxW = r.width * scale; pxH = r.height * scale
        } else {
            pxW = display.frame.width * scale; pxH = display.frame.height * scale
        }
        let cap = CGFloat(s.quality.maxLongEdge)
        if max(pxW, pxH) > cap { let k = cap / max(pxW, pxH); pxW *= k; pxH *= k }
        cfg.width = Int(pxW) & ~1; cfg.height = Int(pxH) & ~1
        cfg.showsCursor = true
        cfg.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(s.fps))
        cfg.queueDepth = 6
        cfg.capturesAudio = systemAudio
        cfg.excludesCurrentProcessAudio = true
        if let microphone { cfg.captureMicrophone = true; cfg.microphoneCaptureDeviceID = microphone.uniqueID }
        let stream = SCStream(filter: filter, configuration: cfg, delegate: self)
        let rc = SCRecordingOutputConfiguration(); rc.outputURL = url; rc.outputFileType = .mp4; rc.videoCodecType = .h264
        let out = SCRecordingOutput(configuration: rc, delegate: self)
        try stream.addRecordingOutput(out)
        try await stream.startCapture()
        self.stream = stream; self.output = out
    }

    func stop() async {
        guard let stream else { return }
        try? await stream.stopCapture()
        self.stream = nil; self.output = nil
        // SCRecordingOutput finalises the file just after stopCapture returns.
        for _ in 0..<20 where !FileManager.default.fileExists(atPath: url.path) { try? await Task.sleep(for: .milliseconds(50)) }
        try? await Task.sleep(for: .milliseconds(150))
    }
}

extension ScreenSegment: SCRecordingOutputDelegate, SCStreamDelegate {
    nonisolated func recordingOutput(_ recordingOutput: SCRecordingOutput, didFailWithError error: any Error) {
        Task { @MainActor in self.onFailure?(error) }
    }
    nonisolated func stream(_ stream: SCStream, didStopWithError error: any Error) {
        Task { @MainActor in self.onFailure?(error) }
    }
}

/// Window numbers of our overlays that belong in the recording.
@MainActor
enum InVideo {
    static var windows: Set<Int> = []
    static var controls: Set<Int> = []
}

/// Joins paused segments into one .mp4 (passthrough, no re-encode).
enum SegmentJoiner {
    static func join(_ parts: [URL], into dest: URL) async throws {
        try? FileManager.default.removeItem(at: dest)
        let comp = AVMutableComposition()
        var cursor = CMTime.zero
        var vTrack: AVMutableCompositionTrack?
        var aTracks: [AVMutableCompositionTrack] = []
        for part in parts {
            let asset = AVURLAsset(url: part)
            let dur = try await asset.load(.duration)
            guard dur.seconds > 0.05 else { continue }
            let range = CMTimeRange(start: .zero, duration: dur)
            if let v = try await asset.loadTracks(withMediaType: .video).first {
                if vTrack == nil { vTrack = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid); vTrack?.preferredTransform = try await v.load(.preferredTransform) }
                try vTrack?.insertTimeRange(range, of: v, at: cursor)
            }
            let audio = try await asset.loadTracks(withMediaType: .audio)
            for (i, a) in audio.enumerated() {
                if aTracks.count <= i, let t = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) { aTracks.append(t) }
                try aTracks[i].insertTimeRange(range, of: a, at: cursor)
            }
            cursor = cursor + dur
        }
        guard vTrack != nil else { throw AgentError("EMPTY", "The recording was empty.") }
        guard let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { throw AgentError("EXPORT", "Couldn't prepare the video.") }
        try await export.export(to: dest, as: .mp4)
    }

    /// Re-wrap a single file as .mp4 (camera files come out as .mov).
    static func finalize(_ parts: [URL], into dest: URL) async throws {
        if parts.count == 1, parts[0].pathExtension.lowercased() == "mp4" {
            try? FileManager.default.removeItem(at: dest)
            try FileManager.default.moveItem(at: parts[0], to: dest)
        } else {
            try await join(parts, into: dest)
            for p in parts { try? FileManager.default.removeItem(at: p) }
        }
    }
}
