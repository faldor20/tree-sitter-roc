#!/usr/bin/env node
"use strict";

// This script generates editor-specific tree-sitter query files by mapping
// generic capture names (e.g. constant.numeric.float) to editor-specific ones.
// It scans all query folders in the repo (or user-supplied paths), applies the
// mapping from each JSON config, and writes output into per-editor folders.

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_DIR = "query-maps";
const DEFAULT_OUT_DIR = "queries-generated";
const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "build",
  "target",
  "dist",
  "queries-generated",
]);

function parseArgs(argv) {
  const args = {
    configDir: DEFAULT_CONFIG_DIR,
    outDir: DEFAULT_OUT_DIR,
    queriesDirs: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config-dir") {
      args.configDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--out-dir") {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--queries-dir") {
      args.queriesDirs.push(argv[i + 1]);
      i += 1;
      continue;
    }
  }

  return args;
}

async function listJsonConfigs(configDir) {
  const entries = await fs.promises.readdir(configDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(configDir, entry.name));
}

async function walk(dir, results = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (DEFAULT_SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function findQueriesDirs(rootDir) {
  const found = [];
  const entriesDirs = await walkDirs(rootDir);
  for (const dir of entriesDirs) {
    if (path.basename(dir) === "queries") {
      found.push(dir);
    }
  }
  return found;
}

async function walkDirs(dir, results = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (DEFAULT_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    results.push(fullPath);
    await walkDirs(fullPath, results);
  }
  return results;
}

async function listScmFiles(queriesDirs) {
  const files = [];
  for (const queriesDir of queriesDirs) {
    const entries = await walk(queriesDir);
    for (const entry of entries) {
      if (entry.endsWith(".scm")) {
        files.push(entry);
      }
    }
  }
  return files;
}

function normalizeCaptureName(value) {
  if (typeof value !== "string") {
    return "";
  }
  if (value.startsWith("@")) {
    return value;
  }
  return `@${value}`;
}

function applyMappingToContent(content, mapping) {
  const lines = content.split(/\r?\n/);
  const captureRegex = /@([A-Za-z0-9_.-]+)/g;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith(";")) {
        return line;
      }
      return line
        .replace(captureRegex, (match, name) => {
          const mapped = mapping[name];
          if (mapped === null || mapped === "" || mapped === false) {
            return "";
          }
          return normalizeCaptureName(mapped);
        })
        .trimEnd();
    })
    .join("\n");
}

function collectCaptures(content) {
  const lines = content.split(/\r?\n/);
  const captureRegex = /@([A-Za-z0-9_.-]+)/g;
  const captures = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(";")) {
      continue;
    }
    let match;
    while ((match = captureRegex.exec(line)) !== null) {
      captures.add(match[1]);
    }
  }

  return captures;
}

function assertMappingComplete(mapping, captures, contextLabel) {
  if (!mapping || typeof mapping !== "object") {
    throw new Error(`Missing mapping section for ${contextLabel}.`);
  }

  const missing = [];
  for (const name of captures) {
    if (!Object.prototype.hasOwnProperty.call(mapping, name)) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    missing.sort();
    throw new Error(`Missing mappings for ${contextLabel}: ${missing.join(", ")}`);
  }
}

