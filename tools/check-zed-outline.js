#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.join(__dirname, "..");
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const snapshot = path.join(root, "test/fixtures/Builtin.zed-outline.txt");
const required = [
  "Builtin > Str > is_empty", "Builtin > Str > concat", "Builtin > Str > trim",
  "Builtin > List > len", "Builtin > List > map",
  "Builtin > Bool > not", "Builtin > Bool > is_eq",
];
const compare = (a, b) => a[0] - b[0] || a[1] - b[1];
const contains = (a, b) => compare(a.start, b.start) <= 0 && compare(a.end, b.end) >= 0;

function textAt(lines, capture) {
  // Tree-sitter columns are bytes; names and syntax context are single-line.
  const { start, end } = capture;
  assert.ok(start[0] >= 0 && end[0] < lines.length && compare(start, end) < 0, "Invalid capture range");
  assert.ok(start[1] <= lines[start[0]].length && end[1] <= lines[end[0]].length, "Capture column outside source");
  assert.equal(start[0], end[0], "Outline name must be single-line");
  return lines[start[0]].subarray(start[1], end[1]).toString();
}

function parseMatches(output, source, sourcePath) {
  const byteLines = source.split("\n").map((line) => Buffer.from(line));
  const matches = [];
  let current;
  for (const line of output.split(/\r?\n/)) {
    if (/^\s*pattern: \d+\s*$/.test(line)) {
      current = [];
      matches.push(current);
    } else if (/^\s*capture:/.test(line)) {
      assert.ok(current, "Capture outside match");
      const match = line.match(/^\s*capture: (?:\d+ - )?([\w.-]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\)(?:, text:.*)?$/);
      assert.ok(match, `Cannot parse capture: ${line}`);
      current.push({ capture: match[1], start: [+match[2], +match[3]], end: [+match[4], +match[5]] });
    } else if (line.trim() && line !== sourcePath) {
      throw new Error(`Unexpected query output: ${line}`);
    }
  }
  assert.ok(matches.length, "Query returned no outline matches");
  return matches.map((captures) => {
    const items = captures.filter((c) => c.capture === "item");
    const names = captures.filter((c) => c.capture === "name");
    assert.equal(items.length, 1, "Each match must have exactly one @item");
    assert.equal(names.length, 1, "Each match must have exactly one @name");
    assert.ok(contains(items[0], names[0]), "@name must be inside @item");
    const name = textAt(byteLines, names[0]);
    assert.ok(name && !/[\r\n]/.test(name), "Outline name must be nonempty and single-line");
    return { ...items[0], name };
  });
}

function outline(entries) {
  const sorted = [...entries].sort((a, b) => compare(a.start, b.start) || compare(b.end, a.end));
  const stack = [];
  const paths = new Set();
  const lines = [];
  let previous;
  for (const entry of sorted) {
    assert.ok(compare(entry.start, entry.end) < 0, "Empty or reversed @item range");
    if (previous && compare(previous.start, entry.start) === 0 && compare(previous.end, entry.end) === 0) {
      throw new Error(`Equal @item ranges: ${previous.name} and ${entry.name}`);
    }
    previous = entry;
    while (stack.length && !contains(stack.at(-1), entry)) {
      assert.ok(compare(stack.at(-1).end, entry.start) <= 0, "Crossing @item ranges");
      stack.pop();
    }
    paths.add([...stack.map((parent) => parent.name), entry.name].join(" > "));
    lines.push(`${"  ".repeat(stack.length)}${entry.name} L${entry.start[0] + 1}-L${entry.end[0] + 1}`);
    stack.push(entry);
  }
  return { rendered: `${lines.join("\n")}\n`, paths };
}

function requirePaths(paths, expected) {
  for (const entry of expected) {
    assert.ok(paths.has(entry), `Missing required outline path: ${entry}`);
  }
}

function checkSnapshot(file, rendered, record, force) {
  if (record) {
    assert.ok(force || !fs.existsSync(file), "Snapshot exists; use --record --force to replace it");
    fs.writeFileSync(file, rendered);
    return;
  }
  assert.ok(fs.existsSync(file), "Outline snapshot missing; use --record to create it");
  assert.equal(rendered, fs.readFileSync(file, "utf8"), "Outline snapshot differs; review before --record --force");
}

