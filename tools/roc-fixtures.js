#!/usr/bin/env node
"use strict";

// Fixtures copied unchanged from the Roc compiler repository at the commit a
// Roc nightly release was built from. `source.json` records that nightly, the
// commit, and the size and SHA-256 of every copied file. Checks read the
// fixtures offline; `just fixture-builtin` is the only step that downloads.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const directory = path.join(root, "test/fixtures/roc-compiler");
const repository = "https://github.com/roc-lang/roc";
const nightlies = "roc-lang/nightlies";
const license = "UPL-1.0";
const attribution = "Copyright © 2019 Richard Feldman and subsequent Roc authors <roc-lang.org/authors>";
// Fixture name in `directory` -> path in the Roc repository.
const files = {
  "Builtin.roc": "src/build/roc/Builtin.roc",
  "all_syntax_test.roc": "test/echo/all_syntax_test.roc",
  LICENSE: "LICENSE",
};

class FixtureError extends Error {}
const fail = (message) => { throw new FixtureError(message); };
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const rawUrl = (commit, upstreamPath) =>
  `https://raw.githubusercontent.com/roc-lang/roc/${commit}/${upstreamPath}`;
const releaseUrl = (release) => `https://github.com/${nightlies}/releases/tag/${release}`;
const releasePattern = /^nightly-(\d{4}-\d{2}-\d{2})-([0-9a-f]{7,40})(-safe)?$/;

function describe(release, releaseId, commit, contents) {
  return {
    repository, commit, release, releaseId, releaseUrl: releaseUrl(release), license, attribution,
    files: Object.fromEntries(Object.entries(files).map(([name, upstreamPath]) => [name, {
      upstreamPath, url: rawUrl(commit, upstreamPath),
      bytes: contents[name].length, sha256: hash(contents[name]),
    }])),
  };
}

function checkPin(pin) {
  const match = releasePattern.exec(pin?.release ?? "");
  const valid = match && pin.repository === repository && /^[0-9a-f]{40}$/.test(pin.commit) &&
    pin.commit.startsWith(match[2]) && Number.isSafeInteger(pin.releaseId) && pin.releaseId > 0 &&
    pin.releaseUrl === releaseUrl(pin.release) && pin.license === license &&
    pin.attribution === attribution && pin.files && typeof pin.files === "object" &&
    JSON.stringify(Object.keys(pin.files).sort()) === JSON.stringify(Object.keys(files).sort()) &&
    Object.entries(files).every(([name, upstreamPath]) => {
      const file = pin.files[name];
      return file.upstreamPath === upstreamPath && file.url === rawUrl(pin.commit, upstreamPath) &&
        Number.isSafeInteger(file.bytes) && file.bytes > 0 && /^[0-9a-f]{64}$/.test(file.sha256);
    });
  if (!valid) fail("invalid provenance metadata in source.json");
}

// Read source.json and every fixture, rejecting any file whose bytes differ
// from the recorded size and SHA-256.
function load(dir = directory) {
  let pin;
  try {
    pin = JSON.parse(fs.readFileSync(path.join(dir, "source.json"), "utf8"));
  } catch (error) {
    fail(`cannot load Roc fixtures: ${error.message}`);
  }
  checkPin(pin);
  const contents = {};
  for (const [name, { bytes, sha256 }] of Object.entries(pin.files)) {
    try {
      contents[name] = fs.readFileSync(path.join(dir, name));
    } catch (error) {
      fail(`cannot load Roc fixtures: ${error.message}`);
    }
    if (contents[name].length !== bytes || hash(contents[name]) !== sha256) {
      fail(`${name} checksum/size mismatch with source.json`);
    }
  }
  return { pin, contents, path: (name) => path.join(dir, name) };
}

async function fetchOk(url, accept) {
  const headers = { "User-Agent": "tree-sitter-roc-fixtures" };
  if (accept) headers.Accept = accept;
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) fail(`${url}: HTTP ${response.status}`);
  return response;
}

// Resolve a nightly tag, or "latest", to its release and full Roc commit.
async function resolveNightly(requested) {
  const api = "https://api.github.com/repos";
  const json = "application/vnd.github+json";
  const release = await (await fetchOk(requested === "latest"
    ? `${api}/${nightlies}/releases/latest`
    : `${api}/${nightlies}/releases/tags/${encodeURIComponent(requested)}`, json)).json();
  const match = releasePattern.exec(release.tag_name);
  if (!match) fail(`${release.tag_name} is not a nightly-YYYY-MM-DD-<commit> tag`);
  const commit = (await (await fetchOk(`${api}/roc-lang/roc/commits/${match[2]}`, json)).json()).sha;
  if (!/^[0-9a-f]{40}$/.test(commit) || !commit.startsWith(match[2])) {
    fail(`cannot resolve Roc commit ${match[2]} for ${release.tag_name}`);
  }
  return { release: release.tag_name, releaseId: release.id, commit };
}

// Download every fixture at the nightly's commit, then replace the directory
// contents. Nothing is written unless every download succeeds.
async function update(requested, dir = directory) {
  const { release, releaseId, commit } = await resolveNightly(requested);
  const contents = {};
  for (const [name, upstreamPath] of Object.entries(files)) {
    contents[name] = Buffer.from(await (await fetchOk(rawUrl(commit, upstreamPath))).arrayBuffer());
  }
  const pin = describe(release, releaseId, commit, contents);
  checkPin(pin);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, bytes] of Object.entries(contents)) fs.writeFileSync(path.join(dir, name), bytes);
  fs.writeFileSync(path.join(dir, "source.json"), `${JSON.stringify(pin, null, 2)}\n`);
  return pin;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith("-")) {
    console.error("Usage: node tools/roc-fixtures.js <nightly-tag | latest>");
    process.exitCode = 2;
  } else {
    update(args[0]).then((pin) => {
      console.log(`Copied ${Object.keys(pin.files).join(", ")} from ${pin.repository} ` +
        `${pin.commit} (${pin.release}) into ${path.relative(root, directory)}.`);
    }, (error) => {
      console.error(error instanceof FixtureError ? error.message : error.stack);
      process.exitCode = 1;
    });
  }
}

module.exports = { FixtureError, root, directory, files, hash, describe, checkPin, load, update };
