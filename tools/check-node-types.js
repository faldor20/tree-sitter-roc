#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const nodeTypesPath = path.join(__dirname, "..", "src", "node-types.json");
const nodeTypes = JSON.parse(fs.readFileSync(nodeTypesPath, "utf8"));
if (!Array.isArray(nodeTypes)) {
  console.error("src/node-types.json must be a top-level array of node types.");
  process.exitCode = 1;
}
