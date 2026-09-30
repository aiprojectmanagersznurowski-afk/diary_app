import SwiftUI

/// Start/stop recording (F4-02). Sending status back down to the watch (processed/failed) is
/// F4-05 — here each queued item just shows whether it has been handed off to the phone yet.
struct ContentView: View {
    @StateObject private var recordingManager = RecordingManager()

    var body: some View {
        VStack(spacing: 12) {
            Text("Vocaly")
                .font(.headline)

            Button(action: toggleRecording) {
                Image(systemName: recordingManager.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(recordingManager.isRecording ? .red : .accentColor)
            }
            .buttonStyle(.plain)

            if let error = recordingManager.lastError {
                Text(error)
                    .font(.caption2)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            if !recordingManager.queue.isEmpty {
                Text("Transfer")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                List(recordingManager.queue) { item in
                    HStack {
                        Text(item.recordedAt, style: .time)
                        Spacer()
                        Text(item.transferInitiated ? "wysłano" : "oczekuje")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Status przetwarzania po stronie serwera (F4-05/F4-06) — osobna lista od kolejki
            // transferu powyżej: nagranie może już zniknąć z kolejki (transfer zakończony), a
            // status przetworzenia (transkrypcja, zapis) przychodzi z iPhone'a później.
            if !recordingManager.recordingStatuses.isEmpty {
                Text("Status")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                List(recordingManager.recordingStatuses) { entry in
                    HStack {
                        statusIcon(for: entry.status)
                        Text(statusLabel(for: entry.status))
                            .font(.caption2)
                    }
                }
            }
        }
        .padding()
        .onAppear {
            recordingManager.resumePendingTransfers()
        }
    }

    private func statusLabel(for status: String) -> String {
        switch status {
        case "done": return "przetworzone"
        case "failed": return "błąd"
        default: return "oczekuje"
        }
    }

    private func statusIcon(for status: String) -> some View {
        switch status {
        case "done":
            return Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        case "failed":
            return Image(systemName: "xmark.circle.fill").foregroundColor(.red)
        default:
            return Image(systemName: "clock").foregroundColor(.secondary)
        }
    }

    private func toggleRecording() {
        if recordingManager.isRecording {
            recordingManager.stopRecording()
        } else {
            recordingManager.startRecording()
        }
    }
}

#Preview {
    ContentView()
}
