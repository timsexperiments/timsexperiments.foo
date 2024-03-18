// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "hello_world",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [
        // Declare Vapor as a dependency of your package.
        .package(url: "https://github.com/vapor/vapor.git", from: "4.92.4"),
    ],
    targets: [
        .executableTarget(
            name: "hello_world",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ]),
    ]
)
