import Foundation
import Security

final class KeychainHistoryRepository: HistoryRepository {
    private let servicePrefix: String
    init(servicePrefix: String = "com.borzov.QuietPass.history") { self.servicePrefix = servicePrefix }

    private func query(profile: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "\(servicePrefix).\(profile)",
         kSecAttrSynchronizable as String: false]
    }

    func load(profile: String) throws -> [HistoryEntry] {
        var request = query(profile: profile)
        request[kSecMatchLimit as String] = kSecMatchLimitAll
        // The macOS login Keychain forbids returning all password data in one query.
        request[kSecReturnAttributes as String] = true
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { return [] }
        guard status == errSecSuccess, let attributes = result as? [[String: Any]] else { throw HistoryStoreError.storageUnavailable }
        var entries: [HistoryEntry] = []
        for item in attributes {
            guard let account = item[kSecAttrAccount as String] as? String else { throw HistoryStoreError.storageUnavailable }
            var single = query(profile: profile)
            single[kSecAttrAccount as String] = account
            single[kSecMatchLimit as String] = kSecMatchLimitOne
            single[kSecReturnData as String] = true
            var value: CFTypeRef?
            let itemStatus = SecItemCopyMatching(single as CFDictionary, &value)
            if itemStatus == errSecItemNotFound { continue }
            guard itemStatus == errSecSuccess, let data = value as? Data else { throw HistoryStoreError.storageUnavailable }
            entries.append(try JSONDecoder().decode(HistoryEntry.self, from: data))
        }
        return entries
    }

    func add(_ entry: HistoryEntry, profile: String) throws {
        var item = query(profile: profile)
        item[kSecAttrAccount as String] = entry.id.uuidString
        item[kSecAttrLabel as String] = "QuietPass — история паролей"
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        item[kSecValueData as String] = try JSONEncoder().encode(entry)
        guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw HistoryStoreError.storageUnavailable }
    }

    func remove(ids: [UUID], profile: String) throws {
        for id in ids {
            var item = query(profile: profile)
            item[kSecAttrAccount as String] = id.uuidString
            let status = SecItemDelete(item as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else { throw HistoryStoreError.storageUnavailable }
        }
    }
}
