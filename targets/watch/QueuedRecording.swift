import Foundation

/// A recording made on the watch that is waiting to be (or has been) handed off to
/// `WCSession.transferFile`. Persisted to disk so the queue survives app relaunches
/// (docs/02-architektura.md §6.2: "zamknięcie i ponowne otwarcie aplikacji na zegarku nie gubi
/// nagrania oczekującego na transfer").
struct QueuedRecording: Codable, Identifiable, Equatable {
    /// Client-generated UUID — the idempotency key used all the way through the pipeline
    /// (same pattern as EnqueueRecordingUseCase on the phone side).
    let id: String
    let recordedAt: Date
    let durationMs: Int
    /// True once `WCSession.transferFile` has been called for this recording. The system
    /// keeps retrying an in-flight transfer across relaunches on its own, so this flag only
    /// exists to avoid submitting the same file twice, not to drive our own retry loop.
    var transferInitiated: Bool

    var fileName: String { "\(id).m4a" }
}

/// Reads/writes the queue as a single JSON file in Documents. watchOS has no expo-sqlite
/// equivalent available here, and the queue is small (a handful of pending recordings at most),
/// so a flat JSON file is simpler than embedding a database.
final class RecordingQueueStore {
    private let queueURL: URL
    let recordingsDirectory: URL

    init(fileManager: FileManager = .default) {
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.queueURL = documents.appendingPathComponent("watch-recording-queue.json")
        self.recordingsDirectory = documents.appendingPathComponent("recordings", isDirectory: true)
        try? fileManager.createDirectory(at: recordingsDirectory, withIntermediateDirectories: true)
    }

    func load() -> [QueuedRecording] {
        guard let data = try? Data(contentsOf: queueURL) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([QueuedRecording].self, from: data)) ?? []
    }

    func save(_ queue: [QueuedRecording]) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(queue) else { return }
        try? data.write(to: queueURL, options: .atomic)
    }

    func audioFileURL(for recording: QueuedRecording) -> URL {
        recordingsDirectory.appendingPathComponent(recording.fileName)
    }
}
