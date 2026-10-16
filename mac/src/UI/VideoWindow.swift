import AVKit
import AppKit
import SwiftUI

/// One video: player, editable title, Copy link, and the file actions.
@MainActor
final class VideoWindow: NSObject, NSWindowDelegate {
    private static var open: [String: VideoWindow] = [:]
    private let window: NSWindow
    private let id: String

    static func open(_ v: Video) {
        if let w = open[v.id] { w.window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
        let w = VideoWindow(v); open[v.id] = w
        AppDelegate.current?.windowOpened()
        w.window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        Analytics.track("app_video_opened")
    }

    private init(_ v: Video) {
        id = v.id
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 980, height: 680), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        super.init()
        window.title = v.title; window.titlebarAppearsTransparent = true; window.isReleasedWhenClosed = false; window.delegate = self
        window.minSize = NSSize(width: 640, height: 480)
        let host = NSHostingView(rootView: VideoDetail(videoID: v.id, close: { [weak self] in self?.window.close() })); host.sizingOptions = []
        window.contentView = host; window.center()
    }

    func windowWillClose(_ notification: Notification) {
        Self.open[id] = nil
        AppDelegate.current?.windowClosed()
    }
}

struct VideoDetail: View {
    let videoID: String
    let close: () -> Void
    @ObservedObject var library = Library.shared
    @ObservedObject var uploader = ShareUploader.shared
    @State private var player: AVPlayer?
    @State private var title = ""
    @State private var confirmDelete = false
    @FocusState private var titleFocused: Bool

    private var video: Video? { library.video(id: videoID) }

    var body: some View {
        if let v = video {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 14) {
                    TextField("Title", text: $title, onCommit: { library.rename(v, to: title) })
                        .textFieldStyle(.plain).font(.system(size: 22, weight: .bold)).focused($titleFocused)
                        .onChange(of: titleFocused) { _, f in if !f { library.rename(v, to: title) } }
                    HStack(spacing: 8) {
                        Text(v.createdAt, format: .dateTime.month().day().year().hour().minute())
                        Text("·"); Text(v.durationLabel); Text("·"); Text(v.sizeLabel)
                        if v.width > 0 { Text("·"); Text("\(v.width)×\(v.height)") }
                    }.font(.system(size: 12)).foregroundStyle(.secondary)
                    PlayerView(player: player)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.primary.opacity(0.08)))
                }
                .padding(.horizontal, 24).padding(.top, 40).padding(.bottom, 24)
                Divider()
                sidebar(v).frame(width: 260)
            }
            .onAppear { title = v.title; if player == nil { player = AVPlayer(url: v.fileURL) } }
            .onDisappear { player?.pause() }
            .confirmationDialog("Delete “\(v.title)”?", isPresented: $confirmDelete) {
                Button("Move to Trash", role: .destructive) { player?.pause(); Library.shared.delete(v); Analytics.track("app_video_deleted"); close() }
            } message: { Text(v.shareURL == nil ? "The video file goes to the Trash." : "The file goes to the Trash. The shared link keeps working.") }
        } else {
            Text("This video was deleted.").foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func sidebar(_ v: Video) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Share").font(.system(size: 13, weight: .semibold)).padding(.top, 40)
            if let p = uploader.progress[v.id] {
                VStack(alignment: .leading, spacing: 6) {
                    ProgressView(value: p).tint(DS.blue)
                    Text("Uploading… \(Int(p * 100))%").font(.system(size: 11)).foregroundStyle(.secondary)
                }.frame(height: 40)
            } else {
                Button { Task { await ShareUploader.shared.share(v) } } label: {
                    Label(v.shareURL == nil ? "Copy link" : "Copy link", systemImage: "link")
                }.buttonStyle(PrimaryButtonStyle())
                .help(v.shareURL == nil ? "Uploads the video and copies a link anyone can watch" : "Copy the watch page link")
            }
            if let s = v.shareURL {
                Text(s).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle).textSelection(.enabled)
                Button { if let u = URL(string: s) { NSWorkspace.shared.open(u) } } label: { Label("Open watch page", systemImage: "safari") }
                    .buttonStyle(.link)
                Text("Viewers can watch, react and comment without an account.").font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Copy link uploads the video to the LoomIsDead watch page. Anyone with the link can watch, react and comment. Nobody needs an account.")
                    .font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Divider().padding(.vertical, 4)
            Text("File").font(.system(size: 13, weight: .semibold))
            sideButton("Show in Finder", "folder") { NSWorkspace.shared.activateFileViewerSelecting([v.fileURL]) }
            sideButton("Save a copy…", "square.and.arrow.down") { saveCopy(v) }
            sideButton("Share via macOS…", "square.and.arrow.up") { shareSheet(v) }
            Spacer()
            sideButton("Delete video", "trash", role: .destructive) { confirmDelete = true }
        }
        .padding(.horizontal, 18).padding(.bottom, 18)
    }

    private func sideButton(_ title: String, _ symbol: String, role: ButtonRole? = nil, _ run: @escaping () -> Void) -> some View {
        Button(role: role, action: run) {
            Label(title, systemImage: symbol).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).frame(height: 32)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.05)))
        }.buttonStyle(.plain).foregroundStyle(role == .destructive ? Color.red : Color.primary)
    }

    private func saveCopy(_ v: Video) {
        let p = NSSavePanel(); p.nameFieldStringValue = v.title.replacingOccurrences(of: "/", with: "-") + ".mp4"; p.allowedContentTypes = [.mpeg4Movie]
        guard p.runModal() == .OK, let url = p.url else { return }
        do { try? FileManager.default.removeItem(at: url); try FileManager.default.copyItem(at: v.fileURL, to: url); Toast.show("Saved a copy", systemImage: "checkmark.circle.fill") }
        catch { Toast.show(error.localizedDescription, systemImage: "exclamationmark.triangle") }
    }

    private func shareSheet(_ v: Video) {
        guard let view = NSApp.keyWindow?.contentView else { return }
        let picker = NSSharingServicePicker(items: [v.fileURL])
        picker.show(relativeTo: NSRect(x: view.bounds.maxX - 140, y: view.bounds.midY, width: 1, height: 1), of: view, preferredEdge: .minX)
    }
}

struct PlayerView: NSViewRepresentable {
    let player: AVPlayer?
    func makeNSView(context: Context) -> AVPlayerView {
        let v = AVPlayerView(); v.controlsStyle = .floating; v.showsFullScreenToggleButton = true; v.allowsPictureInPicturePlayback = true; v.player = player; return v
    }
    func updateNSView(_ v: AVPlayerView, context: Context) { if v.player !== player { v.player = player } }
}
