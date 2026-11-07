import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let assets = root.appendingPathComponent("App/Assets.xcassets/AppIcon.appiconset")
let images = root.appendingPathComponent("Extension/Resources/images")
try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: images, withIntermediateDirectories: true)

func png(size: Int, toolbar: Bool = false) -> Data {
    let image = NSImage(size: NSSize(width: size, height: size), flipped: false) { rect in
        if !toolbar {
            let inset = rect.insetBy(dx: rect.width * 0.05, dy: rect.height * 0.05)
            let shape = NSBezierPath(roundedRect: inset, xRadius: rect.width * 0.2, yRadius: rect.height * 0.2)
            NSGradient(starting: NSColor(red: 0.12, green: 0.53, blue: 0.62, alpha: 1), ending: NSColor(red: 0.08, green: 0.34, blue: 0.49, alpha: 1))!.draw(in: shape, angle: -90)
        }
        let color: NSColor = toolbar ? .black : .white
        let configuration = NSImage.SymbolConfiguration(pointSize: rect.width * (toolbar ? 0.7 : 0.47), weight: toolbar ? .regular : .medium)
            .applying(NSImage.SymbolConfiguration(paletteColors: [color]))
        let symbol = NSImage(systemSymbolName: toolbar ? "key.horizontal" : "key.fill", accessibilityDescription: nil)!.withSymbolConfiguration(configuration)!
        let width: CGFloat
        let height: CGFloat
        if toolbar {
            let scale = min(rect.width * 0.76 / symbol.size.width, rect.height * 0.76 / symbol.size.height)
            width = symbol.size.width * scale
            height = symbol.size.height * scale
        } else {
            width = rect.width * 0.56
            height = width * symbol.size.height / symbol.size.width
        }
        symbol.draw(in: NSRect(x: (rect.width - width) / 2, y: (rect.height - height) / 2, width: width, height: height))
        return true
    }
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    image.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.representation(using: .png, properties: [:])!
}
var entries: [[String: String]] = []
for size in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let filename = "icon-\(size)@\(scale)x.png"
        try png(size: size * scale).write(to: assets.appendingPathComponent(filename))
        entries.append(["idiom": "mac", "size": "\(size)x\(size)", "scale": "\(scale)x", "filename": filename])
    }
}
let contents: [String: Any] = ["images": entries, "info": ["version": 1, "author": "xcode"]]
try JSONSerialization.data(withJSONObject: contents, options: [.prettyPrinted, .sortedKeys]).write(to: assets.appendingPathComponent("Contents.json"))
for size in [48, 64, 96, 128, 256, 512] { try png(size: size).write(to: images.appendingPathComponent("icon-\(size).png")) }
for size in [16, 19, 32, 38] { try png(size: size, toolbar: true).write(to: images.appendingPathComponent("toolbar-\(size).png")) }
print("Generated app and Safari icons")
