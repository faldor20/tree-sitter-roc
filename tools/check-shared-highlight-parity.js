#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const source = [
  "value = 1",
  "pair = (1, 2)",
  "(left, right) = pair",
  "A(item) = value",
  "Animal := [Dog(Str)]",
  "Dog.(pet) = value",
  "var $count = 0",
  "call = value?",
  "mapped = value ? |err| Err(err)",
  "result = crash \"oops\"",
  "identity = |arg| arg",
  "constructed = Dog.(\"Fido\")",
  "use = identity(value)",
  "record = {name: value}",
  "access = record.name",
  "with_comma = (1, 2)",
  "",
].join("\n");
const headerSource = 'platform ""\n    requires {}\n    exposes []\n    packages {}\n    provides [main] to pf\n\nmain = 1\n';
const expected = [
  ["variable.roc-special.definition", 0, "value"],
  ["variable.roc-special.definition", 2, "left"],
  ["variable.roc-special.definition", 2, "right"],
  ["variable.roc-special.definition", 3, "item"],
  ["variable.roc-special.definition", 5, "pet"],
  ["type", 5, "Dog"],
  ["variable.roc-special.definition", 6, "$count"],
  ["keyword.control.return.roc-special.try", 7, "?"],
  ["keyword.control.return.roc-special.try", 8, "?"],
  ["keyword.control.exception", 9, "crash"],
  ["punctuation.bracket.roc-special.lambda", 10, "|"],
  ["operator.roc-special.assignment", 0, "="],
  ["type", 11, "Dog"],
  ["function.roc-special.call", 12, "identity"],
  ["variable.other.member.roc-special.declaration", 13, "name"],
  ["variable.other.member", 14, "name"],
  ["punctuation.delimiter.roc-special.ordinary", 15, ","],
];

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "roc-shared-highlights-"));
try {
  const fixture = path.join(directory, "parity.roc");
  fs.writeFileSync(fixture, source);
  const output = execFileSync(cli, ["query", "--captures", "queries/highlights.scm", fixture], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const captures = [...output.matchAll(/capture: \d+ - ([\w.-]+), start: \((\d+), (\d+)\), end: \(\d+, \d+\), text: `([^`]*)`/g)]
    .map((match) => ({ name: match[1], row: Number(match[2]), column: Number(match[3]), text: match[4] }));
  const lines = source.split("\n");
  for (const [name, row, text] of expected) {
    const column = lines[row].indexOf(text);
    assert.ok(column >= 0, `fixture row ${row + 1} has no ${text}`);
    assert.ok(captures.some((capture) => capture.name === name && capture.row === row && capture.column === column && capture.text === text),
      `missing ${name} on ${text} at ${row + 1}:${column + 1}`);
  }
  const header = path.join(directory, "header.roc");
  fs.writeFileSync(header, headerSource);
  const headerOutput = execFileSync(cli, ["query", "--captures", "queries/highlights.scm", header], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  assert.match(headerOutput, /keyword\.control, start: \(2, 4\).*text: `exposes`/);
  console.log(`${expected.length + 1} shared highlight captures verified`);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
