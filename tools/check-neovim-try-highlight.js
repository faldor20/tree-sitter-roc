#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const mapping = require(path.join(root, "query-maps/neovim.json"));
const highlights = fs.readFileSync(
  path.join(root, "queries-generated/neovim/queries/highlights.scm"),
  "utf8",
);

assert.equal(mapping.highlights["keyword.control.return"], "keyword.return");
assert.match(highlights, /^\[\(try_operator\) "return"\] @keyword\.return$/m);
assert.equal((highlights.match(/\(try_operator\)/g) || []).length, 1);
console.log("Neovim try operator uses @keyword.return");
