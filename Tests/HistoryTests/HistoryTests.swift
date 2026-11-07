import XCTest
@testable import QuietPassNative

final class MemoryRepository: HistoryRepository {
    var entries: [String: [HistoryEntry]] = [:]
    func load(profile: String) throws -> [HistoryEntry] { entries[profile] ?? [] }
    func add(_ entry: HistoryEntry, profile: String) throws { entries[profile, default: []].append(entry) }
    func remove(ids: [UUID], profile: String) throws { entries[profile]?.removeAll { ids.contains($0.id) } }
}

final class HistoryTests: XCTestCase {
    var repository: MemoryRepository!
    var defaults: UserDefaults!
    var suite: String!
    var time: Date!
    var store: HistoryStore!

    override func setUp() {
        repository = MemoryRepository()
        suite = "QuietPass.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)!
        time = Date(timeIntervalSince1970: 1_800_000_000)
        store = HistoryStore(repository: repository, defaults: defaults, now: { self.time })
    }
    override func tearDown() { defaults.removePersistentDomain(forName: suite); store = nil }

    func testRecordsSortNewestFirstAndStayProfileScoped() throws {
        try store.record(password: "password-one", action: .copy, profile: "a")
        time += 1
        try store.record(password: "password-two", action: .insert, profile: "a")
        XCTAssertEqual(try store.list(profile: "a").map(\.password), ["password-two", "password-one"])
        XCTAssertTrue(try store.list(profile: "b").isEmpty)
        XCTAssertEqual(store.retention(profile: "a"), 7)
    }

    func testExpirationAtBoundaryAndShorteningRetention() throws {
        try store.record(password: "test-password", action: .copy, profile: "a")
        time += 86_400
        try store.setRetention(1, profile: "a")
        XCTAssertTrue(try store.list(profile: "a").isEmpty)
        XCTAssertTrue(repository.entries["a"]?.isEmpty == true)
    }

    func testExpiredRecordsAreRemovedBeforeAnotherRecord() throws {
        try store.record(password: "old-password", action: .copy, profile: "a")
        time += 7 * 86_400
        try store.record(password: "new-password", action: .copy, profile: "a")
        XCTAssertEqual(try store.list(profile: "a").map(\.password), ["new-password"])
    }

    func testDisablingHistoryClearsAndPreventsWrites() throws {
        try store.record(password: "test-password", action: .copy, profile: "a")
        try store.setRetention(0, profile: "a")
        try store.record(password: "not-recorded", action: .insert, profile: "a")
        XCTAssertTrue(try store.list(profile: "a").isEmpty)
        XCTAssertEqual(store.retention(profile: "a"), 0)
    }

    func testInvalidRetentionDoesNotChangePreference() {
        XCTAssertThrowsError(try store.setRetention(2, profile: "a"))
        XCTAssertEqual(store.retention(profile: "a"), 7)
    }

    func testExtendingRetentionDoesNotReviveExpiredRecords() throws {
        try store.record(password: "expired-password", action: .copy, profile: "a")
        time += 8 * 86_400
        try store.setRetention(30, profile: "a")
        XCTAssertTrue(try store.list(profile: "a").isEmpty)
    }

    func testClearDoesNotRemoveAnotherProfilesHistory() throws {
        try store.record(password: "profile-a-pass", action: .copy, profile: "a")
        try store.record(password: "profile-b-pass", action: .copy, profile: "b")
        try store.clear(profile: "a")
        XCTAssertTrue(try store.list(profile: "a").isEmpty)
        XCTAssertEqual(try store.list(profile: "b").count, 1)
    }

    func testConcurrentAddsDoNotOverwriteRecords() throws {
        DispatchQueue.concurrentPerform(iterations: 25) { _ in
            try! store.record(password: "parallel-password", action: .copy, profile: "a")
        }
        XCTAssertEqual(try store.list(profile: "a").count, 25)
    }

    func testProtocolRejectsUnknownActionsAndUnconfirmedDeletion() {
        let service = NativeService(store: store)
        XCTAssertEqual(service.response(to: ["action":"unknown"], profile: "a")["error"] as? String, "invalidRequest")
        XCTAssertEqual(service.response(to: ["action":"clear"], profile: "a")["error"] as? String, "confirmationRequired")
        XCTAssertEqual(service.response(to: ["action":"setRetention", "days":0], profile: "a")["error"] as? String, "confirmationRequired")
        XCTAssertEqual(service.response(to: ["action":"record", "password":"short", "kind":"copy"], profile: "a")["ok"] as? Bool, false)
        XCTAssertEqual(service.response(to: ["action":"setRetention", "days":true], profile: "a")["ok"] as? Bool, false)
        XCTAssertEqual(service.response(to: ["action":"setRetention", "days":1.5], profile: "a")["ok"] as? Bool, false)
        XCTAssertEqual(service.response(to: ["action":"list"], profile: "a")["ok"] as? Bool, true)
    }

    func testRealKeychainRoundTripWhenExplicitlyEnabled() throws {
        guard ProcessInfo.processInfo.environment["QUIETPASS_RUN_KEYCHAIN_TESTS"] == "1" else {
            throw XCTSkip("Live Keychain check is explicitly enabled separately")
        }
        let repository = KeychainHistoryRepository(servicePrefix: "com.borzov.QuietPass.tests.\(UUID())")
        let entries = [
            HistoryEntry(password: "integration-password-1", action: .copy, createdAt: 1_800_000_000_000),
            HistoryEntry(password: "integration-password-2", action: .insert, createdAt: 1_800_000_000_001)
        ]
        defer { try? repository.remove(ids: entries.map(\.id), profile: "isolated-test") }
        for entry in entries { try repository.add(entry, profile: "isolated-test") }
        XCTAssertEqual(Set(try repository.load(profile: "isolated-test").map(\.password)), Set(entries.map(\.password)))
    }
}
