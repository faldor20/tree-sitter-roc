#!/usr/bin/env node
"use strict";

/**
 * Guards the generated parser against accidental grammar-state explosions.
 * Override limits through the documented environment variables when testing
 * the failure path or deliberately evaluating a new parser budget.
 */

const fs = require("fs");
const path = require("path");

const parserPath = path.join(__dirname, "..", "src", "parser.c");
const source = fs.readFileSync(parserPath, "utf8");

const limits = {
  states: readLimit("ROC_MAX_PARSER_STATES", 3139),
  largeStates: readLimit("ROC_MAX_LARGE_STATES", 877),
  bytes: readLimit("ROC_MAX_PARSER_BYTES", 5158866),
};

const metrics = {
  states: readDefine("STATE_COUNT"),
  largeStates: readDefine("LARGE_STATE_COUNT"),
  bytes: fs.statSync(parserPath).size,
};

console.log(
  `Parser metrics: ${metrics.states} states, ${metrics.largeStates} large states, ${metrics.bytes} bytes`,
);

const failures = Object.entries(metrics).filter(([name, value]) => value > limits[name]);
if (failures.length > 0) {
  for (const [name, value] of failures) {
    console.error(`Parser ${name} ${value} exceeds the limit ${limits[name]}.`);
  }
  console.error(
    "If the growth is intentional, review the grammar conflicts and update the committed metric limits.",
  );
  process.exitCode = 1;
}

function readDefine(name) {
  const match = source.match(new RegExp(`^#define ${name} (\\d+)$`, "m"));
  if (!match) {
    throw new Error(`Could not find ${name} in ${parserPath}`);
  }
  return Number(match[1]);
}

function readLimit(environmentName, fallback) {
  const rawValue = process.env[environmentName];
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${environmentName} must be a non-negative integer`);
  }
  return value;
}
