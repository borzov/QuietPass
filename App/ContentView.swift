import SwiftUI
import SafariServices

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var enabled: Bool?
    @State private var message = ""
    private let extensionIdentifier = "com.borzov.QuietPass.Extension"

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "key.fill")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)
            VStack(spacing: 6) {
                Text("QuietPass").font(.largeTitle.weight(.semibold))
                Text("Новый пароль — прямо в Safari")
                    .font(.title3).foregroundStyle(.secondary)
            }
            Text("Включите расширение в Safari. Затем нажмите значок ключа в панели браузера, чтобы сгенерировать, скопировать или вставить пароль.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Label(enabled == true ? "Расширение включено" : enabled == false ? "Расширение пока выключено" : "Проверяем состояние…",
                  systemImage: enabled == true ? "checkmark.circle" : "puzzlepiece.extension")
                .font(.callout)
            Button("Открыть настройки Safari") {
                SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionIdentifier) { error in
                    DispatchQueue.main.async {
                        message = error == nil ? "" : "Не удалось открыть настройки. В Safari выберите «Настройки → Расширения → QuietPass»."
                    }
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Text(message.isEmpty ? "Настройки и история доступны в окне расширения. История хранится локально в Связке ключей." : message)
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
