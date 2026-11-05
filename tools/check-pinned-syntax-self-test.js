#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const guard = require("./check-pinned-syntax");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "roc-pinned-syntax-"));
let count = 0;
function test(name, run) { run(); count++; console.log(`PASS ${name}`); }
function rejects(run, pattern) {
  assert.throws(run, (error) => error instanceof guard.InfrastructureError && pattern.test(error.message));
}
const source = Buffer.from("x = 1\n");
const input = path.join(directory, "case.roc");
const clean = { status: 0, signal: null, stdout: `0:0 - 1:0   file \n0:0 - 0:5     value_declaration \n${input}\tParse: 0.1 ms 60 bytes/ms\n`, stderr: "" };
const analyze = (result) => guard.analyze(result, source, input);
try {
  test("pin-integrity", () => {
    const original = guard.loadPin();
    for (const name of ["source.json", "LICENSE", "all_syntax_test.roc"]) fs.copyFileSync(path.join(guard.directory, name), path.join(directory, name));
    assert.equal(guard.loadPin(directory).pin.sha256, original.pin.sha256);
    const fixturePath = path.join(directory, "all_syntax_test.roc");
    const changed = Buffer.from(original.source); changed[0] ^= 1;
    fs.writeFileSync(fixturePath, changed);
    rejects(() => guard.loadPin(directory), /checksum/);
    fs.writeFileSync(fixturePath, original.source);
    fs.appendFileSync(path.join(directory, "LICENSE"), "corrupt");
    rejects(() => guard.loadPin(directory), /license checksum/);
    fs.copyFileSync(path.join(guard.directory, "LICENSE"), path.join(directory, "LICENSE"));
    const alteredPin = { ...original.pin, commit: original.pin.commit.slice(0, -1) + "3" };
    alteredPin.sourceUrl = alteredPin.sourceUrl.replace(original.pin.commit, alteredPin.commit);
    alteredPin.licenseUrl = alteredPin.licenseUrl.replace(original.pin.commit, alteredPin.commit);
    fs.writeFileSync(path.join(directory, "source.json"), JSON.stringify(alteredPin));
    rejects(() => guard.loadPin(directory), /metadata/);
    fs.copyFileSync(path.join(guard.directory, "source.json"), path.join(directory, "source.json"));
    fs.appendFileSync(path.join(directory, "all_syntax_test.roc"), "\n");
    rejects(() => guard.loadPin(directory), /checksum/);
    fs.unlinkSync(path.join(directory, "all_syntax_test.roc"));
    rejects(() => guard.loadPin(directory), /cannot load pinned input/);
    fs.unlinkSync(path.join(directory, "source.json"));
    rejects(() => guard.loadPin(directory), /cannot load pinned input/);
    fs.writeFileSync(path.join(directory, "source.json"), "{}");
    rejects(() => guard.loadPin(directory), /metadata/);
  });
  test("full-file-invocation", () => {
    guard.invoke(input, (executable, args, options) => {
      assert.equal(executable, guard.cli);
      assert.deepEqual(args, ["parse", "--cst", "--rebuild", "--time", input]);
      assert.equal(options.cwd, guard.root);
      assert.equal(options.env.NO_COLOR, "1");
      assert.equal(options.timeout, 60000);
      assert.equal(options.maxBuffer, 16 * 1024 * 1024);
      return clean;
    });
    assert.deepEqual(analyze(clean).findings, []);
  });
  test("runner-failures", () => {
    for (const code of ["ENOENT", "ETIMEDOUT", "ENOBUFS"]) rejects(() => analyze({ ...clean, error: Object.assign(new Error(code), { code }) }), new RegExp(code));
    rejects(() => analyze({ ...clean, signal: "SIGTERM" }), /signal SIGTERM/);
    rejects(() => analyze({ ...clean, status: 7 }), /unexpected process status/);
    rejects(() => analyze({ ...clean, status: 1 }), /status contradicts/);
    for (const stdout of ["", "0:0 - 0:5   file\n", "garbage", `${clean.stdout}\x1b[0m`, `${clean.stdout}0:0 - 1:0   file\n`]) {
      rejects(() => analyze({ ...clean, stdout }), /incomplete|uninterpretable|ANSI|multiple tree|after summary/);
    }
  });
  test("range-and-label-integrity", () => {
    rejects(() => analyze({ ...clean, stdout: clean.stdout.replace("0:5     ", "0:99    ") }), /invalid node range/);
    rejects(() => analyze({ ...clean, stdout: clean.stdout.replace("value_declaration", "ERROR") }), /unmarked ERROR/);
    const nested = clean.stdout.replace("value_declaration \n", "value_declaration \n0:4 - 1:0       identifier `x`\n");
    rejects(() => analyze({ ...clean, stdout: nested }), /child outside parent/);
    rejects(() => analyze({ ...clean, stdout: clean.stdout.replace("     value", "      value") }), /indentation/);
  });
  test("controlled-clean-multiline-leaf", () => {
    const bytes = Buffer.from("ab\ncd\n");
    const result = { ...clean, stdout: `0:0 - 2:0   file\n0:0 - 1:2     doc_comment \n0:0 - 0:3       \`ab\\n\`\n1:0 - 1:2       \`cd\`\n${input}\tParse: 0.1 ms 60 bytes/ms\n` };
    assert.deepEqual(guard.analyze(result, bytes, input).findings, []);
    rejects(() => guard.analyze({ ...result, stdout: result.stdout.replace("`cd`", "`wrong`") }, bytes, input), /leaf continuation/);
    rejects(() => guard.analyze({ ...result, stdout: result.stdout.replace("1:0 - 1:2       `cd`\n", "") }, bytes, input), /incomplete leaf/);
    for (const row of [
      "2:0 - 2:2       `cd`",
      "1:0 - 2:2       `cd`",
      "1:0 - 1:2      `cd`",
      "1:0 - 1:2        `cd`",
    ]) rejects(() => guard.analyze({ ...result, stdout: result.stdout.replace("1:0 - 1:2       `cd`", row) }, bytes, input), /invalid leaf continuation/);
    const errorBytes = Buffer.from("ab\ncd\n!\n");
    const errorTree = { ...clean, status: 1, stdout: `0:0 - 3:0   •file\n0:0 - 1:2      doc_comment \n0:0 - 0:3       \`ab\\n\`\n1:0 - 1:2       \`cd\`\n2:0 - 2:1     •ERROR \`!\`\n${input}\tParse: 0.1 ms 60 bytes/ms\t(ERROR [2, 0] - [2, 1])\n` };
    assert.deepEqual(guard.analyze(errorTree, errorBytes, input).findings.map((f) => f.kind), ["ERROR"]);
    rejects(() => guard.analyze({ ...errorTree, stdout: errorTree.stdout.replace("1:0 - 1:2       `cd`", "1:0 - 1:2        `cd`") }, errorBytes, input), /invalid leaf continuation/);
  });
  test("uncertain-recovery-and-contradictions", () => {
    const result = { ...clean, status: 1, stdout: `0:0 - 1:0   •file\n0:0 - 0:5     •value_declaration\n\n${input}\tParse: 0.1 ms 60 bytes/ms\t(ERROR [0, 0] - [0, 5])\n` };
    assert.equal(analyze(result).findings[0].kind, "error-marked node without visible recovery");
    rejects(() => analyze({ ...result, status: 0 }), /status contradicts/);
    rejects(() => analyze({ ...result, stdout: result.stdout.replace("•file", "file") }), /root error marking/);
    rejects(() => analyze({ ...result, stdout: result.stdout.split("\n\n")[0] }), /summary/);
  });
  const cases = [
    ["clean", 'x = "ERROR MISSING"\ny = 2\n', []],
    ["separate-doc-comments", "## first\n## second\nx = 1\n", []],
    ["error-followed-by-clean", "x = 1 $$$\ny = 2\n", ["ERROR"]],
    ["multiline-error", 'x = "a\nb"\n', ["ERROR"]],
    ["triple-quote-error", 'x = """\nline one\n"""\n', ["ERROR"]],
    ["error", "before = 1\nbroken = a |>\nafter = 2\n", ["ERROR"]],
    ["multiple-missing", "x = (+\ny = 2\nz = (+\n", ["MISSING", "MISSING"]],
    ["eof-missing", "x = (+", ["MISSING"]],
    ["named-missing", "y =\n", ["zero-width error-marked node"]],
  ];
  for (const [name, text, expected] of cases) test(`actual-cli-${name}`, () => {
    const file = path.join(directory, `${name}.roc`);
    fs.writeFileSync(file, text);
    const bytes = Buffer.from(text);
    const result = guard.invoke(file);
    if (name === "named-missing") {
      assert.equal(result.status, 0);
      assert.match(result.stdout, /•identifier/);
      rejects(() => guard.analyze(result, bytes, file), /status contradicts tree recovery/);
      result.status = 1;
      result.stdout = result.stdout.slice(0, result.stdout.indexOf(`${file}\tParse:`)) + `${file}\tParse: 0.1 ms 60 bytes/ms\t(MISSING identifier [0, 3] - [0, 3])\n`;
    }
    const analysis = guard.analyze(result, bytes, file);
    assert.deepEqual(analysis.findings.map((f) => f.kind), expected);
    const report = guard.report(analysis, bytes, name);
    assert.match(report, /zero-based rows and byte columns/);
    for (const finding of analysis.findings) {
      assert.ok(report.includes(JSON.stringify(text.split("\n")[finding.start[0]])));
      assert.ok(report.includes(`[${finding.start.join(":")} - ${finding.end.join(":")}]`));
    }
    if (name === "multiple-missing") {
      assert.deepEqual(analysis.findings.map((f) => f.start), [[0, 6], [2, 6]]);
      const xml = spawnSync(guard.cli, ["parse", "--xml", "--rebuild", file], { cwd: guard.root, encoding: "utf8", ...guard.limits, env: { ...process.env, NO_COLOR: "1" } });
      assert.equal(xml.status, 1);
      assert.match(xml.stdout, /MISSING/);
      assert.doesNotMatch(xml.stdout.slice(0, xml.stdout.indexOf("</file>")), /<MISSING/);
    }
    if (name === "eof-missing") assert.deepEqual(analysis.findings[0].start, [0, 6]);
    if (name === "named-missing") assert.equal(analysis.findings[0].node, "identifier");
  });
  test("ci-propagation", () => {
    const scripts = require("../package.json").scripts;
    assert.ok(scripts.ci.startsWith("npm run pinned-syntax:self-test && "));
    assert.ok(scripts.ci.endsWith(" && npm run pinned-syntax:check"));
    const previous = "npm run ts:generate-check && npm run ts:metrics-check && npm run ts:test && npm run queries:check && node tools/check-expr-body-captures.js --self-test && node tools/check-shared-highlight-parity.js && node tools/check-operator-trees.js --self-test && npm run outline:check";
    assert.equal(scripts.ci, `npm run pinned-syntax:self-test && ${previous} && npm run pinned-syntax:check`);
    assert.equal(scripts["pinned-syntax:check"], "node tools/check-pinned-syntax.js");
    const check = path.join(guard.root, "tools/check-pinned-syntax.js");
    const usage = spawnSync(process.execPath, [check, "--unknown"], { encoding: "utf8" });
    assert.equal(usage.status, 2); assert.match(usage.stderr, /Usage:/);
    const pin = guard.loadPin().pin;
    for (const [text, status, label] of [["x = 1\n", 0, "ACCEPTED"], ["x = (+", 1, "SYNTAX DISCREPANCY"]]) {
      fs.writeFileSync(input, text);
      const child = spawnSync(process.execPath, ["-e", `const g = require(process.argv[1]); const fs = require('node:fs'); const input = process.argv[2]; process.exitCode = g.run([], {loadPin: () => ({pin: JSON.parse(process.argv[3]), input, source: fs.readFileSync(input)})});`, check, input, JSON.stringify(pin)], { encoding: "utf8", timeout: guard.limits.timeout });
      assert.equal(child.status, status, child.stderr);
      assert.match(child.stdout, new RegExp(label));
      if (status === 1) { assert.match(child.stdout, /MISSING.*0:6/); assert.match(child.stdout, /Raw CLI diagnostics/); }
    }
    const badPin = path.join(directory, "bad-pin");
    fs.mkdirSync(badPin);
    fs.writeFileSync(path.join(badPin, "source.json"), "{}");
    const integrity = spawnSync(process.execPath, ["-e", `const g = require(process.argv[1]); process.exitCode = g.run([], {loadPin: () => g.loadPin(process.argv[2])});`, check, badPin], { encoding: "utf8" });
    assert.equal(integrity.status, 2); assert.match(integrity.stderr, /invalid provenance metadata/);
  });
  test("read-only-verification", () => {
    const names = ["source.json", "LICENSE", "all_syntax_test.roc"];
    const before = names.map((name) => guard.hash(fs.readFileSync(path.join(guard.directory, name))));
    const entries = fs.readdirSync(guard.directory).sort();
    const pinned = guard.loadPin();
    const cliResult = guard.invoke(pinned.input);
    assert.ok([0, 1].includes(cliResult.status) && cliResult.stdout.includes(`${pinned.input}\tParse:`));
    assert.deepEqual(analyze(clean).findings, []);
    rejects(() => analyze({ ...clean, status: 1 }), /status contradicts/);
    assert.deepEqual(fs.readdirSync(guard.directory).sort(), entries);
    assert.deepEqual(names.map((name) => guard.hash(fs.readFileSync(path.join(guard.directory, name)))), before);
  });
  console.log(`Pinned syntax self-tests passed (${count} groups).`);
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