// Return top-level query patterns and their capture locations. Strings and
// comments are opaque so punctuation and @ signs inside them are not syntax.
function scanQuery(content) {
  const patterns = [];
  let start = -1;
  const stack = [];
  let captures = [];
  let inString = false;
  let inComment = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (start >= 0 && stack.length === 0 && !inString && !inComment &&
        (ch === "(" || ch === "[" || ch === '"')) {
      patterns.push({ start, text: content.slice(start, i).trimEnd(), captures });
      start = -1;
      captures = [];
    }
    if (inComment) {
      if (ch === "\n") inComment = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === ";") {
      inComment = true;
    } else if (ch === '"') {
      if (start < 0) start = i;
      inString = true;
    } else if (ch === "(" || ch === "[") {
      if (start < 0) start = i;
      stack.push({ close: ch === "(" ? ")" : "]", predicate: ch === "(" &&
        /^#[A-Za-z-]+\?/.test(content.slice(i + 1)) });
    } else if (ch === ")" || ch === "]") {
      if (stack.pop()?.close !== ch) throw new Error(`Unbalanced query near offset ${i}`);
    } else if (ch === "@" && start >= 0) {
      const match = /^@([A-Za-z0-9_.-]+)/.exec(content.slice(i));
      if (match) {
        captures.push({ start: i, end: i + match[0].length, name: match[1],
          predicate: stack.at(-1)?.predicate || false });
        i += match[0].length - 1;
      }
    }
  }
  if (stack.length || inString) throw new Error("Incomplete query pattern");
  if (start >= 0) patterns.push({ start, text: content.slice(start).trimEnd(), captures });
  return patterns;
}

function sectionedContent(content, mapping, options) {
  const patterns = scanQuery(content);
  const seen = new Set(patterns.flatMap((pattern) => pattern.captures.map((capture) => capture.name)));
  assertMappingComplete(mapping, seen, "sectioned query");
  const sections = [];
  for (const pattern of patterns) {
    // Predicate capture references do not determine the feature, but still
    // need their names rewritten along with the defining capture.
    const features = new Set();
    let retained = false;
    for (const { name } of pattern.captures) {
      const value = mapping[name];
      if (value !== null && value !== false && value !== "") {
        retained = true;
        if (!value || typeof value !== "object" ||
            typeof value.capture !== "string" || typeof value.feature !== "string" ||
            !value.capture || !value.feature) {
          throw new Error(`Expected capture and feature for @${name}`);
        }
        features.add(value.feature);
      }
    }
    if (!retained) continue;
    // Inspect every operand of each predicate, not only its first capture.
    // scanQuery has already excluded quoted strings and semicolon comments.
    const predicateCaptures = pattern.captures.filter(({ predicate }) => predicate);
    if (predicateCaptures.some(({ name }) =>
      mapping[name] === "" || mapping[name] === null || mapping[name] === false)) continue;
    if (options.omitPredicates && predicateCaptures.length) continue;
    if (features.size !== 1) {
      throw new Error(`Mixed features in pattern: ${pattern.text}`);
    }
    const feature = [...features][0];
    let text = pattern.text;
    for (const capture of [...pattern.captures].reverse()) {
      const value = mapping[capture.name];
      const replacement = value === null || value === false || value === ""
        ? "" : normalizeCaptureName(value.capture);
      text = text.slice(0, capture.start - pattern.start) + replacement +
        text.slice(capture.end - pattern.start);
    }
    if (options.predicates) {
      // Rewrite only predicate tokens, never matching text in strings/comments.
      const masked = Array.from(text);
      let quoted = false;
      let commented = false;
      for (let i = 0; i < text.length; i += 1) {
        if (commented) { if (text[i] === "\n") commented = false; masked[i] = " "; }
        else if (quoted) {
          masked[i] = " ";
          if (text[i] === "\\") { i += 1; masked[i] = " "; }
          else if (text[i] === '"') quoted = false;
        } else if (text[i] === ";") { commented = true; masked[i] = " "; }
        else if (text[i] === '"') { quoted = true; masked[i] = " "; }
      }
      const edits = [...masked.join("").matchAll(/#[A-Za-z-]+\?/g)]
        .filter((match) => options.predicates[match[0]] &&
          /^\(\s*$/.test("(" + masked.slice(0, match.index).join("").split("(").at(-1)));
      for (const match of edits.reverse()) {
        text = text.slice(0, match.index) + options.predicates[match[0]] +
          text.slice(match.index + match[0].length);
      }
    }
    if (!sections.length || sections[sections.length - 1].feature !== feature) {
      sections.push({ feature, patterns: [] });
    }
    sections[sections.length - 1].patterns.push(text.trimEnd());
  }
  return sections.map(({ feature, patterns }) =>
    `;; feature: ${feature}\n${patterns.join("\n\n")}`).join("\n\n") + "\n";
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  const rootDir = process.cwd();
  const configDir = path.isAbsolute(args.configDir)
    ? args.configDir
    : path.join(rootDir, args.configDir);
  const outDir = path.isAbsolute(args.outDir) ? args.outDir : path.join(rootDir, args.outDir);

  const configs = await listJsonConfigs(configDir);
  if (configs.length === 0) {
    throw new Error(`No JSON configs found in ${configDir}`);
  }

  let queriesDirs = args.queriesDirs.map((dir) =>
    path.isAbsolute(dir) ? dir : path.join(rootDir, dir),
  );
  if (queriesDirs.length === 0) {
    const defaultQueriesDir = path.join(rootDir, "queries");
    try {
      const stat = await fs.promises.stat(defaultQueriesDir);
      if (stat.isDirectory()) {
        queriesDirs = [defaultQueriesDir];
      }
    } catch (error) {
      queriesDirs = await findQueriesDirs(rootDir);
    }
  }

  if (queriesDirs.length === 0) {
    throw new Error("No queries directories found. Provide --queries-dir paths.");
  }

  const scmFiles = await listScmFiles(queriesDirs);
  if (scmFiles.length === 0) {
    throw new Error("No .scm files found under queries directories.");
  }

  for (const configPath of configs) {
    const editorName = path.basename(configPath, ".json");
    const mappingRaw = await fs.promises.readFile(configPath, "utf8");
    const mappingRoot = JSON.parse(mappingRaw);

    for (const scmPath of scmFiles) {
      const content = await fs.promises.readFile(scmPath, "utf8");
      const fileKey = path.basename(scmPath, ".scm");
      const mappingForFile =
        mappingRoot && typeof mappingRoot === "object" ? mappingRoot[fileKey] : null;
      // A map with only highlights deliberately does not generate unrelated
      // query families. Existing editors still require complete coverage.
      if (mappingForFile === false) continue;
      if (editorName === "emacs" && !mappingForFile) continue;
      const captures = editorName === "emacs"
        ? new Set(scanQuery(content).flatMap((pattern) => pattern.captures.map(({ name }) => name)))
        : collectCaptures(content);
      const contextLabel = `${editorName}/${fileKey}`;
      assertMappingComplete(mappingForFile, captures, contextLabel);
      const options = mappingRoot.$emacs || {};
      const output = options.featureSections
        ? sectionedContent(content, mappingForFile, options)
        : applyMappingToContent(content, mappingForFile);

      const relativePath = path.relative(rootDir, scmPath);
      const outputPath = path.join(outDir, editorName, relativePath);
      await ensureDir(path.dirname(outputPath));
      await fs.promises.writeFile(outputPath, output, "utf8");
    }
  }

  const editorList = configs.map((configPath) => path.basename(configPath, ".json")).join(", ");
  console.log(`Generated queries for: ${editorList}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = { scanQuery, sectionedContent, applyMappingToContent };
