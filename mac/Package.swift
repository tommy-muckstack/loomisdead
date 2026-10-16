// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LoomIsDead",
    platforms: [.macOS("15.0")],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle.git", from: "2.9.0"),
    ],
    targets: [
        .executableTarget(
            name: "LoomIsDead",
            dependencies: [.product(name: "Sparkle", package: "Sparkle")],
            path: "src"
        ),
        .testTarget(name: "LoomIsDeadTests", dependencies: ["LoomIsDead"], path: "Tests"),
    ]
)
