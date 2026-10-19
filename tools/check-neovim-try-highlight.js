#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const mapping = require(path.join(root, "query-maps/neovim.json"));
const highlights = fs.readFileSync(
  path.join(root, "queries-generated/neovim/queries/highlights.scm"),
  "utf8",
);
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const fixture = "postfix = f()?\ninfix = f() ? |e| E(e)\n";
const tryPositions = fixture.split("\n").slice(0, 2).map((line, row) => `${row}, ${line.indexOf("?")}`);

function checkTryCaptures(query, directory) {
  const queryPath = path.join(directory, "highlights.scm");
  const fixturePath = path.join(directory, "try.roc");
  fs.writeFileSync(queryPath, query);
  fs.writeFileSync(fixturePath, fixture);
  const output = execFileSync(cli, ["query", "--captures", queryPath, fixturePath], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  for (const position of tryPositions) {
    const captures = output.split("\n").filter((line) =>
      line.includes(`start: (${position}),`) && line.includes("text: `?`"),
    ).map((line) => {
      const match = line.match(/capture: \d+ - ([\w.-]+), start:/);
      assert.ok(match, `Could not read try operator capture: ${line}`);
      return match[1];
    });
    assert.deepEqual(captures, ["keyword.return"], `Wrong capture for ? at (${position})`);
  }
}

function checkInTemporaryDirectory(query, selfTest) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "roc-try-highlight-"));
  try {
    if (selfTest) {
      const pattern = '[(try_operator) "return"] @keyword.return';
      assert.throws(() => checkTryCaptures("", directory), /Wrong capture/);
      assert.throws(() => checkTryCaptures(`; ${pattern}\n`, directory), /Wrong capture/);
      assert.throws(() => checkTryCaptures(`${pattern}.extra\n`, directory), /Wrong capture/);
      checkTryCaptures('[(try_operator) ; a query comment\n "return"] @keyword.return\n', directory);
      console.log("Neovim try highlight failure-path tests passed");
    }
    checkTryCaptures(query, directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

assert.equal(mapping.highlights["keyword.control.return"], "keyword.return");
checkInTemporaryDirectory(highlights, process.argv.includes("--self-test"));
console.log("Neovim try operator uses @keyword.return");
