import Foundation
import WatchConnectivity

/// Manifest odebranego pliku, zapisywany obok samego audio w Documents/watch-inbox/<id>.json.
/// docs/02-architektura.md §6.2: metadane {id, recordedAt, durationMs} przychodzą z zegarka
/// (F4-02) w `WCSessionFile.metadata`.
struct InboxFileManifest: Codable {
    let id: String
    let recordedAt: String
    let durationMs: Int
    let path: String

    var asDictionary: [String: Any?] {
        ["id": id, "recordedAt": recordedAt, "durationMs": durationMs, "path": path]
    }
}

/// WCSessionDelegate po stronie iPhone'a. Aktywowany raz (przy starcie modułu Expo), przyjmuje
/// pliki przesłane z zegarka przez `WCSession.transferFile` (F4-02), zapisuje je razem z
/// manifestem do Documents/watch-inbox/ i powiadamia JS przez callback (podpięty jako event
/// modułu Expo w WatchConnectivityModule.swift).
final class WatchConnectivityManager: NSObject {
    static let shared = WatchConnectivityManager()

    /// Liczba ostatnich statusów przechowywanych w applicationContext. WCSession.updateApplicationContext
    /// NADPISUJE poprzedni kontekst (nie kolejkuje), więc żeby zegarek widział status więcej niż
    /// jednego niedawnego nagrania, cały context za każdym razem niesie pełną, ograniczoną listę
    /// — nie tylko najnowszy wpis.
    private static let maxRecentStatuses = 20

    private let inboxDirectory: URL
    private var onFileReceived: ((InboxFileManifest) -> Void)?
    private var recentStatuses: [(id: String, status: String, updatedAt: Date)] = []

    private override init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.inboxDirectory = documents.appendingPathComponent("watch-inbox", isDirectory: true)
        super.init()
        try? FileManager.default.createDirectory(at: inboxDirectory, withIntermediateDirectories: true)
    }

    /// Aktywuje WCSession i rejestruje callback wywoływany po każdym odebranym pliku. Bezpieczne
    /// do wywołania wielokrotnie (np. przy odtworzeniu modułu) — nadpisuje tylko callback.
    func start(onFileReceived: @escaping (InboxFileManifest) -> Void) {
        self.onFileReceived = onFileReceived
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func listInboxFiles() -> [InboxFileManifest] {
        let entries = (try? FileManager.default.contentsOfDirectory(at: inboxDirectory, includingPropertiesForKeys: nil)) ?? []
        let decoder = JSONDecoder()
        return entries
            .filter { $0.pathExtension == "json" }
            .compactMap { url -> InboxFileManifest? in
                guard let data = try? Data(contentsOf: url) else { return nil }
                return try? decoder.decode(InboxFileManifest.self, from: data)
            }
    }

    func clearInboxFile(id: String) {
        let manifestURL = inboxDirectory.appendingPathComponent("\(id).json")
        if let data = try? Data(contentsOf: manifestURL),
           let manifest = try? JSONDecoder().decode(InboxFileManifest.self, from: data) {
            try? FileManager.default.removeItem(at: URL(fileURLWithPath: manifest.path))
        }
        try? FileManager.default.removeItem(at: manifestURL)
    }

    /// Wysyła status nagrania na zegarek. `id` musi zgadzać się z tym nadanym na zegarku (F4-02),
    /// żeby ContentView mogło dopasować status do właściwej pozycji w swojej kolejce.
    func sendRecordingStatus(id: String, status: String) {
        recentStatuses.removeAll { $0.id == id }
        recentStatuses.append((id: id, status: status, updatedAt: Date()))
        if recentStatuses.count > Self.maxRecentStatuses {
            recentStatuses.removeFirst(recentStatuses.count - Self.maxRecentStatuses)
        }

        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }

        let formatter = ISO8601DateFormatter()
        let payload: [[String: Any]] = recentStatuses.map {
            ["id": $0.id, "status": $0.status, "updatedAt": formatter.string(from: $0.updatedAt)]
        }

        do {
            try WCSession.default.updateApplicationContext(["recordingStatuses": payload])
        } catch {
            // Niepowodzenie updateApplicationContext (np. sesja jeszcze nieaktywna) nie jest
            // krytyczne — zegarek dostanie aktualny kontekst przy kolejnym wywołaniu tej metody.
        }
    }

    private func saveReceivedFile(_ file: WCSessionFile) {
        guard let metadata = file.metadata,
              let id = metadata["id"] as? String,
              let recordedAt = metadata["recordedAt"] as? String,
              let durationMs = metadata["durationMs"] as? Int else {
            return
        }

        let destinationURL = inboxDirectory.appendingPathComponent("\(id).m4a")
        try? FileManager.default.removeItem(at: destinationURL)
        do {
            try FileManager.default.copyItem(at: file.fileURL, to: destinationURL)
        } catch {
            return
        }

        let manifest = InboxFileManifest(id: id, recordedAt: recordedAt, durationMs: durationMs, path: destinationURL.path)
        let manifestURL = inboxDirectory.appendingPathComponent("\(id).json")
        if let data = try? JSONEncoder().encode(manifest) {
            try? data.write(to: manifestURL, options: .atomic)
        }

        onFileReceived?(manifest)
    }
}

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // Wymagane przy obsłudze wielu zegarków: reaktywacja po zmianie sparowanego urządzenia.
        WCSession.default.activate()
    }

    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        saveReceivedFile(file)
    }
}
