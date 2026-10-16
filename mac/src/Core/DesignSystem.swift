import SwiftUI

/// LoomIsDead tokens: dark floating panels, blue accent, orange record button.
enum DS {
    static func hex(_ v: UInt32, _ a: Double = 1) -> Color { Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255, opacity: a) }
    static let blue = hex(0x1868DB)
    static let blueLight = hex(0x669DF1)
    static let record = hex(0xFF623E)
    static let red = hex(0xC9372C)
    static let green = hex(0x1F845A)
    static let yellow = hex(0xFBC828)
    static let panel = hex(0x1F1F21)
    static let panelRaised = Color.white.opacity(0.07)
    static let bar = hex(0x292A2E)
    static let panelStroke = Color.white.opacity(0.1)
    static let textPrimary = hex(0xCECFD2)
    static let textStrong = Color.white
    static let textSecondary = hex(0x96999E)
    static let textTertiary = hex(0x6B6E76)
    static let radius: CGFloat = 16
    static let rowRadius: CGFloat = 16
}

/// One of the device/option rows in the recorder menu.
struct MenuRow<Trailing: View>: View {
    let symbol: String
    let title: String
    var dimmed = false
    @ViewBuilder var trailing: () -> Trailing
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: symbol).font(.system(size: 14, weight: .medium)).frame(width: 20)
                .foregroundStyle(dimmed ? DS.textTertiary : DS.textPrimary)
            Text(title).font(.system(size: 13, weight: .medium)).lineLimit(1).truncationMode(.tail)
                .foregroundStyle(dimmed ? DS.textTertiary : DS.textPrimary)
            Spacer(minLength: 6)
            trailing()
        }
        .padding(.horizontal, 14).frame(height: 48)
        .background(RoundedRectangle(cornerRadius: DS.rowRadius, style: .continuous).fill(DS.panelRaised))
        .contentShape(Rectangle())
    }
}

/// The On/Off pill on device rows.
struct OnOffPill: View {
    let on: Bool
    var body: some View {
        Text(on ? "On" : "Off").font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
            .frame(width: 33, height: 26)
            .background(RoundedRectangle(cornerRadius: 8).fill(on ? DS.green : DS.red))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var color: Color = DS.blue
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: .semibold)).foregroundStyle(.white)
            .frame(maxWidth: .infinity).frame(height: 48)
            .background(RoundedRectangle(cornerRadius: DS.rowRadius, style: .continuous).fill(color.opacity(configuration.isPressed ? 0.8 : 1)))
    }
}

/// The IsDead tombstone mark in LoomIsDead blue.
struct TombstoneMark: View {
    var size: CGFloat = 22
    var tile = DS.blue
    var stone = Color.white
    var body: some View {
        Canvas { ctx, sz in
            let k = sz.width / 32
            ctx.fill(Path(roundedRect: CGRect(x: 0, y: 0, width: 32 * k, height: 32 * k), cornerRadius: 8 * k), with: .color(tile))
            var stonePath = Path()
            stonePath.move(to: CGPoint(x: 8 * k, y: 24 * k)); stonePath.addLine(to: CGPoint(x: 8 * k, y: 13.5 * k))
            stonePath.addRelativeArc(center: CGPoint(x: 16 * k, y: 13.5 * k), radius: 8 * k, startAngle: .degrees(180), delta: .degrees(180))
            stonePath.addLine(to: CGPoint(x: 24 * k, y: 24 * k)); stonePath.closeSubpath()
            ctx.fill(stonePath, with: .color(stone))
            ctx.fill(Path(roundedRect: CGRect(x: 5 * k, y: 23 * k, width: 22 * k, height: 4.5 * k), cornerRadius: 1.6 * k), with: .color(stone))
            var x = Path(); x.move(to: CGPoint(x: 12.2 * k, y: 11.8 * k)); x.addLine(to: CGPoint(x: 19.8 * k, y: 19.4 * k))
            x.move(to: CGPoint(x: 19.8 * k, y: 11.8 * k)); x.addLine(to: CGPoint(x: 12.2 * k, y: 19.4 * k))
            ctx.stroke(x, with: .color(tile), style: StrokeStyle(lineWidth: 2.6 * k, lineCap: .round))
        }
        .frame(width: size, height: size)
    }
}

// Tokens the shared toast / selection / cursor code (from My Man) reads, tuned to LoomIsDead.
enum GellixWeight { case regular, medium, semiBold, bold
    var font: Font.Weight { switch self { case .regular: .regular; case .medium: .medium; case .semiBold: .semibold; case .bold: .bold } }
    var ns: NSFont.Weight { switch self { case .regular: .regular; case .medium: .medium; case .semiBold: .semibold; case .bold: .bold } }
}

enum MM {
    enum Colors {
        private static func dynamic(_ light: NSColor, _ dark: NSColor) -> Color {
            Color(nsColor: NSColor(name: nil) { $0.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light })
        }
        static let background = dynamic(NSColor(white: 0.97, alpha: 1), NSColor(white: 0.13, alpha: 1))
        static let surface = dynamic(NSColor(white: 1, alpha: 1), NSColor(white: 0.17, alpha: 1))
        static let textPrimary = dynamic(NSColor(white: 0.08, alpha: 1), NSColor(white: 0.95, alpha: 1))
        static let textSecondary = dynamic(NSColor(white: 0.40, alpha: 1), NSColor(white: 0.66, alpha: 1))
        static let textTertiary = dynamic(NSColor(white: 0.60, alpha: 1), NSColor(white: 0.48, alpha: 1))
        static let border = dynamic(NSColor(white: 0, alpha: 0.10), NSColor(white: 1, alpha: 0.10))
        static let accent = Color(red: 0x18 / 255, green: 0x68 / 255, blue: 0xDB / 255)
        static let onAccent = Color.white
        static let danger = Color(red: 0.94, green: 0.30, blue: 0.27)
        static let flame = accent
    }
    enum Fonts {
        static let tableSize: CGFloat = 13
        static func gellix(_ size: CGFloat, _ weight: GellixWeight = .regular) -> Font { .system(size: size, weight: weight.font) }
        static func native(_ size: CGFloat, _ weight: GellixWeight = .regular, italic: Bool = false) -> NSFont {
            let f = NSFont.systemFont(ofSize: size, weight: weight.ns)
            return italic ? NSFontManager.shared.convert(f, toHaveTrait: .italicFontMask) : f
        }
        static func coreText(_ size: CGFloat, _ weight: GellixWeight = .regular) -> CTFont { native(size, weight) }
        static var title: Font { .system(size: 17, weight: .semibold) }
        static var body: Font { .system(size: 13) }
        static var secondary: Font { .system(size: 12) }
        static var metadata: Font { .system(size: 11) }
        static var hint: Font { .system(size: 11) }
    }
    enum Layout {
        static let padding: CGFloat = 12
        static let paddingLarge: CGFloat = 16
        static let radius: CGFloat = 10
        static let radiusSmall: CGFloat = 6
        static let spacing: CGFloat = 10
    }
    enum Motion {
        static let gentle = Animation.easeInOut(duration: 0.22)
        static let elastic = Animation.spring(response: 0.3, dampingFraction: 0.7)
        static let silky = Animation.timingCurve(0.4, 0, 0.2, 1, duration: 0.28)
    }
}

extension View {
    /// Clickable standard: pointer cursor + a comfortable hit area.
    func clickable(minSize: CGFloat = 24) -> some View {
        frame(minWidth: minSize, minHeight: minSize).contentShape(Rectangle())
            .onHover { inside in inside ? NSCursor.pointingHand.push() : NSCursor.pop() }
    }
}

