import ExpoModulesCore

/// Moduł Expo eksponujący WatchConnectivityManager do JS (F4-03).
/// docs/02-architektura.md §6.2: odbiór plików z zegarka, inbox, zdarzenie do JS.
public final class WatchConnectivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WatchConnectivity")

        Events("onInboxFileReceived")

        OnCreate {
            WatchConnectivityManager.shared.start { [weak self] manifest in
                self?.sendEvent("onInboxFileReceived", manifest.asDictionary)
            }
        }

        AsyncFunction("getInboxFiles") { () -> [[String: Any?]] in
            WatchConnectivityManager.shared.listInboxFiles().map { $0.asDictionary }
        }

        AsyncFunction("clearInboxFile") { (id: String) in
            WatchConnectivityManager.shared.clearInboxFile(id: id)
        }

        // Rezerwacja API pod F4-05/F4-06 — patrz WatchConnectivityManager.sendRecordingStatus.
        AsyncFunction("sendRecordingStatus") { (id: String, status: String) in
            WatchConnectivityManager.shared.sendRecordingStatus(id: id, status: status)
        }
    }
}
