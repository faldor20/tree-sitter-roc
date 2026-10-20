#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const { scanQuery, sectionedContent, applyMappingToContent } = require("./template-queries");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const face = (feature) => ({ capture: `font-lock-${feature}-face`, feature });

const input = '; ignore @phantom ( ) [ ]\n' +
  '((identifier) @one (#match? @one "^[();\\\"@phantom]"))\n' +
  '(identifier) @one @one ; @phantom [ ( ")"\n' +
  '["[" "]"] @two\n' +
  '(identifier) @removed\n' +
  '(identifier) @one\n' +
  '(identifier) @two\n';
const mapping = { one: face("one"), two: face("two"), removed: "" };
assert.equal(scanQuery(input).length, 6);
const output = sectionedContent(input, mapping, { predicates: { "#match?": "#match" } });
assert.deepEqual([...output.matchAll(/^;; feature: (.+)$/gm)].map((match) => match[1]),
  ["one", "two", "one", "two"]);
assert.match(output, /#match @font-lock-one-face "\^\[\(\);/);
assert.match(output, /"\^\[\(\);\\"@phantom\]/);
assert.match(output, /; @phantom \[ \( "\)"/);
assert.doesNotMatch(output, /@removed|#match\?/);
assert.equal((output.match(/@font-lock-one-face/g) || []).length, 5);
assert.ok(output.indexOf('["[" "]"]') < output.lastIndexOf("(identifier) @font-lock-one-face"));
assert.equal(sectionedContent('(identifier) @removed\n', mapping, {}), "\n");
assert.throws(() => sectionedContent('((identifier) @one (identifier) @two)', mapping, {}),
  /Mixed features in pattern: \(\(identifier\) @one \(identifier\) @two\)/);
assert.throws(() => sectionedContent('(identifier) @missing', mapping, {}), /Missing mappings/);
assert.equal(applyMappingToContent('(identifier) @one ; @other', { one: "legacy", other: "" }),
  '(identifier) @legacy ;');
const operands = '((identifier) @one (identifier) @removed\n' +
  ' (#eq? @one @removed))\n' +
  '((identifier) @one (#match? @one "#eq? @removed")) ; #eq? @removed\n';
const filtered = sectionedContent(operands, mapping, { predicates: { "#match?": "#match", "#eq?": "#equal" } });
assert.doesNotMatch(filtered, /\(#equal |@font-lock-one-face @/);
assert.match(filtered, /#match @font-lock-one-face "#eq\? @removed"/);
assert.match(filtered, /; #eq\? @removed/);
assert.equal(scanQuery('((identifier) @one (#eq? @one @removed))')[0]
  .captures.filter(({ predicate }) => predicate).length, 2);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "roc-query-generator-"));
try {
  const configs = path.join(temporary, "maps");
  const queries = path.join(temporary, "queries");
  fs.mkdirSync(configs);
  fs.mkdirSync(queries);
  fs.writeFileSync(path.join(configs, "emacs.json"), JSON.stringify({
    $emacs: { featureSections: true }, highlights: { one: face("one") },
  }));
  fs.writeFileSync(path.join(queries, "highlights.scm"),
    '((identifier) @one (#match? @one "@not_a_capture")) ; @also_not_a_capture\n');
  execFileSync(process.execPath, [path.join(__dirname, "template-queries.js"),
    "--config-dir", configs, "--queries-dir", queries, "--out-dir", path.join(temporary, "out")],
  { cwd: path.join(__dirname, ".."), stdio: "pipe" });
  assert.match(fs.readFileSync(path.join(temporary, "out", "emacs", path.relative(path.join(__dirname, ".."), path.join(queries, "highlights.scm"))), "utf8"),
    /@not_a_capture/);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log("Emacs query generator self-test passed");
