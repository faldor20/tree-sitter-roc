import XCTest
import SwiftTreeSitter
import TreeSitterRoc

final class TreeSitterRocTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_roc())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Roc grammar")
    }
}
