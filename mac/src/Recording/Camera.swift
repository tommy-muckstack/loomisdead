import AVFoundation
import AppKit

/// One AVCaptureSession that feeds the camera bubble preview and, in Camera
/// Only mode, also writes the movie file (with the microphone).
final class Camera: NSObject, @unchecked Sendable {
    static let shared = Camera()
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "loomisdead.camera")
    private var videoInput: AVCaptureDeviceInput?
    private var audioInput: AVCaptureDeviceInput?
    private let movieOutput = AVCaptureMovieFileOutput()
    private var finish: ((URL?, Error?) -> Void)?
    private var started: CheckedContinuation<Void, Error>?
    private(set) var currentCameraID: String?

    /// Start (or switch) the preview to a camera. Pass nil to stop.
    func start(camera: AVCaptureDevice?, quality: CameraQuality = .medium) {
        queue.async { [self] in
            session.beginConfiguration()
            if let videoInput { session.removeInput(videoInput); self.videoInput = nil }
            if let camera, let input = try? AVCaptureDeviceInput(device: camera), session.canAddInput(input) {
                session.addInput(input); videoInput = input; currentCameraID = camera.uniqueID
                let preset: AVCaptureSession.Preset = quality == .low ? .vga640x480 : quality == .medium ? .hd1280x720 : .hd1920x1080
                if session.canSetSessionPreset(preset) { session.sessionPreset = preset } else if session.canSetSessionPreset(.high) { session.sessionPreset = .high }
            } else { currentCameraID = nil }
            session.commitConfiguration()
            if videoInput != nil, !session.isRunning { session.startRunning() }
            if videoInput == nil, session.isRunning { session.stopRunning() }
        }
    }

    func stop() {
        queue.async { [self] in
            if session.isRunning { session.stopRunning() }
            session.beginConfiguration()
            if let videoInput { session.removeInput(videoInput) }; videoInput = nil
            if let audioInput { session.removeInput(audioInput) }; audioInput = nil
            if session.outputs.contains(movieOutput) { session.removeOutput(movieOutput) }
            session.commitConfiguration(); currentCameraID = nil
        }
    }

    /// Camera Only mode: attach the microphone ahead of time (reconfiguring the
    /// session while recording would drop the first seconds of every segment).
    func prepareMicrophone(_ microphone: AVCaptureDevice?) async {
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            queue.async { [self] in
                session.beginConfiguration()
                if let audioInput { session.removeInput(audioInput); self.audioInput = nil }
                if let microphone, let a = try? AVCaptureDeviceInput(device: microphone), session.canAddInput(a) { session.addInput(a); audioInput = a }
                if !session.outputs.contains(movieOutput), session.canAddOutput(movieOutput) { session.addOutput(movieOutput) }
                session.commitConfiguration()
                if !session.isRunning { session.startRunning() }
                c.resume()
            }
        }
    }

    /// Record the camera (+ mic) to a .mov file. Returns once frames are being written.
    func startRecording(to url: URL) async throws {
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            queue.async { [self] in
                guard videoInput != nil, session.outputs.contains(movieOutput) else { c.resume(throwing: AgentError("CAMERA", "No camera is available.")); return }
                if let conn = movieOutput.connection(with: .video), conn.isVideoMirroringSupported {
                    conn.automaticallyAdjustsVideoMirroring = false; conn.isVideoMirrored = false
                }
                started = c
                movieOutput.startRecording(to: url, recordingDelegate: self)
            }
        }
    }

    func pauseRecording() { queue.async { [self] in if movieOutput.isRecording, !movieOutput.isRecordingPaused { movieOutput.pauseRecording() } } }
    func resumeRecording() { queue.async { [self] in if movieOutput.isRecordingPaused { movieOutput.resumeRecording() } } }

    func stopRecording() async -> URL? {
        await withCheckedContinuation { (c: CheckedContinuation<URL?, Never>) in
            queue.async { [self] in
                guard movieOutput.isRecording else { c.resume(returning: nil); return }
                finish = { url, _ in c.resume(returning: url) }
                movieOutput.stopRecording()
            }
        }
    }
}

extension Camera: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL, from connections: [AVCaptureConnection]) {
        let c = started; started = nil; c?.resume()
    }
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        // AVFoundation reports "stopped" as an error with the file still written.
        let ok = error == nil || ((error as NSError?)?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool ?? false)
        let f = finish; finish = nil
        if let c = started { started = nil; c.resume(throwing: error ?? AgentError("CAMERA", "The camera couldn't start recording.")) }
        f?(ok ? outputFileURL : nil, error)
    }
}