function query(queryPath, sourcePath) {
  return execFileSync(cli, ["query", queryPath, sourcePath], {
    cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "roc-outline-"));
  try {
    const source = "Outer :: [].{\n  Inner :: [].{\n    leaf = 1\n  }\n  sibling = 2\n}\ntail = 3\n";
    const sourcePath = path.join(dir, "inline.roc");
    const queryPath = path.join(dir, "outline.scm");
    const inlineQuery = "[(opaque_type_def name: (apply_type (concrete_type) @name)) (nominal_type_def name: (apply_type (concrete_type) @name))] @item\n(value_declaration pattern: (decl_left (identifier_pattern (identifier) @name))) @item\n";
    fs.writeFileSync(sourcePath, source);
    fs.writeFileSync(queryPath, inlineQuery);
    const output = query(queryPath, sourcePath);
    const parse = (text) => parseMatches(text, source, sourcePath);
    const entries = parse(output);
    assert.throws(() => parse(output.replace(sourcePath, path.join(dir, "unexpected.roc"))), /Unexpected query output/);
    const result = outline(entries.reverse());
    assert.equal(result.rendered, "Outer L1-L6\n  Inner L2-L4\n    leaf L3-L3\n  sibling L5-L5\ntail L7-L7\n");
    requirePaths(result.paths, ["Outer > Inner > leaf", "Outer > sibling", "tail"]);
    assert.throws(() => requirePaths(result.paths, ["Outer > missing"]), /Missing required outline path/);
    assert.throws(() => outline([...entries, entries[0]]), /Equal @item ranges/);
    assert.throws(() => parse(""), /no outline matches/);
    assert.throws(() => parse(output.replace(/capture: \d+ - name,.*\n/, "")), /exactly one @name/);
    assert.throws(() => parse(output.replace(/capture: (?:\d+ - )?item,.*\n/, "")), /exactly one @item/);
    const captureLine = output.split("\n").find((line) => line.includes(" - name,"));
    assert.throws(() => parse(output.replace(captureLine, `${captureLine}\n${captureLine}`)), /exactly one @name/);
    assert.throws(() => parse("  pattern: 0\n capture: nonsense\n"), /Cannot parse capture/);
    assert.throws(() => outline([{ name: "a", start: [0, 0], end: [2, 0] }, { name: "b", start: [1, 0], end: [3, 0] }]), /Crossing/);
    const byteLines = [Buffer.from("é name"), Buffer.from("next")];
    assert.equal(textAt(byteLines, { start: [0, 3], end: [0, 7] }), "name");
    assert.throws(() => textAt(byteLines, { start: [0, 3], end: [1, 4] }), /single-line/);
    assert.throws(() => textAt(byteLines, { start: [0, 3], end: [0, 8] }), /column outside source/);
    assert.throws(() => textAt(byteLines, { start: [0, 3], end: [0, 3] }), /Invalid capture range/);

    // Exercise the shipped query separately from the hierarchy helper query.
    const productionSource = "Alias : U64\nOpaque :: [].{\n  Nested : U64\n  method : U64\n  method = 1\n}\nNominal := []\nsignature : U64\nvalue = |arg| {\n  Local : a\n  local : U64\n  local = arg\n  local\n}\n";
    const productionPath = path.join(dir, "production.roc");
    fs.writeFileSync(productionPath, productionSource);
    execFileSync(cli, ["parse", "--quiet", productionPath], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const productionEntries = parseMatches(query(path.join(root, "queries-generated/zed/queries/outline.scm"), productionPath), productionSource, productionPath);
    assert.deepEqual(productionEntries.map(({ name, start, end }) => ({ name, start, end })), [
      { name: "Alias", start: [0, 0], end: [0, 11] },
      { name: "Opaque", start: [1, 0], end: [5, 1] },
      { name: "Nominal", start: [6, 0], end: [6, 13] },
      { name: "signature", start: [7, 0], end: [7, 15] },
      { name: "value", start: [8, 0], end: [13, 1] },
    ]);
    assert.equal(outline(productionEntries).rendered, "Alias L1-L1\nOpaque L2-L6\nNominal L7-L7\nsignature L8-L8\nvalue L9-L14\n");
    const sameStart = outline([{ name: "inner", start: [0, 0], end: [1, 0] }, { name: "outer", start: [0, 0], end: [2, 0] }]);
    requirePaths(sameStart.paths, ["outer > inner"]);
    const file = path.join(dir, "snapshot.txt");
    assert.throws(() => checkSnapshot(file, "a\n", false, false), /--record/);
    checkSnapshot(file, "a\n", true, false);
    assert.throws(() => checkSnapshot(file, "b\n", true, false), /--record --force/);
    assert.equal(fs.readFileSync(file, "utf8"), "a\n");
    assert.throws(() => checkSnapshot(file, "b\n", false, false), /snapshot differs/);
    checkSnapshot(file, "b\n", true, true);
    checkSnapshot(file, "b\n", false, false);

    const queries = path.join(dir, "queries");
    const maps = path.join(dir, "maps");
    const out = path.join(dir, "generated");
    fs.mkdirSync(queries); fs.mkdirSync(maps);
    fs.writeFileSync(path.join(queries, "outline.scm"), inlineQuery);
    const mapPath = path.join(maps, "test.json");
    const generate = () => spawnSync(process.execPath, [path.join(root, "tools/template-queries.js"), "--queries-dir", queries, "--config-dir", maps, "--out-dir", out], { cwd: dir, encoding: "utf8" });
    fs.writeFileSync(mapPath, JSON.stringify({ outline: false }));
    assert.equal(generate().status, 0, "Explicit false must skip a family");
    assert.ok(!fs.existsSync(out), "Opt-out must not generate an outline file");
    fs.writeFileSync(mapPath, "{}");
    const missing = generate();
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Missing mapping section for test\/outline/);
    fs.writeFileSync(mapPath, JSON.stringify({ outline: { item: "item" } }));
    assert.match(generate().stderr, /Missing mappings for test\/outline: name/);
    console.log("Zed outline self-tests passed (CLI matches, containment, rendering, failure paths, snapshot guards, generator opt-out/completeness)");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) assert.ok(["--self-test", "--record", "--force"].includes(arg), `Unknown argument: ${arg}`);
  assert.ok(!args.has("--force") || args.has("--record"), "--force requires --record");
  if (args.has("--self-test")) selfTest();
  const sourcePath = path.join(root, "test/fixtures/Builtin.roc");
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = outline(parseMatches(query(path.join(root, "queries-generated/zed/queries/outline.scm"), sourcePath), source, sourcePath));
  requirePaths(result.paths, required);
  checkSnapshot(snapshot, result.rendered, args.has("--record"), args.has("--force"));
  console.log("Zed outline required paths and snapshot passed");
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
