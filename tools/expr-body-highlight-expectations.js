"use strict";

// Expected supplemental captures on expr-body-captures.roc. The historical
// baseline omitted hyphenated names. Derive these ranges from fixture syntax,
// independently of query output, and compare them as an exact multiset.
module.exports = function highlightExpectations(source) {
  const captures = [];
  function add(name, row, column, text) {
    captures.push({ name, from: [row, column], to: [row, column + text.length] });
  }
  const lines = source.split("\n");
  for (const [row, line] of lines.entries()) {
    if (line.trimStart().startsWith("#")) continue;
    const declaration = line.match(/^\s*(?:var\s+)?([a-z_]+) = /);
    if (declaration) {
      add("variable.roc-special.definition", row, line.indexOf(declaration[1]), declaration[1]);
      if (!line.trimStart().startsWith("var ")) {
        add("operator.roc-special.assignment", row, line.indexOf("="), "=");
      }
    }
    for (const match of line.matchAll(/\||=>|,|:/g)) {
      const name = match[0] === "|" ? "punctuation.bracket.roc-special.lambda"
        : match[0] === "=>" ? "operator.roc-special.fat-arrow"
        : "punctuation.delimiter.roc-special.ordinary";
      add(name, row, match.index, match[0]);
    }
  }
  for (const [name, row, text] of [
    ["special.roc-special.provided", 0, "main!"],
    ["special.roc-special.package", 0, 'pf: platform "./platform/main.roc"'],
    ["variable.other.member.roc-special.declaration", 21, "field"],
    ["variable.other.member.roc-special.declaration", 41, "entry"],
    ["function.roc-special.call", 29, "to_f64"],
    ["function.roc-special.call", 51, "to_f64"],
    ["keyword.control.return.roc-special.try", 35, "?"],
  ]) {
    const column = lines[row].indexOf(text);
    if (column < 0) throw new Error(`fixture row ${row}: missing ${text}`);
    add(name, row, column, text);
  }
  return captures;
};
