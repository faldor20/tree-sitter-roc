#!/usr/bin/env node
"use strict";

// Pinned CLI XML preserves anonymous tokens, fields, source ranges and recovery.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const baseline = path.join(__dirname, "operator-trees-baseline.json");
const operators = ["|>", "and", "or", "&&", "||", "+", "*", "-", "//", "/", "<=", "<", ">=", ">", "^", "%", "..<", "..=", "->", "==", "!=", "??"];
const fixtures = [
  {
    name: "operators-and-trivia", status: 0,
    source: operators.map((op, i) => `infix_${i} = a ${op} b\nfunction_${i} = (${op})`).join("\n") + `
no_gap = a+b
tabs = a\t+\tb
multiple_spaces = a   +   b
## operator documentation
documented = a + b
doc_between = a + ## operand documentation
    b
minus = a-1
negative = (-1)
postfix = a?
infix_try = a ? b
comment = a + # comment
    b
pipeline = a |> f(b)
`,
  },
  ...[
    ["incomplete-pipeline", "a |>"],
    ["incomplete-addition", "a +"],
    ["incomplete-function-operator", "(+"],
    ["doubled-pipeline", "a |>|> b"],
  ].map(([name, expression]) => ({
    name, status: 1,
    source: `before = 1\nbroken = ${expression}\nafter = 2\nlast = after + 3\n`,
  })),
  { name: "incomplete-pipeline-eof", status: 1, source: "broken = a |>\n" },
];

function sameLines(label, expected, actual) {
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    if (expected[i] !== actual[i]) {
      throw new Error(`${label}: first mismatch at line ${i + 1}\nexpected: ${JSON.stringify(expected[i])}\nactual:   ${JSON.stringify(actual[i])}`);
    }
  }
}
function compare(expected, actual) {
  sameLines("fixture inventory", expected.map((f) => f.name), actual.map((f) => f.name));
  for (let i = 0; i < expected.length; i++) {
    const a = expected[i], b = actual[i];
    sameLines(`${a.name} source`, a.source.split("\n"), b.source.split("\n"));
    assert.equal(b.status, a.status, `${a.name}: parse status changed`);
    sameLines(`${a.name} XML`, a.xml, b.xml);
  }
}
function checkProcess(label, result, expectedStatus) {
  const detail = `${label}: status=${result.status}, signal=${result.signal || "none"}\nspawn error: ${result.error ? result.error.stack || result.error : "none"}\nstderr:\n${result.stderr || "(empty)"}\nstdout:\n${result.stdout || "(empty)"}`;
  assert.ok(!result.error, detail);
  assert.equal(result.signal, null, detail);
  assert.equal(result.status, expectedStatus, detail);
}
function parse(fixture, directory) {
  const input = path.join(directory, `${fixture.name}.roc`);
  fs.writeFileSync(input, fixture.source);
  const result = spawnSync(cli, ["parse", "--xml", input], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 30000,
  });
  checkProcess(fixture.name, result, fixture.status);
  const start = result.stdout.indexOf("<file "), end = result.stdout.indexOf("</file>");
  assert.ok(start >= 0 && end > start, `${fixture.name}: no complete XML tree\n${result.stderr}\n${result.stdout}`);
  const xml = result.stdout.slice(start, end + "</file>".length);
  if (fixture.status === 0) {
    assert.ok(!/<ERROR[ >]|<MISSING[ >]/.test(xml), `${fixture.name}: unexpected recovery node`);
    assert.ok(xml.includes("<doc_comment "), "doc-comment trivia fixture was not parsed as documentation");
  } else {
    // CLI XML renders a missing anonymous ')' as a blank line; its summary
    // reports MISSING explicitly. Keep that diagnostic check as well as XML.
    assert.ok(xml.includes("<ERROR ") || result.stdout.includes("MISSING"), `${fixture.name}: recovery fixture lacks ERROR or MISSING diagnostic\n${result.stdout}`);
    if (!fixture.name.endsWith("-eof")) {
      assert.ok(xml.includes(">last</identifier>"), `${fixture.name}: parser did not reach trailing declaration`);
    }
  }
  return { ...fixture, xml: xml.split("\n") };
}
function selfTest() {
  const example = [{ name: "test", status: 1, source: "x = a |>\n", xml: [
    '<file srow="0" scol="0" erow="1" ecol="0">',
    '  <ERROR field="body" srow="0" scol="6" erow="0" ecol="8">',
    '    <operator_identifier srow="0" scol="6" erow="0" ecol="8">',
    '      |&gt;', '    </operator_identifier>', '  </ERROR>', '</file>',
  ] }];
  compare(example, structuredClone(example));
  for (const [name, mutate] of [
    ["range", (f) => { f.xml[1] = f.xml[1].replace('ecol="8"', 'ecol="9"'); }],
    ["field", (f) => { f.xml[1] = f.xml[1].replace('field="body"', 'field="part"'); }],
    ["anonymous token", (f) => { f.xml[3] = "      +"; }],
    ["recovery node", (f) => { f.xml[2] = f.xml[2].replace("operator_identifier", "operator"); }],
    ["source", (f) => { f.source = "x = a +\n"; }],
  ]) {
    const changed = structuredClone(example); mutate(changed[0]);
    assert.throws(() => compare(example, changed), /test (source|XML): first mismatch at line/, `${name} mutation escaped comparison`);
  }
  for (const result of [
    { status: null, signal: null, error: new Error("ENOENT self-test"), stderr: "launch detail" },
    { status: null, signal: "SIGTERM", stderr: "signal detail" },
    { status: 0, signal: null, stderr: "status detail" },
  ]) assert.throws(() => checkProcess("launch test", result, 1), /detail|ENOENT/);
  console.log("Operator guard self-test passed: range, field, anonymous token, recovery node, source and process failures rejected");
}
function main() {
  const args = process.argv.slice(2);
  assert.ok(args.every((arg) => ["--self-test", "--record", "--force"].includes(arg)), "Usage: check-operator-trees.js [--self-test] [--record [--force]]");
  assert.ok(!args.includes("--force") || args.includes("--record"), "--force requires --record");
  if (args.includes("--self-test")) selfTest();
  if (args.includes("--record")) {
    assert.ok(!fs.existsSync(baseline) || args.includes("--force"), "Baseline exists; reviewed replacement requires --record --force");
    // Recording a candidate would erase the compatibility evidence.
    const result = spawnSync("git", ["diff", "HEAD", "--exit-code", "--", "grammar.js", "src/scanner.c", "src/parser.c", "src/grammar.json", "src/node-types.json"], { cwd: root, encoding: "utf8" });
    checkProcess("baseline recording requires unchanged production parser", result, 0);
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "roc-operator-trees-"));
  try {
    const actual = fixtures.map((fixture) => parse(fixture, directory));
    if (args.includes("--record")) fs.writeFileSync(baseline, JSON.stringify(actual, null, 2) + "\n", { flag: args.includes("--force") ? "w" : "wx" });
    else compare(JSON.parse(fs.readFileSync(baseline, "utf8")), actual);
    console.log(`Operator full-tree regression passed: ${operators.length} operators, verified trivia, ${fixtures.length - 1} recovery fixtures`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main();
