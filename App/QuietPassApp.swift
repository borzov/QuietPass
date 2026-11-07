import SwiftUI

@main
struct QuietPassApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
            .windowResizability(.contentSize)
            .defaultSize(width: 480, height: 430)
    }
}
