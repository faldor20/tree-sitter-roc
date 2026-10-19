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
assert.match(highlights, /\[\s*\(try_operator\)\s*"return"\s*\]\s*@keyword\.return\b/);
console.log("Neovim try operator uses @keyword.return");
