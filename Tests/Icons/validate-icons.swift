import AppKit

var failed = false
for size in [16, 19, 32, 38] {
    let path = "Extension/Resources/images/toolbar-\(size).png"
    let bitmap = NSBitmapImageRep(data: try Data(contentsOf: URL(fileURLWithPath: path)))!
    var minX = size, minY = size, maxX = -1, maxY = -1
    for y in 0..<size { for x in 0..<size {
        if bitmap.colorAt(x: x, y: y)!.alphaComponent > 0.05 {
            minX = min(minX, x); maxX = max(maxX, x)
            minY = min(minY, y); maxY = max(maxY, y)
        }
    }}
    let padding = max(1, Int(Double(size) * 0.1))
    let valid = maxX >= minX && minX >= padding && minY >= padding && maxX < size - padding && maxY < size - padding
    print("\(size)px: glyph \(maxX - minX + 1)×\(maxY - minY + 1), bounds [\(minX),\(minY)]–[\(maxX),\(maxY)] \(valid ? "PASS" : "FAIL: insufficient padding")")
    failed = failed || !valid
}
if failed { exit(1) }
