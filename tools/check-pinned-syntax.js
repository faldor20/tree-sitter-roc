#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const fixtures = require("./roc-fixtures");
const { root, directory, hash } = fixtures;
const cli = path.join(root, "node_modules/.bin/tree-sitter");
const limits = { timeout: 60000, maxBuffer: 16 * 1024 * 1024 };
class InfrastructureError extends Error {}
const fail = (message) => { throw new InfrastructureError(message); };

function loadPin(dir = directory) {
  try {
    const { pin, contents, path: fixturePath } = fixtures.load(dir);
    const name = "all_syntax_test.roc";
    return { pin: { ...pin, sha256: pin.files[name].sha256 }, input: fixturePath(name), source: contents[name] };
  } catch (error) {
    if (error instanceof fixtures.FixtureError) fail(error.message);
    throw error;
  }
}

function invoke(input, runner = spawnSync) {
  return runner(cli, ["parse", "--cst", "--rebuild", "--time", input], {
    cwd: root, encoding: "utf8", ...limits, env: { ...process.env, NO_COLOR: "1" },
  });
}

function analyze(result, source, input) {
  const raw = `status=${result.status}; signal=${result.signal || "none"}\nstderr:\n${result.stderr || ""}\nstdout:\n${result.stdout || ""}`;
  const bad = (message) => fail(`${message}\n${raw}`);
  if (result.error) bad(`process failure (${result.error.code || result.error.message})`);
  if (result.signal) bad(`process signal ${result.signal}`);
  if (![0, 1].includes(result.status)) bad("unexpected process status");
  if (typeof result.stdout !== "string" || typeof result.stderr !== "string" || /\x1b/.test(result.stdout + result.stderr)) bad("unusable output/ANSI escape");
  const lines = source.toString("utf8").split("\n");
  const eof = [lines.length - 1, Buffer.byteLength(lines.at(-1))];
  const nodes = [], stack = [];
  let summary = false, recoverySummary = false;
  const point = (row, col) => row >= 0 && row < lines.length && col >= 0 && col <= Buffer.byteLength(lines[row]);
  const offset = ([r, c]) => lines.slice(0, r).reduce((n, s) => n + Buffer.byteLength(s) + 1, 0) + c;
  const escapeText = (text) => text.replace(/[\n\r\t\0\\\v\f]/g, (c) => ({ "\n": "\\n", "\r": "\\r", "\t": "\\t", "\0": "\\0", "\\": "\\\\", "\v": "\\v", "\f": "\\f" })[c]);
  let baseColumn;
  const finishLeaf = () => {
    const previous = nodes.at(-1);
    if (previous?.continuations && previous.continuations.length !== previous.expectedText.length) bad("incomplete leaf continuation");
  };
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith(`${input}\tParse:`)) {
      if (summary || !/^.*\tParse:\s+[\d.]+ ms\s+[\d.]+ bytes\/ms(?:\s+\(.*\))?$/.test(line)) bad("invalid parse summary");
      summary = true;
      recoverySummary = /\((?:ERROR|MISSING)\b/.test(line);
      continue;
    }
    if (summary) bad("tree content after summary");
    const m = /^(\d+):(\d+)\s+- (\d+):(\d+)( +)(.*)$/.exec(line);
    if (!m) bad("uninterpretable CST line");
    const [, sr, sc, er, ec, spaces, text] = m;
    // CLI 0.25.10 write_node_text prints multiline leaf text on separate rows.
    // Its displayed columns are not node positions; validate text using the node's range.
    if (text.startsWith("`")) {
      const previous = nodes.at(-1);
      if (!previous?.named || previous.leaf || previous.children.length || previous.start[0] === previous.end[0]) bad("invalid leaf continuation");
      if (!previous.continuations) {
        previous.continuations = [];
        previous.expectedText = source.subarray(offset(previous.start), offset(previous.end)).toString("utf8").match(/[^\n]*\n|[^\n]+$/g).map(escapeText);
      }
      const index = previous.continuations.length;
      if (text !== `\`${previous.expectedText[index]}\`` || +sr !== previous.start[0] + index || +er !== +sr || line.length - text.length !== previous.depth + 2) bad("invalid leaf continuation");
      previous.continuations.push(text);
      continue;
    }
    finishLeaf();
    const label = /^(?:(\w+): )?(•)?(\w+)(?:\s+`.*`)?\s*$/.exec(text);
    const missing = /^MISSING: (.+)$/.exec(text);
    const anonymous = /^".*"$/.test(text);
    if (!label && !missing && !anonymous) bad("unknown CST node label");
    const marked = !!label?.[2];
    // cst_render_node adds one display space to error-free nodes in an error tree.
    // Missing anonymous nodes have has_error(), although they have no bullet.
    const column = line.length - text.length;
    if (baseColumn === undefined) baseColumn = column;
    const displayPadding = (column - baseColumn) % 2;
    if (displayPadding && (!nodes[0]?.marked || marked || missing)) bad("invalid CST indentation");
    const depth = column - displayPadding;
    if (depth < baseColumn) bad("invalid CST indentation");
    const node = { start: [+sr, +sc], end: [+er, +ec], depth,
      marked, name: missing ? missing[1] : label?.[3] || text, named: !!label,
      leaf: !!label && text.includes("`"), children: [], missing: !!missing };
    if (node.name === "ERROR" && !node.marked) bad("unmarked ERROR node");
    if (!point(...node.start) || !point(...node.end) || node.start[0] > node.end[0] || (node.start[0] === node.end[0] && node.start[1] > node.end[1])) bad("invalid node range");
    while (stack.length && stack.at(-1).depth >= node.depth) stack.pop();
    if (nodes.length && !stack.length) bad("multiple tree roots");
    if (stack.length) {
      const parent = stack.at(-1);
      if (parent.continuations || parent.leaf || node.depth !== parent.depth + 2) bad("invalid CST parent indentation/leaf");
      if (offset(node.start) < offset(parent.start) || offset(node.end) > offset(parent.end)) bad("child outside parent range");
      parent.children.push(node);
    }
    nodes.push(node); stack.push(node);
  }
  finishLeaf();
  const tree = nodes[0];
  if (!tree || tree.name !== "file" || tree.start.join() !== "0,0" || tree.end.join() !== eof.join()) bad("incomplete full-file tree");
  const findings = [];
  function visit(node) {
    const before = findings.length;
    node.children.forEach(visit);
    let kind;
    if (node.missing) kind = "MISSING";
    else if (node.name === "ERROR" && node.marked) kind = "ERROR";
    else if (node.marked && before === findings.length && node.start.join() === node.end.join()) kind = "zero-width error-marked node";
    else if (node.marked && before === findings.length) kind = "error-marked node without visible recovery";
    if (kind) findings.push({ kind, node: node.name, start: node.start, end: node.end });
  }
  visit(tree);
  if (tree.marked !== (findings.length > 0)) bad("root error marking contradicts recovery findings");
  if ((result.status === 1) !== (findings.length > 0)) bad("process status contradicts tree recovery");
  if (!summary || (findings.length > 0) !== recoverySummary) bad("missing or contradictory recovery summary");
  return { findings, outputBytes: Buffer.byteLength(result.stdout), raw };
}

