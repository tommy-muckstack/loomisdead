import AVFoundation
import AppKit
import Combine

/// A saved recording. The .mp4 lives in the save folder; metadata in library.json.
struct Video: Codable, Identifiable, Equatable {
    var id: String
    var title: String
    var fileName: String
    var createdAt: Date
    var duration: Double
    var width: Int
    var height: Int
    var size: Int64
    var mode: String
    /// Public watch page once shared.
    var shareURL: String?
    var shareID: String?

    var fileURL: URL { SettingsStore.currentFolder.appendingPathComponent(fileName) }
    var thumbURL: URL { Library.thumbsFolder.appendingPathComponent(id + ".jpg") }
}

@MainActor
final class Library: ObservableObject {
    static let shared = Library()
    @Published private(set) var videos: [Video] = []

    nonisolated static var supportFolder: URL {
        let u = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("LoomIsDead", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true); return u
    }
    nonisolated static var thumbsFolder: URL {
        let u = supportFolder.appendingPathComponent("Thumbnails", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true); return u
    }
    private var indexURL: URL { Self.supportFolder.appendingPathComponent("library.json") }

    private init() { load() }

    func load() {
        let dec = JSONDecoder(); dec.dateDecodingStrategy = .iso8601
        let all = (try? Data(contentsOf: indexURL)).flatMap { try? dec.decode([Video].self, from: $0) } ?? []
        // Files deleted in Finder disappear from the library too.
        videos = all.filter { FileManager.default.fileExists(atPath: $0.fileURL.path) }.sorted { $0.createdAt > $1.createdAt }
    }

    private func save() {
        let enc = JSONEncoder(); enc.dateEncodingStrategy = .iso8601; enc.outputFormatting = [.prettyPrinted]
        if let data = try? enc.encode(videos) { try? data.write(to: indexURL, options: .atomic) }
    }

    static func defaultTitle(for date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "MMMM d, yyyy 'at' h:mm a"
        return "Recording – " + f.string(from: date)
    }

    /// Register a finished .mp4 that already sits in the save folder.
    @discardableResult
    func add(file: URL, mode: RecordMode, createdAt: Date = Date()) async -> Video {
        let asset = AVURLAsset(url: file)
        let duration = (try? await asset.load(.duration).seconds) ?? 0
        var w = 0, h = 0
        if let t = try? await asset.loadTracks(withMediaType: .video).first, let size = try? await t.load(.naturalSize) { w = Int(size.width); h = Int(size.height) }
        let bytes = ((try? FileManager.default.attributesOfItem(atPath: file.path)[.size]) as? NSNumber)?.int64Value ?? 0
        let v = Video(id: UUID().uuidString.lowercased(), title: Self.defaultTitle(for: createdAt), fileName: file.lastPathComponent, createdAt: createdAt,
                      duration: duration.isFinite ? duration : 0, width: w, height: h, size: bytes, mode: mode.rawValue)
        await Self.writeThumbnail(for: file, to: v.thumbURL)
        videos.insert(v, at: 0); save()
        return v
    }

    func update(_ v: Video) { if let i = videos.firstIndex(where: { $0.id == v.id }) { videos[i] = v; save() } }
    func video(id: String) -> Video? { videos.first { $0.id == id } }

    func rename(_ v: Video, to title: String) {
        var n = v; let t = title.trimmingCharacters(in: .whitespacesAndNewlines); n.title = t.isEmpty ? v.title : String(t.prefix(200)); update(n)
    }

    func delete(_ v: Video) {
        try? FileManager.default.trashItem(at: v.fileURL, resultingItemURL: nil)
        try? FileManager.default.removeItem(at: v.thumbURL)
        videos.removeAll { $0.id == v.id }; save()
    }

    /// Import an existing movie file (copied into the save folder).
    func importFile(_ src: URL) async throws -> Video {
        let dest = SettingsStore.shared.folderURL.appendingPathComponent(Self.fileName(for: Date()))
        let asset = AVURLAsset(url: src)
        guard try await !asset.loadTracks(withMediaType: .video).isEmpty else { throw AgentError("IMPORT", "That file has no video in it.") }
        if src.pathExtension.lowercased() == "mp4" { try FileManager.default.copyItem(at: src, to: dest) }
        else {
            guard let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else { throw AgentError("IMPORT", "That video format isn't supported.") }
            do { try await ex.export(to: dest, as: .mp4) }
            catch {
                guard let ex2 = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1920x1080) else { throw error }
                try await ex2.export(to: dest, as: .mp4)
            }
        }
        var v = await add(file: dest, mode: .screen)
        v.title = src.deletingPathExtension().lastPathComponent; update(v); return v
    }

    static func fileName(for date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
        var name = "LoomIsDead \(f.string(from: date)).mp4"; var n = 2
        while FileManager.default.fileExists(atPath: SettingsStore.shared.folderURL.appendingPathComponent(name).path) { name = "LoomIsDead \(f.string(from: date)) \(n).mp4"; n += 1 }
        return name
    }

    static func writeThumbnail(for file: URL, to dest: URL) async {
        let gen = AVAssetImageGenerator(asset: AVURLAsset(url: file))
        gen.appliesPreferredTrackTransform = true; gen.maximumSize = CGSize(width: 640, height: 640)
        let asset = AVURLAsset(url: file)
        let d = (try? await asset.load(.duration).seconds) ?? 0
        let at = CMTime(seconds: min(1, max(0, d / 3)), preferredTimescale: 600)
        guard let cg = try? await gen.image(at: at).image else { return }
        let rep = NSBitmapImageRep(cgImage: cg)
        if let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) { try? jpg.write(to: dest) }
    }
}

extension Video {
    var durationLabel: String { Self.format(duration) }
    static func format(_ t: Double) -> String {
        let s = Int(t.rounded()); return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, (s / 60) % 60, s % 60) : String(format: "%d:%02d", s / 60, s % 60)
    }
    var sizeLabel: String { ByteCountFormatter.string(fromByteCount: size, countStyle: .file) }
}
