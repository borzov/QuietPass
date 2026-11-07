import SwiftUI
import SafariServices

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var enabled: Bool?
    @State private var message: String?
    private let extensionIdentifier = "com.borzov.QuietPass.Extension"

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "key.fill")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)
            VStack(spacing: 6) {
                Text("QuietPass").font(.largeTitle.weight(.semibold))
                Text("onboarding.subtitle")
                    .font(.title3).foregroundStyle(.secondary)
            }
            Text("onboarding.instructions")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Label {
                Text(LocalizedStringKey(enabled == true ? "onboarding.enabled" : enabled == false ? "onboarding.disabled" : "onboarding.checking"))
            } icon: {
                Image(systemName: enabled == true ? "checkmark.circle" : "puzzlepiece.extension")
            }
            .font(.callout)
            Button("onboarding.openSettings") {
                SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionIdentifier) { error in
                    DispatchQueue.main.async {
                        if error == nil { NSApp.terminate(nil) }
                        else { message = "onboarding.settingsError" }
                    }
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Text(LocalizedStringKey(message ?? "onboarding.privacy"))
                .font(.footnote).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .frame(width: 480)
        .onAppear(perform: refresh)
        .onChange(of: scenePhase) { _, phase in if phase == .active { refresh() } }
    }

    private func refresh() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionIdentifier) { state, _ in
            DispatchQueue.main.async { enabled = state?.isEnabled }
        }
    }
}
