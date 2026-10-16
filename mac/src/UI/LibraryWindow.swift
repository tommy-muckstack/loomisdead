import AVKit
import AppKit
import SwiftUI
import UniformTypeIdentifiers

/// "My library": every recording on this Mac, newest first.
@MainActor
final class LibraryWindow: NSObject, NSWindowDelegate {
    static let shared = LibraryWindow()
    private var window: NSWindow?

    func show() {
        if window == nil {
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1040, height: 700), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
            w.title = "LoomIsDead"; w.titlebarAppearsTransparent = true; w.titleVisibility = .hidden
            w.minSize = NSSize(width: 640, height: 460); w.isReleasedWhenClosed = false; w.delegate = self
            let host = NSHostingView(rootView: LibraryView()); host.sizingOptions = []
            w.contentView = host; w.center(); w.setFrameAutosaveName("LibraryWindow")
            window = w
        }
        Library.shared.load()
        AppDelegate.current?.windowOpened()
        window?.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        Analytics.track("app_library_opened")
    }

    func windowWillClose(_ notification: Notification) { AppDelegate.current?.windowClosed() }

    func importVideo() {
        let p = NSOpenPanel(); p.allowedContentTypes = [.movie, .mpeg4Movie, .quickTimeMovie]; p.allowsMultipleSelection = false
        p.message = "Choose a video to add to your library"
        guard p.runModal() == .OK, let url = p.url else { return }
        Task { @MainActor in
            do { let v = try await Library.shared.importFile(url); Analytics.track("app_video_imported"); VideoWindow.open(v) }
            catch { Toast.show(error.localizedDescription, systemImage: "exclamationmark.triangle") }
        }
    }
}

struct LibraryView: View {
    @ObservedObject var library = Library.shared
    @ObservedObject var uploader = ShareUploader.shared
    @State private var query = ""
    @State private var sort = "newest"
    private let columns = [GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 20)]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                TombstoneMark(size: 26)
                Text("My Library").font(.system(size: 22, weight: .bold))
                Spacer()
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                    TextField("Search videos", text: $query).textFieldStyle(.plain).frame(width: 200)
                }.padding(.horizontal, 10).frame(height: 32).background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.06)))
                Button { LibraryWindow.shared.importVideo() } label: { Label("Upload", systemImage: "square.and.arrow.up") }
                    .controlSize(.large)
                Button { NSApp.keyWindow?.orderOut(nil); ControlMenu.shared.open(from: AppDelegate.current?.statusButton) } label: {
                    Label("New video", systemImage: "record.circle").padding(.horizontal, 4)
                }.buttonStyle(.borderedProminent).tint(DS.blue).controlSize(.large)
            }
            .padding(.horizontal, 28).padding(.top, 36).padding(.bottom, 14)
            HStack {
                Text(summary).font(.system(size: 12)).foregroundStyle(.secondary)
                Spacer()
                Picker("", selection: $sort) { Text("Newest").tag("newest"); Text("Oldest").tag("oldest"); Text("Longest").tag("longest"); Text("Title").tag("title") }
                    .pickerStyle(.menu).fixedSize()
            }.padding(.horizontal, 28).padding(.bottom, 8)
            Divider()
            if library.videos.isEmpty { empty } else {
                ScrollView {
                    LazyVGrid(columns: columns, alignment: .leading, spacing: 24) {
                        ForEach(filtered) { v in VideoCard(video: v, progress: uploader.progress[v.id]) }
                    }.padding(28)
                    if filtered.isEmpty { Text("No videos match “\(query)”.").foregroundStyle(.secondary).padding(.top, 40) }
                }
            }
        }
        .frame(minWidth: 640, minHeight: 460)
    }

    private var summary: String { "\(library.videos.count) video\(library.videos.count == 1 ? "" : "s") · saved in \(SettingsStore.shared.folderURL.lastPathComponent)" }

    private var filtered: [Video] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let list = q.isEmpty ? library.videos : library.videos.filter { $0.title.lowercased().contains(q) }
        switch sort {
        case "oldest": return list.sorted { $0.createdAt < $1.createdAt }
        case "longest": return list.sorted { $0.duration > $1.duration }
        case "title": return list.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        default: return list
        }
    }

    private var empty: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "video.badge.plus").font(.system(size: 44, weight: .light)).foregroundStyle(DS.blue)
            Text("Record your first video").font(.system(size: 20, weight: .semibold))
            Text("Click the LoomIsDead icon in the menu bar, or press ⌘⇧L from anywhere.").foregroundStyle(.secondary)
            Button { ControlMenu.shared.open(from: AppDelegate.current?.statusButton) } label: { Text("Start recording").padding(.horizontal, 10) }
                .buttonStyle(.borderedProminent).tint(DS.blue).controlSize(.large)
            Spacer()
        }.frame(maxWidth: .infinity)
    }
}

