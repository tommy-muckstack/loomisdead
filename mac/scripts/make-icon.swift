// Renders assets/icon-1024.png: the IsDead tombstone mark (same geometry as
// the other IsDead apps, 32-unit grid) in LoomIsDead blue: blue squircle,
// white stone, blue X. Run: swift scripts/make-icon.swift
import AppKit

let S: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S), bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
func rgb(_ hex: UInt32) -> CGColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1).cgColor
}

// macOS icon grid: 824pt squircle centred on the 1024 canvas.
let inset: CGFloat = 100
let card = CGRect(x: inset, y: inset, width: S - 2 * inset, height: S - 2 * inset)
let squircle = CGPath(roundedRect: card, cornerWidth: 185, cornerHeight: 185, transform: nil)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 28, color: NSColor.black.withAlphaComponent(0.28).cgColor)
ctx.addPath(squircle); ctx.setFillColor(rgb(0x1868DB)); ctx.fillPath()
ctx.restoreGState()
ctx.saveGState()
ctx.addPath(squircle); ctx.clip()
let grad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [rgb(0x2F7FEA), rgb(0x1257BE)] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: S - inset), end: CGPoint(x: 0, y: inset), options: [])
ctx.restoreGState()

// Map the 32-unit SVG grid (y down) onto the squircle with a little margin.
let unit = card.width / 32 * 0.86
let origin = CGPoint(x: S / 2 - 16 * unit, y: S / 2 + 16.4 * unit)
func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: origin.x + x * unit, y: origin.y - y * unit) }

// Stone: M16 5.5 a8 8 0 0 1 8 8 V24 H8 V13.5 a8 8 0 0 1 8-8z
let stone = CGMutablePath()
stone.move(to: p(8, 24))
stone.addLine(to: p(8, 13.5))
stone.addArc(center: p(16, 13.5), radius: 8 * unit, startAngle: .pi, endAngle: 0, clockwise: true)
stone.addLine(to: p(24, 24))
stone.closeSubpath()
ctx.addPath(stone); ctx.setFillColor(rgb(0xFFFFFF)); ctx.fillPath()
// Base (filled on its own: opposite winding would punch a seam): rect x5 y23 w22 h4.5 rx1.6
ctx.addPath(CGPath(roundedRect: CGRect(x: p(5, 27.5).x, y: p(5, 27.5).y, width: 22 * unit, height: 4.5 * unit),
                     cornerWidth: 1.6 * unit, cornerHeight: 1.6 * unit, transform: nil))
ctx.fillPath()

// X: M12.2 11.8 l7.6 7.6  M19.8 11.8 l-7.6 7.6, stroke 2.6, round caps.
let x = CGMutablePath()
x.move(to: p(12.2, 11.8)); x.addLine(to: p(19.8, 19.4))
x.move(to: p(19.8, 11.8)); x.addLine(to: p(12.2, 19.4))
ctx.addPath(x)
ctx.setStrokeColor(rgb(0x1868DB)); ctx.setLineWidth(2.6 * unit); ctx.setLineCap(.round); ctx.strokePath()

NSGraphicsContext.current = nil
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "assets/icon-1024.png"))
print("wrote assets/icon-1024.png")
