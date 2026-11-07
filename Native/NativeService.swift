import Foundation
import CoreFoundation

final class NativeService {
    private let store: HistoryStore
    init(store: HistoryStore) { self.store = store }

    func response(to message: Any, profile: String) -> [String: Any] {
        guard let request = message as? [String: Any], let action = request["action"] as? String else {
            return ["ok": false, "error": "invalidRequest"]
        }
        do {
            switch action {
            case "list": break
            case "record":
                guard let password = request["password"] as? String, (8...64).contains(password.count),
                      let kind = request["kind"] as? String, let operation = HistoryAction(rawValue: kind) else {
                    return ["ok": false, "error": "invalidRequest"]
                }
                try store.record(password: password, action: operation, profile: profile)
            case "setRetention":
                guard let number = request["days"] as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
                      number.doubleValue == Double(number.intValue), HistoryStore.allowedDays.contains(number.intValue) else {
                    return ["ok": false, "error": "invalidRequest"]
                }
                if number.intValue == 0 && request["confirmed"] as? Bool != true {
                    return ["ok": false, "error": "confirmationRequired"]
                }
                try store.setRetention(number.intValue, profile: profile)
            case "clear":
                guard request["confirmed"] as? Bool == true else { return ["ok": false, "error": "confirmationRequired"] }
                try store.clear(profile: profile)
            default: return ["ok": false, "error": "invalidRequest"]
            }
            let entries = try JSONSerialization.jsonObject(with: JSONEncoder().encode(store.list(profile: profile)))
            return ["ok": true, "entries": entries, "retentionDays": store.retention(profile: profile)]
        } catch {
            return ["ok": false, "error": "storageUnavailable"]
        }
    }
}
