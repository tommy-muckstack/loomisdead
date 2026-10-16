import XCTest
@testable import LoomIsDead

final class LoomIsDeadTests: XCTestCase {
    func testDurationFormat() {
        XCTAssertEqual(Video.format(0), "0:00")
        XCTAssertEqual(Video.format(65.4), "1:05")
        XCTAssertEqual(Video.format(3725), "1:02:05")
    }
    func testQualityCaps() {
        XCTAssertEqual(VideoQuality.q1080.maxLongEdge, 1920)
        XCTAssertEqual(VideoQuality.q4k.maxLongEdge, 3840)
    }
}
