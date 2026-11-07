import Foundation

enum HistoryAction: String, Codable { case copy, insert }

struct HistoryEntry: Codable, Equatable {
    let id: UUID
    let password: String
    let createdAt: Double
    let action: HistoryAction

    init(id: UUID = UUID(), password: String, action: HistoryAction, createdAt: Double) {
        self.id = id
        self.password = password
        self.action = action
        self.createdAt = createdAt
    }
}

protocol HistoryRepository {
    func load(profile: String) throws -> [HistoryEntry]
    func add(_ entry: HistoryEntry, profile: String) throws
    func remove(ids: [UUID], profile: String) throws
}

enum HistoryStoreError: Error { case invalidRetention, storageUnavailable }

final class HistoryStore {
    private let repository: HistoryRepository
    private let defaults: UserDefaults
    private let now: () -> Date
    private let lock = NSRecursiveLock()
    static let allowedDays = [0, 1, 7, 30, 90]

    init(repository: HistoryRepository, defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init) {
        self.repository = repository
        self.defaults = defaults
        self.now = now
    }

    func retention(profile: String) -> Int {
        lock.lock(); defer { lock.unlock() }
        let value = defaults.object(forKey: "history.days.\(profile)") as? Int ?? 7
        return Self.allowedDays.contains(value) ? value : 7
    }

    private func retained(profile: String, days: Int) throws -> [HistoryEntry] {
        let all = try repository.load(profile: profile)
        let cutoff = now().timeIntervalSince1970 * 1000 - Double(days) * 86_400_000
        let expired = all.filter { days == 0 || $0.createdAt <= cutoff }
        try repository.remove(ids: expired.map(\.id), profile: profile)
        let expiredIDs = Set(expired.map(\.id))
        return all.filter { !expiredIDs.contains($0.id) }.sorted { $0.createdAt > $1.createdAt }
    }

    func list(profile: String) throws -> [HistoryEntry] {
        lock.lock(); defer { lock.unlock() }
        return try retained(profile: profile, days: retention(profile: profile))
    }

    func record(password: String, action: HistoryAction, profile: String) throws {
        lock.lock(); defer { lock.unlock() }
        let days = retention(profile: profile)
        _ = try retained(profile: profile, days: days)
        guard days > 0 else { return }
        try repository.add(HistoryEntry(password: password, action: action, createdAt: now().timeIntervalSince1970 * 1000), profile: profile)
    }

    func setRetention(_ days: Int, profile: String) throws {
        guard Self.allowedDays.contains(days) else { throw HistoryStoreError.invalidRetention }
        lock.lock(); defer { lock.unlock() }
        // Apply the current expiry first: extending retention must not revive expired items.
        _ = try retained(profile: profile, days: retention(profile: profile))
        _ = try retained(profile: profile, days: days)
        defaults.set(days, forKey: "history.days.\(profile)")
    }

    func clear(profile: String) throws {
        lock.lock(); defer { lock.unlock() }
        try repository.remove(ids: repository.load(profile: profile).map(\.id), profile: profile)
    }
}
