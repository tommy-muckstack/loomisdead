import Foundation
struct AgentError: Error, LocalizedError {
    let code: String; let message: String
    init(_ code: String, _ message: String) { self.code = code; self.message = message }
    var errorDescription: String? { message }
}
