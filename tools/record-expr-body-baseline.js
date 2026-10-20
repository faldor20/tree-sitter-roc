#!/usr/bin/env node
"use strict";
// Run only against the approved parent checkout; write its query captures once.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(process.argv[2] || "");
const output = path.resolve(process.argv[3] || "");
assert.equal(spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  "10d42dc772f5ba8e868307caae7f73724becaa4b", "baseline must use approved parent");
assert.ok(!fs.existsSync(output), "refusing to overwrite baseline");
const names = ["locals", "indents", "textobjects", "rainbows", "highlights", "tags"];
const captures = {};
for (const name of names) {
  const result = spawnSync(path.join(root, "node_modules/.bin/tree-sitter"),
    ["query", "-c", `queries/${name}.scm`, "test/fixtures/expr-body-captures.roc"],
    { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, `${name}: ${result.stderr || result.stdout}`);
  captures[name] = [...result.stdout.matchAll(/pattern:\s*\d+, capture:\s*\d+ - ([\w.]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `/g)]
    .map((m) => ({ name: m[1], from: [+m[2], +m[3]], to: [+m[4], +m[5]] }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.ok(captures[name].length, `${name}: no captures`);
}
fs.writeFileSync(output, JSON.stringify(captures, null, 2) + "\n", { flag: "wx" });
console.log(`Recorded approved parent: ${names.map((n) => `${n}=${captures[n].length}`).join(" ")}`);
