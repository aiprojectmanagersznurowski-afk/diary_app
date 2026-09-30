import Foundation
import AVFoundation
import WatchConnectivity
import Combine

/// Owns recording (AVAudioRecorder), the local pending-transfer queue, and handing finished
/// recordings off to the phone via WCSession.transferFile. docs/02-architektura.md §6.2.
final class RecordingManager: NSObject, ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var queue: [QueuedRecording] = []
    @Published private(set) var lastError: String?
    /// Status ostatnich nagrań odesłany z iPhone'a (F4-05). Aktualizowany bez restartu aplikacji
    /// zegarka — nowy applicationContext dociera do już działającej sesji WCSession.
    @Published private(set) var recordingStatuses: [RecordingStatusEntry] = []

    private let store: RecordingQueueStore
    private var audioRecorder: AVAudioRecorder?
    private var currentRecordingId: String?
    private var currentRecordingStartedAt: Date?

    /// AAC, mono, 16 kHz, 32 kbps — same speech-optimised preset as SPEECH_MONO on the phone
    /// (src/infrastructure/audio/expoAudioRecorder.ts), for a consistent, small file size.
    private static let recordingSettings: [String: Any] = [
        AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
        AVSampleRateKey: 16000,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 32000,
        AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
    ]

    override init() {
        self.store = RecordingQueueStore()
        super.init()
        self.queue = store.load()

        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    // MARK: - Recording

    func startRecording() {
        guard !isRecording else { return }
        lastError = nil

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
        } catch {
            lastError = "Nie udało się aktywować mikrofonu: \(error.localizedDescription)"
            return
        }

        let id = UUID().uuidString
        let startedAt = Date()
        let tempURL = store.recordingsDirectory.appendingPathComponent("\(id).m4a")

        do {
            let recorder = try AVAudioRecorder(url: tempURL, settings: Self.recordingSettings)
            recorder.delegate = self
            guard recorder.record() else {
                lastError = "Nagrywanie nie ruszyło"
                return
            }
            audioRecorder = recorder
            currentRecordingId = id
            currentRecordingStartedAt = startedAt
            isRecording = true
        } catch {
            lastError = "Błąd inicjalizacji nagrywania: \(error.localizedDescription)"
        }
    }

    func stopRecording() {
        guard isRecording, let recorder = audioRecorder, let id = currentRecordingId,
              let startedAt = currentRecordingStartedAt else { return }

        recorder.stop()
        try? AVAudioSession.sharedInstance().setActive(false)

        let durationMs = Int(recorder.currentTime * 1000)
        let item = QueuedRecording(id: id, recordedAt: startedAt, durationMs: durationMs, transferInitiated: false)

        queue.append(item)
        store.save(queue)

        audioRecorder = nil
        currentRecordingId = nil
        currentRecordingStartedAt = nil
        isRecording = false

        submitTransfer(for: item)
    }

    // MARK: - Transfer to iPhone

    /// Submits every queued item that has not yet been handed to WCSession — called once at
    /// startup to resume anything that never made it past `stopRecording` (e.g. the app was
    /// killed before `transferFile` was called). Items already submitted are left alone: the
    /// system keeps retrying those across relaunches on its own, so re-submitting would just
    /// create a duplicate transfer.
    func resumePendingTransfers() {
        for item in queue where !item.transferInitiated {
            submitTransfer(for: item)
        }
    }

    private func submitTransfer(for item: QueuedRecording) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else {
            // activate() was already called in init(); session(_:activationDidCompleteWith:)
            // will call resumePendingTransfers() once it's ready.
            return
        }

        let fileURL = store.audioFileURL(for: item)
        let metadata: [String: Any] = [
            "id": item.id,
            "recordedAt": ISO8601DateFormatter().string(from: item.recordedAt),
            "durationMs": item.durationMs,
        ]
        session.transferFile(fileURL, metadata: metadata)
        markTransferInitiated(id: item.id)
    }

    private func markTransferInitiated(id: String) {
        guard let index = queue.firstIndex(where: { $0.id == id }) else { return }
        queue[index].transferInitiated = true
        store.save(queue)
    }

    private func removeFromQueue(id: String) {
        guard let index = queue.firstIndex(where: { $0.id == id }) else { return }
        let item = queue[index]
        try? FileManager.default.removeItem(at: store.audioFileURL(for: item))
        queue.remove(at: index)
        store.save(queue)
    }
}

extension RecordingManager: AVAudioRecorderDelegate {
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        lastError = "Błąd kodowania nagrania: \(error?.localizedDescription ?? "nieznany")"
    }
}

extension RecordingManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            DispatchQueue.main.async { [weak self] in
                self?.resumePendingTransfers()
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let rawStatuses = applicationContext["recordingStatuses"] as? [[String: Any]] else { return }

        let entries = rawStatuses.compactMap { dict -> RecordingStatusEntry? in
            guard let id = dict["id"] as? String, let status = dict["status"] as? String else { return nil }
            return RecordingStatusEntry(id: id, status: status)
        }

        DispatchQueue.main.async { [weak self] in
            self?.recordingStatuses = entries
        }
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        guard let id = fileTransfer.file.metadata?["id"] as? String else { return }
        DispatchQueue.main.async { [weak self] in
            if let error {
                // Transfer failed after the system exhausted its own retries. Leave
                // transferInitiated as-is; a future app launch's resumePendingTransfers would
                // not retry it (already marked initiated) — surfacing this to the user via
                // lastError is enough for the MVP, matching "błąd AI nie usuwa nagrania" (§9):
                // the local file and queue entry are kept, nothing is silently lost.
                self?.lastError = "Transfer nagrania nie powiódł się: \(error.localizedDescription)"
                return
            }
            self?.removeFromQueue(id: id)
        }
    }
}
