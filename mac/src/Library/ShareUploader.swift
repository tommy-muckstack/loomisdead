import AppKit
import Foundation

/// Uploads a recording to the LoomIsDead watch page and returns the share link.
/// No account: a guest session cookie, then a direct-to-storage upload
/// (Vercel caps request bodies at 4.5 MB, so the bytes skip our API).
///   1. POST {base}/api/videos/direct {size, contentType}  → {clientToken, pathname}
///   2. PUT  https://blob.vercel-storage.com/<pathname>     → {url}
///   3. POST {base}/api/videos/direct/complete {url,title,duration,thumb} → {id}
@MainActor
final class ShareUploader: ObservableObject {
    static let shared = ShareUploader()
    /// videoID → 0…1 while uploading.
    @Published private(set) var progress: [String: Double] = [:]
    static let maxBytes: Int64 = 500 * 1024 * 1024

    private var base: URL { URL(string: SettingsStore.shared.shareBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))) ?? URL(string: SettingsStore.defaultShareBase)! }
    private lazy var session: URLSession = {
        let c = URLSessionConfiguration.default
        c.httpCookieStorage = HTTPCookieStorage.shared; c.httpShouldSetCookies = true
        c.timeoutIntervalForRequest = 60; c.timeoutIntervalForResource = 60 * 60
        return URLSession(configuration: c)
    }()

    func isUploading(_ v: Video) -> Bool { progress[v.id] != nil }

    /// Share link for a video, uploading it first if needed. Copies it to the clipboard.
    @discardableResult
    func share(_ v: Video, copy: Bool = true) async -> String? {
        if let link = v.shareURL { if copy { Self.copy(link) }; return link }
        guard progress[v.id] == nil else { return nil }
        guard v.size <= Self.maxBytes else {
            Toast.show("Videos over 500 MB can't be shared. Use Show in Finder to send the file.", systemImage: "exclamationmark.triangle"); return nil
        }
        progress[v.id] = 0
        defer { progress[v.id] = nil }
        do {
            try await ensureSession()
            let link = try await upload(v)
            if copy { Self.copy(link) }
            Analytics.track("app_video_shared", ["channel": "link", "duration_s": Int(v.duration)])
            Toast.show(copy ? "Link copied to clipboard" : "Video uploaded", systemImage: "link", actionLabel: "Open", action: { if let u = URL(string: link) { NSWorkspace.shared.open(u) } })
            return link
        } catch {
            Analytics.track("app_video_share_failed")
            Toast.show("Upload failed: \(error.localizedDescription)", systemImage: "exclamationmark.triangle")
            return nil
        }
    }

    static func copy(_ s: String) { NSPasteboard.general.clearContents(); NSPasteboard.general.setString(s, forType: .string) }

    private func ensureSession() async throws {
        let cookies = HTTPCookieStorage.shared.cookies(for: base) ?? []
        if cookies.contains(where: { ($0.expiresDate ?? .distantFuture) > Date() && ($0.name.localizedCaseInsensitiveContains("session") || $0.name.localizedCaseInsensitiveContains("guest")) }) { return }
        var req = URLRequest(url: base.appendingPathComponent("api/session/guest"))
        req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type"); req.httpBody = Data("{}".utf8)
        let (_, resp) = try await session.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if !(200..<400).contains(code) {
            // Older servers only accept GET (redirect-style guest entry).
            var g = URLRequest(url: base.appendingPathComponent("api/session/guest")); g.httpMethod = "GET"
            _ = try await session.data(for: g)
        }
    }

    private func json(_ path: String, _ body: [String: Any]) async throws -> [String: Any] {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        guard let code = (resp as? HTTPURLResponse)?.statusCode, (200..<300).contains(code) else {
            throw AgentError("HTTP", obj["error"] as? String ?? "The server said no (\((resp as? HTTPURLResponse)?.statusCode ?? 0)).")
        }
        return obj
    }

    private func upload(_ v: Video) async throws -> String {
        let attrs = try FileManager.default.attributesOfItem(atPath: v.fileURL.path)
        let size = (attrs[.size] as? NSNumber)?.int64Value ?? v.size
        let grant = try await json("api/videos/direct", ["size": size, "contentType": "video/mp4"])
        guard let token = grant["clientToken"] as? String, let pathname = grant["pathname"] as? String else { throw AgentError("PARSE", "Unexpected response from the server.") }

        var put = URLRequest(url: URL(string: "https://blob.vercel-storage.com/")!.appendingPathComponent(pathname))
        put.httpMethod = "PUT"
        put.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        put.setValue("7", forHTTPHeaderField: "x-api-version")
        put.setValue("video/mp4", forHTTPHeaderField: "x-content-type")
        put.setValue(String(size), forHTTPHeaderField: "x-content-length")
        let delegate = ProgressDelegate { [weak self] p in Task { @MainActor in if self?.progress[v.id] != nil { self?.progress[v.id] = p * 0.95 } } }
        let (data, resp) = try await session.upload(for: put, fromFile: v.fileURL, delegate: delegate)
        guard let code = (resp as? HTTPURLResponse)?.statusCode, (200..<300).contains(code),
              let blob = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let blobURL = blob["url"] as? String else {
            let msg = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]).flatMap { ($0["error"] as? [String: Any])?["message"] as? String }
            throw AgentError("UPLOAD", msg ?? "Storage upload failed.")
        }

        var body: [String: Any] = ["url": blobURL, "title": v.title, "duration": v.duration]
        if let thumb = try? Data(contentsOf: v.thumbURL) { body["thumb"] = "data:image/jpeg;base64," + thumb.base64EncodedString() }
        let done = try await json("api/videos/direct/complete", body)
        guard let id = done["id"] as? String else { throw AgentError("PARSE", "Unexpected response from the server.") }
        let link = base.appendingPathComponent("v").appendingPathComponent(id).absoluteString
        var n = Library.shared.video(id: v.id) ?? v; n.shareURL = link; n.shareID = id; Library.shared.update(n)
        progress[v.id] = 1
        return link
    }
}

private final class ProgressDelegate: NSObject, URLSessionTaskDelegate {
    let onProgress: @Sendable (Double) -> Void
    init(_ f: @escaping @Sendable (Double) -> Void) { onProgress = f }
    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
        guard totalBytesExpectedToSend > 0 else { return }
        onProgress(Double(totalBytesSent) / Double(totalBytesExpectedToSend))
    }
}

/// What happens once a recording is saved (Settings → After recording).
@MainActor
enum AfterRecording {
    static func run(_ v: Video) {
        let s = SettingsStore.shared
        switch s.afterRecording {
        case .openPreview: VideoWindow.open(v)
        case .uploadAndCopy:
            // Loom's flow: copy the link, then open the watch page in the browser.
            VideoWindow.open(v)
            Task { if let link = await ShareUploader.shared.share(v), let u = URL(string: link) { NSWorkspace.shared.open(u) } }
        case .revealInFinder: NSWorkspace.shared.activateFileViewerSelecting([v.fileURL]); Toast.show("Recording saved", systemImage: "checkmark.circle.fill", actionLabel: "Open", action: { VideoWindow.open(v) })
        }
    }
}