function report(analysis, source, identity) {
  const lines = source.toString("utf8").split("\n");
  return [`${analysis.findings.length ? "SYNTAX DISCREPANCY" : "ACCEPTED"}: ${identity}`,
    "Coordinates: zero-based rows and byte columns; zero-width ranges are insertion points.",
    ...analysis.findings.map((f) => `${f.kind} ${f.node} [${f.start.join(":")} - ${f.end.join(":")}]\n  ${JSON.stringify(lines[f.start[0]])}`),
    `Input: ${source.length} bytes; CST: ${analysis.outputBytes} bytes; timeout: ${limits.timeout} ms; output bound: ${limits.maxBuffer} bytes.`,
    ...(analysis.findings.length ? [`Raw CLI diagnostics:\n${analysis.raw}`] : []),
  ].join("\n");
}

function main(args = process.argv.slice(2), dependencies = {}) {
  if (args.length) fail("Usage: node tools/check-pinned-syntax.js");
  const { pin, input, source } = (dependencies.loadPin || loadPin)();
  const analysis = analyze((dependencies.invoke || invoke)(input), source, input);
  (dependencies.log || console.log)(report(analysis, source, `${path.relative(root, input)}; ${pin.release}; ${pin.commit}; SHA-256 ${pin.sha256}`));
  return analysis.findings.length ? 1 : 0;
}
function run(args, dependencies = {}) {
  try { return main(args, dependencies); }
  catch (error) { (dependencies.error || console.error)(`INPUT/INFRASTRUCTURE FAILURE: ${error.stack}`); return 2; }
}
if (require.main === module) process.exitCode = run(process.argv.slice(2));
module.exports = { InfrastructureError, root, cli, directory, limits, loadPin, invoke, analyze, report, hash, main, run };
