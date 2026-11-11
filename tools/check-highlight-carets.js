#!/usr/bin/env node
"use strict";

// `tree-sitter test` (0.25.10, cli/src/test_highlight.rs `iterate_assertions`)
// accepts a caret assertion when any highlight overlapping the caret columns
// has the expected name, so a shifted or truncated caret run still passes.
// This guard requires each `^` run to cover one complete capture exactly, and
// each `<-` arrow to sit on the first column of a capture with the asserted name.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const fixtureDir = path.join(root, "test/highlight");
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const query = path.join(root, "queries/highlights.scm");

// Mirrors cli/src/query_testing.rs `parse_position_comments` for line comments.
const ASSERTION = /^(\s*#[^\^<]*?)(?:(\^+)|<-)\s*(!)?\s*([\w\-.]+)/;

function parseAssertions(source) {
  const lines = source.split("\n");
  const assertionRows = new Set();
  const raw = [];
  lines.forEach((line, row) => {
    const match = line.match(ASSERTION);
    if (!match || row === 0) return;
    assertionRows.add(row);
    const caret = match[2] !== undefined;
    raw.push({
      row,
      column: caret ? match[1].length : line.indexOf("#"),
      length: caret ? match[2].length : 1,
      caret,
      negative: match[3] === "!",
      scope: match[4],
      text: line,
    });
  });
  for (const assertion of raw) {
    let target = assertion.row;
    // The CLI skips assertion lines and lines whose byte length (with newline) does not reach the column.
    while (assertionRows.has(target) || Buffer.byteLength(lines[target]) + 1 <= assertion.column) {
      assert.ok(target > 0, `no target line for assertion on line ${assertion.row + 1}`);
      target -= 1;
    }
    assertion.target = target;
  }
  return { lines, assertions: raw };
}

function parseCaptures(output, lines) {
  const captures = [];
  for (const line of output.split("\n")) {
    const match = line.match(/capture: \d+ - ([\w\-.]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\)/);
    if (!match) continue;
    const [, name, sr, sc, er, ec] = match;
    if (Number(sr) !== Number(er)) continue;
    // Capture columns are bytes; caret columns are characters.
    const bytes = Buffer.from(lines[Number(sr)] ?? "");
    const toChar = (column) => bytes.subarray(0, column).toString().length;
    captures.push({ name, row: Number(sr), start: toChar(Number(sc)), end: toChar(Number(ec)) });
  }
  return captures;
}

function nameMatches(name, scope) {
  return name === scope || name.startsWith(`${scope}.`);
}

function verify(file, source, output) {
  const { lines, assertions } = parseAssertions(source);
  const captures = parseCaptures(output, lines);
  const failures = [];
  for (const a of assertions) {
    if (a.negative) continue;
    const onRow = captures.filter((c) => c.row === a.target);
    const ok = onRow.some((c) => nameMatches(c.name, a.scope) && c.start === a.column
      && (!a.caret || c.end === a.column + a.length));
    if (!ok) {
      const covered = lines[a.target].slice(a.column, a.column + a.length);
      const near = onRow.filter((c) => nameMatches(c.name, a.scope))
        .map((c) => `${lines[a.target].slice(c.start, c.end)}@${c.start}..${c.end}`);
      failures.push(`${file}:${a.row + 1}: ${a.caret ? "^" : "<-"} ${a.scope} covers \`${covered}\` at ${a.column}..${a.column + a.length} of line ${a.target + 1}; matching captures: ${near.join(", ") || "none"}`);
    }
  }
  return { count: assertions.length, failures };
}

function runQuery(file) {
  const result = spawnSync(cli, ["query", "--captures", query, file], {
    cwd: root, encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `tree-sitter query exited ${result.status}: ${result.stderr}`);
  return result.stdout;
}

function checkFile(file) {
  return verify(path.relative(root, file), fs.readFileSync(file, "utf8"), runQuery(file));
}

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "roc-carets-"));
  try {
    const check = (body) => {
      const file = path.join(dir, "probe.roc");
      fs.writeFileSync(file, body);
      return checkFile(file).failures;
    };
    const code = "import Foo exposing [Type, bar]\n";
    const exact = `${code}#                    ^^^^ special.roc-special.exposed\n#                          ^^^ special.roc-special.exposed\n`;
    assert.deepEqual(check(exact), [], "exact carets rejected");
    assert.equal(check(`${code}#                     ^^^^ special.roc-special.exposed\n`).length, 1, "shifted caret accepted");
    assert.equal(check(`${code}#                    ^^^ special.roc-special.exposed\n`).length, 1, "too-short caret accepted");
    assert.equal(check(`${code}#                    ^^^^^ special.roc-special.exposed\n`).length, 1, "too-long caret accepted");
    assert.equal(check(`${code}#                    ^^^^ keyword\n`).length, 1, "wrong scope accepted");
    assert.deepEqual(check(`${code}# <- keyword\n`), [], "arrow at token start rejected");
    assert.equal(check(`x = 1\n  # <- variable\n`).length, 1, "arrow off token start accepted");
    assert.deepEqual(check(`${code}\n#                    ^^^^ special.roc-special.exposed\n`), [], "blank line not skipped like CLI");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log("Highlight caret guard self-test passed (exact, shifted, short, long, wrong scope, arrows).");
}

function main(args) {
  if (args.includes("--self-test")) selfTest();
  const files = args.filter((arg) => !arg.startsWith("--"));
  const targets = files.length ? files.map((f) => path.resolve(f)) : fs.readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".roc")).sort().map((name) => path.join(fixtureDir, name));
  assert.ok(targets.length > 0, "no highlight fixtures found");
  let total = 0;
  const failures = [];
  for (const file of targets) {
    const result = checkFile(file);
    total += result.count;
    failures.push(...result.failures);
  }
  assert.ok(failures.length === 0, `${failures.length} misaligned assertion(s):\n${failures.join("\n")}`);
  console.log(`Highlight carets: ${total} assertions in ${targets.length} fixtures cover exact captures.`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`Highlight caret check failed: ${error.message}`);
  process.exitCode = 1;
}
