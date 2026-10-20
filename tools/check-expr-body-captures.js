#!/usr/bin/env node
"use strict";

// Pinned CLI capture regression for fielded expression bodies. This checks
// query ranges and scope structure, not editor rendering or name resolution.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const source = "test/fixtures/expr-body-captures.roc";
const baselinePath = path.join(__dirname, "expr-body-captures-baseline.json");
const names = ["locals", "indents", "textobjects", "rainbows", "highlights", "tags"];
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const branchScopes = [
  { name: "local.scope", from: [6, 8], to: [6, 35] },
  { name: "local.scope", from: [7, 8], to: [7, 28] },
];

function captures(name) {
  const result = spawnSync(cli, ["query", "-c", `queries/${name}.scm`, source], {
    cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${name}: ${result.stderr || result.stdout}`);
  const found = [...result.stdout.matchAll(/pattern:\s*\d+, capture:\s*\d+ - ([\w.]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `/g)]
    .map((m) => ({ name: m[1], from: [+m[2], +m[3]], to: [+m[4], +m[5]] }));
  assert.ok(found.length > 0, `${name}: no captures parsed`);
  return found;
}
function key(c) { return JSON.stringify(c); }
function multiset(items) {
  const result = new Map();
  for (const item of items) result.set(key(item), (result.get(key(item)) || 0) + 1);
  return result;
}
function sameCaptures(label, expected, actual) {
  const a = multiset(expected), b = multiset(actual);
  const lost = [...a].filter(([key, count]) => count !== b.get(key)).map(([key, count]) => [JSON.parse(key), count, b.get(key) || 0]);
  const extra = [...b].filter(([key]) => !a.has(key)).map(([key, count]) => [JSON.parse(key), 0, count]);
  assert.deepEqual({ lost, extra }, { lost: [], extra: [] }, `${label}: capture name, range, or multiplicity changed`);
}
function p(pos) { return pos[0] * 1000 + pos[1]; }
function covers(scope, capture) {
  return p(scope.from) <= p(capture.from) && p(scope.to) >= p(capture.to);
}
function exact(items, name, from, to) {
  const found = items.filter((c) => c.name === name && key(c.from) === key(from) && key(c.to) === key(to));
  assert.equal(found.length, 1, `${name} ${from}-${to}: expected exactly one capture`);
  return found[0];
}
function relationships(locals) {
  const scopes = locals.filter((c) => c.name === "local.scope");
  const defs = locals.filter((c) => c.name === "local.definition.variable.parameter");
  const refs = locals.filter((c) => c.name === "local.reference");
  const outer = exact(scopes, "local.scope", [2, 8], [9, 1]);
  const shadow = exact(scopes, "local.scope", [3, 12], [3, 17]);
  const sibling = exact(scopes, "local.scope", [4, 10], [4, 19]);
  const first = exact(scopes, "local.scope", [6, 8], [6, 35]);
  const second = exact(scopes, "local.scope", [7, 8], [7, 28]);
  const nested = exact(scopes, "local.scope", [6, 21], [6, 34]);
  for (const [scope, definition, reference] of [
    [outer, [2, 9], [4, 14]], [shadow, [3, 13], [3, 16]],
    [sibling, [4, 11], [4, 18]], [nested, [6, 22], [6, 33]],
  ]) {
    assert.ok(covers(scope, exact(defs, "local.definition.variable.parameter", definition, [definition[0], definition[1] + 1])));
    assert.ok(covers(scope, exact(refs, "local.reference", reference, [reference[0], reference[1] + 1])));
  }
  assert.ok(covers(outer, shadow) && covers(outer, sibling) && covers(first, nested));
  assert.ok(!covers(shadow, exact(refs, "local.reference", [4, 14], [4, 15])), "shadow scope leaked into sibling lambda");
  assert.ok(!covers(first, exact(refs, "local.reference", [7, 22], [7, 27])), "first branch leaked into second");
  assert.ok(!covers(second, exact(refs, "local.reference", [6, 25], [6, 30])), "second branch leaked into first");
  assert.ok(!covers(second, nested) && !covers(first, second), "sibling branches overlap");
  // Pattern identifiers are references under the present query, not definitions.
  // Branch scopes must nevertheless contain their own pattern and result only.
  exact(refs, "local.reference", [6, 11], [6, 16]);
  exact(refs, "local.reference", [7, 12], [7, 17]);
  assert.ok(covers(first, exact(refs, "local.reference", [6, 11], [6, 16])));
  assert.ok(covers(second, exact(refs, "local.reference", [7, 22], [7, 27])));
}
function selfTest() {
  const example = [{ name: "indent", from: [1, 0], to: [1, 2] }];
  for (const [label, changed] of [
    ["removed capture", []],
    ["extra capture", [...example, { name: "indent", from: [2, 0], to: [2, 1] }]],
    ["duplicate capture", [...example, ...example]],
    ["different range", [{ name: "indent", from: [0, 0], to: [1, 2] }]],
    ["different name", [{ name: "scope", from: [1, 0], to: [1, 2] }]],
  ]) assert.throws(() => sameCaptures(label, example, changed), /capture name, range, or multiplicity changed/);
  sameCaptures("ordering", example, [...example]);
  assert.ok(!covers(example[0], { from: [0, 0], to: [1, 2] }));
  const actual = { name: "local.scope", from: [1, 0], to: [1, 3] };
  const siblingReference = { name: "local.reference", from: [2, 0], to: [2, 1] };
  assert.ok(!covers(actual, siblingReference));
  const leaking = { ...actual, to: [2, 2] };
  assert.throws(() => assert.ok(!covers(leaking, siblingReference), "branch scope leaked"), /branch scope leaked/);
  console.log("Capture checker self-test passed (removed, extra, duplicate, range, name, and scope leakage).");
}
if (process.argv.includes("--self-test")) selfTest();
const current = Object.fromEntries(names.map((name) => [name, captures(name)]));
for (const name of names) {
  // Branch isolation is a deliberate new local scope relationship. All other
  // captures, including retained wrappers and duplicate ranges, must be exact.
  sameCaptures(name, name === "locals" ? [...baseline[name], ...branchScopes] : baseline[name], current[name]);
  console.log(`${name}: ${current[name].length} exact captures verified`);
}
relationships(current.locals);
for (const [name, from, to] of [
  ["local.scope", [21, 17], [21, 18]], ["local.scope", [22, 15], [22, 16]],
  ["rainbow.scope", [21, 17], [21, 18]], ["rainbow.scope", [22, 15], [22, 16]],
  ["indent", [21, 17], [21, 18]], ["indent", [22, 15], [22, 16]],
]) exact(current[name.startsWith("rainbow") ? "rainbows" : name === "indent" ? "indents" : "locals"], name, from, to);
console.log("Nested scopes, branch isolation, and retained wrappers verified; no editor rendering tested.");
