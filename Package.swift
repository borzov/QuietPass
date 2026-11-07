// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "QuietPassNative",
    platforms: [.macOS(.v15)],
    products: [.library(name: "QuietPassNative", targets: ["QuietPassNative"])],
    targets: [
        .target(name: "QuietPassNative", path: "Native", exclude: ["NativeHandler.swift"]),
        .testTarget(name: "HistoryTests", dependencies: ["QuietPassNative"], path: "Tests/HistoryTests")
    ],
    swiftLanguageModes: [.v5]
)
