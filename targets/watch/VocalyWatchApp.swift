import SwiftUI

// Szkielet aplikacji watchOS (F4-01). Nagrywanie, kolejka lokalna i transfer do iPhone'a
// (WCSession.transferFile) to zakres F4-02 — ten plik celowo pokazuje tylko pusty ekran
// startowy, żeby potwierdzić, że target się buduje i uruchamia.
@main
struct VocalyWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        Text("Vocaly")
            .font(.headline)
    }
}

#Preview {
    ContentView()
}
