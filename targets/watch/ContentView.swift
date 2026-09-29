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
        }
        .padding()
        .onAppear {
            recordingManager.resumePendingTransfers()
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
