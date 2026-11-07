import Foundation
import SafariServices

final class NativeHandler: NSObject, NSExtensionRequestHandling {
    private static let service = NativeService(store: HistoryStore(repository: KeychainHistoryRepository()))
    private static let queue = DispatchQueue(label: "com.borzov.QuietPass.history")

    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let userInfo = item.userInfo,
              let message = userInfo[SFExtensionMessageKey] else {
            context.completeRequest(returningItems: nil)
            return
        }
        let profile = (userInfo[SFExtensionProfileKey] as? UUID)?.uuidString ?? "default"
        Self.queue.async {
            let response = NSExtensionItem()
            response.userInfo = [SFExtensionMessageKey: Self.service.response(to: message, profile: profile)]
            context.completeRequest(returningItems: [response])
        }
    }
}
