import AppKit

/// The selection overlay can draw a frozen screenshot behind the crosshair.
/// LoomIsDead selects over the live screen, so it always passes nil.
struct CompositeCapture {
    let image: NSImage
    let combinedFrame: CGRect
    let scaleFactor: CGFloat
    func crop(to rect: CGRect) -> NSImage? { nil }
}
