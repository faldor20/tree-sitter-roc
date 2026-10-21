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

// Check the shipped query contract, not only the synthetic lexer fixture.
const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "query-maps/emacs.json"), "utf8"));
const source = fs.readFileSync(path.join(root, "queries/highlights.scm"), "utf8");
const generated = fs.readFileSync(path.join(root, "queries-generated/emacs/queries/highlights.scm"), "utf8");
assert.equal(config.$emacs.omitPredicates, true);
assert.deepEqual(config.highlights["variable.roc-special.inferred-definition"],
  { capture: "font-lock-variable-name-face", feature: "definition-names" });
assert.equal(generated, sectionedContent(source, config.highlights, config.$emacs));
const sourcePatterns = scanQuery(source);
const patternFeatures = sourcePatterns.flatMap(({ captures }) => {
  const retained = captures.filter(({ name, predicate }) =>
    !predicate && config.highlights[name] &&
    typeof config.highlights[name] === "object");
  if (!retained.length || captures.some(({ predicate }) => predicate)) return [];
  return [config.highlights[retained[0].name].feature];
});
const expectedFeatures = patternFeatures.filter((feature, index) =>
  index === 0 || feature !== patternFeatures[index - 1]);
const features = [...generated.matchAll(/^;; feature: ([^\n]+)$/gm)].map((match) => match[1]);
assert.deepEqual(features, expectedFeatures, "source order and duplicate feature runs");
assert.ok(features.filter((feature) => feature === "definition-names").length > 1);
const uncommented = generated.split("\n").filter((line) => !/^\s*;/.test(line)).join("\n");
const captures = scanQuery(uncommented).flatMap((pattern) => pattern.captures.map(({ name }) => name));
assert.ok(captures.length > 0);
assert.ok(captures.every((name) => name === "default" || name === "roc-ts-question-mark-face" ||
  name === "roc-ts-crash-face" || /^font-lock-[a-z-]+-face$/.test(name)),
"generated captures must name faces, not callbacks");
assert.doesNotMatch(uncommented, /@roc-ts--fontify|\(\s*#[A-Za-z-]+[?!]/);
assert.match(uncommented,
  /\(inferred_associated_annotation\s+name: \(annotation_pre_colon \(identifier\) @font-lock-variable-name-face\)\)/);
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