struct VideoCard: View {
    let video: Video
    let progress: Double?
    @State private var hover = false
    @State private var confirmDelete = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottomTrailing) {
                Thumbnail(url: video.thumbURL).aspectRatio(16 / 10, contentMode: .fill).frame(maxWidth: .infinity).clipped()
                Text(video.durationLabel).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                    .padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(.black.opacity(0.7))).padding(8)
                if hover {
                    HStack(spacing: 6) {
                        cardButton(video.shareURL == nil ? "link" : "link.badge.plus", video.shareURL == nil ? "Upload and copy link" : "Copy link") { Task { await ShareUploader.shared.share(video) } }
                        cardButton("folder", "Show in Finder") { NSWorkspace.shared.activateFileViewerSelecting([video.fileURL]) }
                        cardButton("trash", "Delete") { confirmDelete = true }
                    }.padding(8).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
                if let progress {
                    VStack { Spacer(); ProgressView(value: progress).tint(DS.blue).padding(10) }.background(.black.opacity(0.35))
                }
            }
            .aspectRatio(16 / 10, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.primary.opacity(hover ? 0.25 : 0.08)))
            Text(video.title).font(.system(size: 13, weight: .semibold)).lineLimit(2)
            HStack(spacing: 6) {
                Text(video.createdAt, format: .relative(presentation: .named)).font(.system(size: 11)).foregroundStyle(.secondary)
                if video.shareURL != nil { Label("Shared", systemImage: "link").font(.system(size: 11)).foregroundStyle(DS.blue).labelStyle(.titleAndIcon) }
            }
        }
        .contentShape(Rectangle())
        .onHover { hover = $0 }
        .onTapGesture { VideoWindow.open(video) }
        .contextMenu {
            Button("Open") { VideoWindow.open(video) }
            Button(video.shareURL == nil ? "Upload and copy link" : "Copy link") { Task { await ShareUploader.shared.share(video) } }
            if let s = video.shareURL, let u = URL(string: s) { Button("Open watch page") { NSWorkspace.shared.open(u) } }
            Button("Show in Finder") { NSWorkspace.shared.activateFileViewerSelecting([video.fileURL]) }
            Divider()
            Button("Delete", role: .destructive) { confirmDelete = true }
        }
        .confirmationDialog("Delete “\(video.title)”?", isPresented: $confirmDelete) {
            Button("Move to Trash", role: .destructive) { Library.shared.delete(video); Analytics.track("app_video_deleted") }
        } message: { Text(video.shareURL == nil ? "The video file goes to the Trash." : "The file goes to the Trash. The shared link keeps working.") }
    }
    private func cardButton(_ symbol: String, _ help: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) { Image(systemName: symbol).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white).frame(width: 28, height: 28).background(Circle().fill(.black.opacity(0.65))) }
            .buttonStyle(.plain).help(help)
    }
}

struct Thumbnail: View {
    let url: URL
    var body: some View {
        if let img = NSImage(contentsOf: url) { Image(nsImage: img).resizable() }
        else { Rectangle().fill(Color.primary.opacity(0.08)).overlay(Image(systemName: "film").foregroundStyle(.secondary)) }
    }
}
