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
            // Original geometric Q monogram; app artwork does not use SF Symbols.
            let monogram = NSBezierPath(roundedRect: NSRect(x: rect.width * 0.23, y: rect.height * 0.25, width: rect.width * 0.54, height: rect.height * 0.57), xRadius: rect.width * 0.17, yRadius: rect.height * 0.17)
            monogram.append(NSBezierPath(roundedRect: NSRect(x: rect.width * 0.35, y: rect.height * 0.37, width: rect.width * 0.30, height: rect.height * 0.33), xRadius: rect.width * 0.065, yRadius: rect.height * 0.065))
            monogram.windingRule = .evenOdd
            NSColor.white.setFill()
            monogram.fill()
            let tail = NSBezierPath()
            tail.move(to: NSPoint(x: rect.width * 0.53, y: rect.height * 0.43))
            tail.line(to: NSPoint(x: rect.width * 0.75, y: rect.height * 0.23))
            tail.lineWidth = rect.width * 0.115
            tail.lineCapStyle = .round
            NSColor.white.setStroke()
            tail.stroke()
            return true
        }
        let configuration = NSImage.SymbolConfiguration(pointSize: rect.width * 0.7, weight: .regular)
            .applying(NSImage.SymbolConfiguration(paletteColors: [.black]))
        let symbol = NSImage(systemSymbolName: "key.horizontal", accessibilityDescription: nil)!.withSymbolConfiguration(configuration)!
        let scale = min(rect.width * 0.76 / symbol.size.width, rect.height * 0.76 / symbol.size.height)
        let width = symbol.size.width * scale
        let height = symbol.size.height * scale
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
