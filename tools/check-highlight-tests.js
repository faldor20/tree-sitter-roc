#!/usr/bin/env node
"use strict";

// The pinned Tree-sitter CLI can exit successfully before reaching later
// highlight fixtures when it encounters a malformed assertion caret.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const fixtures = fs.readdirSync(path.join(root, "test/highlight"))
  .filter((name) => name.endsWith(".roc") && fs.statSync(path.join(root, "test/highlight", name)).isFile())
  .sort();
const cli = path.join(root, "node_modules/.bin/tree-sitter");

function verify(output, expected) {
  assert.ok(expected.length > 0, "no highlight fixtures found");
  const plain = output.replace(/\x1b\[[0-9;]*m/g, "");
  const sections = plain.split(/^syntax highlighting:\s*$/m);
  assert.equal(sections.length, 2, "expected exactly one syntax highlighting section");
  const seen = new Set();
  for (const line of sections[1].split(/\r?\n/).filter((line) => line.trim())) {
    const match = line.match(/^\s*✓\s+(\S+\.roc)\s+\(([1-9]\d*) assertions?\)\s*$/);
    assert.ok(match, `unexpected highlight result: ${line}`);
    assert.ok(!seen.has(match[1]), `duplicate highlight fixture: ${match[1]}`);
    seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), expected, "highlight fixtures not all run");
}

function selfTest() {
  const line = (name) => `    ✓ ${name} (1 assertion)`;
  const complete = `syntax highlighting:\n${fixtures.map(line).join("\n")}\n`;
  verify(complete, fixtures);
  verify(`syntax highlighting:\n${fixtures.map((name) => `    ✓ \x1b[32m${name}\x1b[0m (1 assertion)`).join("\n")}\n`, fixtures);
  assert.throws(() => verify(complete.replace(`${line(fixtures[fixtures.length - 1])}\n`, ""), fixtures), /not all run/);
  assert.throws(() => verify(complete + line(fixtures[0]) + "\n", fixtures), /duplicate highlight fixture/);
  assert.throws(() => verify(complete + line("unexpected.roc") + "\n", fixtures), /not all run/);
  assert.throws(() => verify("syntax highlighting:\n", fixtures), /not all run/);
  assert.throws(() => verify(complete.slice(0, -5), fixtures), /unexpected highlight result/);
  console.log("Highlight completion guard self-test passed (missing, duplicate, unexpected, truncated output).");
}

try {
  if (process.argv.includes("--self-test")) selfTest();
  const result = spawnSync(cli, ["test"], {
    cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 0, `tree-sitter test exited ${result.status}`);
  verify(result.stdout, fixtures);
  console.log(`Highlight completion: all ${fixtures.length} fixtures ran.`);
} catch (error) {
  console.error(`Highlight completion failed: ${error.message}`);
  process.exitCode = 1;
}
