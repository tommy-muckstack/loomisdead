import AppKit
import Foundation

/// PostHog, IsDead taxonomy (yourappisdead/ANALYTICS.md): one shared project,
/// super props product/surface/platform, explicit `app_*` events only, no free
/// text, anonymous id, no autocapture, nothing on localhost-style dev builds.
enum Analytics {
    private static let token = "phc_nrzr9eEcwg6H89hkh4DmBU4nL9ntSArzQXV2SR2vaE2F" // publishable project token (IsDead, US cloud)
    private static let endpoint = URL(string: "https://us.i.posthog.com/batch/")!
    private static let queue = DispatchQueue(label: "analytics", qos: .utility)
    private static var pending: [[String: Any]] = []
    private static var flushScheduled = false
    static var enabled: Bool { Bundle.main.bundleURL.pathExtension == "app" && !(Bundle.main.bundleURL.path.contains("/.build/dev/")) && !UserDefaults.standard.bool(forKey: "analyticsOptOut") }

    static var distinctID: String {
        if let id = UserDefaults.standard.string(forKey: "analyticsDistinctID") { return id }
        let id = UUID().uuidString.lowercased(); UserDefaults.standard.set(id, forKey: "analyticsDistinctID"); return id
    }

    private static var superProperties: [String: Any] {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        return ["product": "loomisdead", "surface": "app", "platform": "mac",
                "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev",
                "app_build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0",
                "os_version": "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)",
                "$lib": "loomisdead-mac", "$process_person_profile": false]
    }

    static func track(_ event: String, _ properties: [String: Any] = [:]) {
        guard enabled else { return }
        var props = superProperties
        for (k, v) in properties { props[k] = v }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let item: [String: Any] = ["event": event, "distinct_id": distinctID, "properties": props, "timestamp": f.string(from: Date())]
        queue.async {
            pending.append(item)
            guard !flushScheduled else { return }
            flushScheduled = true
            queue.asyncAfter(deadline: .now() + 2) { flush() }
        }
    }

    private static func flush() {
        flushScheduled = false
        let batch = pending; pending = []
        guard !batch.isEmpty, let body = try? JSONSerialization.data(withJSONObject: ["api_key": token, "batch": batch]) else { return }
        var req = URLRequest(url: endpoint); req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type"); req.httpBody = body
        URLSession.shared.dataTask(with: req).resume()
    }
}
