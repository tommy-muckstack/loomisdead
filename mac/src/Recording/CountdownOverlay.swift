import AppKit
import SwiftUI

/// Full-screen 3-2-1: a blue circle with the number, Cancel on the left,
/// Skip on the right, click the circle to pause, an encouragement line below.
/// Shown before capture starts, so it never lands in the video.
@MainActor
enum CountdownOverlay {
    private static var panels: [NSPanel] = []
    private static var model: Model?
    private static var continuation: CheckedContinuation<Bool, Never>?

    static let messages = [
        "You got this. Let's record 💪", "People want to hear what you have to say 😎", "You were born to be on camera 📹",
        "Breathe in...breathe out...Let's record. 😌", "You can always pause to gather your thoughts 💭", "You're a natural at this 💪",
        "Don't sweat the ums—we all do 'em! 😊", "Your viewers are gonna love you! 😍", "Mistakes are human—embrace them! 🤝",
        "You're the star of the show! ✨", "Keep up the great work! 🙏", "Press Opt+Shift+P to pause your recording ⏸️",
        "'Ums' make you human (not a robot) 🤖", "Lights, camera, action! You've got this. ✨", "Press Cmd+Shift+R to restart your recording 🔄",
        "Lookin' good ☀️", "Your smile is contagious 😁", "If you mess up, just keep going! 💪", "Unpolished videos are OK! ✨",
        "Here we go. It's time to record! 🎥",
    ]

    final class Model: ObservableObject {
        @Published var value = 3
        @Published var paused = false
        let message = CountdownOverlay.messages.randomElement()!
    }

    /// true = go, false = cancelled.
    static func run(from start: Int = 3) async -> Bool {
        dismiss()
        let m = Model(); m.value = start; model = m
        let screen = NSScreen.main ?? NSScreen.screens[0]
        let p = KeyPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        p.level = .screenSaver; p.isOpaque = false; p.backgroundColor = .clear; p.hasShadow = false
        p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]; p.sharingType = .none
        p.contentView = NSHostingView(rootView: CountdownView(model: m, cancel: { finish(false) }, skip: { finish(true) }))
        p.orderFrontRegardless(); p.makeKey(); panels = [p]
        let esc = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { e in if e.keyCode == 53 { finish(false); return nil }; return e }
        let escG = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { e in if e.keyCode == 53 { Task { @MainActor in finish(false) } } }
        defer { esc.map(NSEvent.removeMonitor); escG.map(NSEvent.removeMonitor) }
        let ticker = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard let model, !model.paused else { continue }
                if model.value <= 1 { finish(true); return }
                model.value -= 1
            }
        }
        let go = await withCheckedContinuation { continuation = $0 }
        ticker.cancel()
        return go
    }

    private static func finish(_ go: Bool) {
        panels.forEach { $0.orderOut(nil) }; panels = []; model = nil
        let c = continuation; continuation = nil; c?.resume(returning: go)
    }
    static func dismiss() { if continuation != nil { finish(false) } else { panels.forEach { $0.orderOut(nil) }; panels = [] } }
}

struct CountdownView: View {
    @ObservedObject var model: CountdownOverlay.Model
    let cancel: () -> Void
    let skip: () -> Void
    @State private var hoverCircle = false
    @State private var pulse = false
    var body: some View {
        ZStack {
            Color.black.opacity(0.75)
            VStack(spacing: 36) {
                HStack(spacing: 48) {
                    side("xmark", "Cancel", cancel)
                    Button { model.paused.toggle() } label: {
                        ZStack {
                            Circle().fill(LinearGradient(colors: model.paused ? [Color(red: 27/255, green: 49/255, blue: 96/255, opacity: 0.6), Color(red: 12/255, green: 52/255, blue: 110/255, opacity: 0.6)] : [Color(red: 70/255, green: 136/255, blue: 236/255, opacity: 0.7), Color(red: 24/255, green: 104/255, blue: 219/255, opacity: 0.7)], startPoint: .top, endPoint: .bottom))
                                .shadow(color: Color(red: 147/255, green: 130/255, blue: 178/255, opacity: 0.2), radius: 20, y: 2)
                            if model.paused || hoverCircle {
                                VStack(spacing: 6) {
                                    Image(systemName: model.paused ? "play.fill" : "pause.fill").font(.system(size: 34, weight: .semibold))
                                    Text(model.paused ? "Resume" : "Pause").font(.system(size: 16, weight: .semibold))
                                }.foregroundStyle(.white)
                            } else {
                                Text("\(model.value)").font(.system(size: 115, weight: .medium)).foregroundStyle(.white)
                                    .scaleEffect(pulse ? 1.06 : 0.96).contentTransition(.numericText(countsDown: true))
                            }
                        }.frame(width: 190, height: 190)
                    }.buttonStyle(.plain).onHover { hoverCircle = $0 }
                    side("forward.end.fill", "Skip", skip)
                }
                Text(model.message).font(.system(size: 14, weight: .medium)).foregroundStyle(.white)
                    .padding(.horizontal, 16).padding(.vertical, 9).background(Capsule().fill(DS.bar))
            }
        }
        .ignoresSafeArea()
        .animation(.default, value: model.value)
        .onAppear { withAnimation(.timingCurve(0.45, 0, 0.4, 1, duration: 0.6).repeatForever(autoreverses: true).delay(0.425)) { pulse = true } }
    }
    private func side(_ symbol: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        SideButton(symbol: symbol, label: label, run: run)
    }
}

private struct SideButton: View {
    let symbol: String; let label: String; let run: () -> Void
    @State private var hover = false
    var body: some View {
        Button(action: run) {
            ZStack {
                Circle().fill(hover ? DS.bar.opacity(0.5) : .clear)
                Circle().strokeBorder(Color(white: 0.72), lineWidth: 1.5)
                if hover { Text(label).font(.system(size: 14, weight: .semibold)) } else { Image(systemName: symbol).font(.system(size: 24, weight: .semibold)) }
            }.foregroundStyle(.white).frame(width: 100, height: 100).contentShape(Circle())
        }.buttonStyle(.plain).onHover { hover = $0 }
    }
}

/// Static countdown for screenshots (DebugCLI).
struct CountdownPreview: View {
    var body: some View { CountdownView(model: CountdownOverlay.Model(), cancel: {}, skip: {}) }
}
