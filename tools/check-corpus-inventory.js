#!/usr/bin/env node
// Keep every merge-base corpus case and each fork-only case represented in the current corpus.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const corpus = path.join(root, 'test/corpus');
const inventory = JSON.parse(fs.readFileSync(path.join(corpus, 'inventory.json'), 'utf8'));
const base = '68f4054';
const fork = 'backup/fork-master-5f66b59';
const expectedCounts = { [base]: 104, [fork]: 19 };

function headings(text) {
  return [...text.matchAll(/^(={3,})\r?\n([^\r\n]+)\r?\n\1\r?$/gm)].map((match) => match[2]);
}

function key(file, title) {
  return `${file}::${title}`;
}

function entries(files) {
  return Object.entries(files).flatMap(([file, titles]) => titles.map((title) => key(file, title)));
}

function check(current, manifest) {
  assert.deepEqual(Object.keys(manifest.sources).sort(), [base, fork].sort(), 'source revisions changed');
  const baseCases = entries(manifest.sources[base]);
  const forkCases = entries(manifest.sources[fork]);
  assert.equal(baseCases.length, expectedCounts[base], 'merge-base heading count changed');
  assert.equal(forkCases.length, expectedCounts[fork], 'fork-only heading count changed');
  assert.equal(new Set(baseCases).size, baseCases.length - 2, 'merge-base duplicate heading count changed');
  assert.equal(new Set(forkCases).size, forkCases.length, 'duplicate fork-only heading');
  const forkMaps = manifest.equivalents[fork];
  assert.deepEqual(Object.keys(forkMaps).sort(), Object.keys(manifest.sources[fork]).sort(), 'fork mapping files differ');
  for (const [file, titles] of Object.entries(manifest.sources[fork])) {
    assert.deepEqual(Object.keys(forkMaps[file]).sort(), titles.slice().sort(), `fork mappings missing or unexpected for ${file}`);
  }
  const seen = new Set(entries(current));
  const baseMaps = manifest.equivalents[base] || {};
  for (const [file, mappings] of Object.entries(baseMaps)) {
    assert(manifest.sources[base][file], `unknown merge-base mapping file: ${file}`);
    for (const title of Object.keys(mappings)) {
      assert(manifest.sources[base][file].includes(title), `unknown merge-base mapping: ${key(file, title)}`);
    }
  }
  for (const [file, titles] of Object.entries(manifest.sources[base])) {
    for (const title of titles) {
      const source = key(file, title);
      const target = (baseMaps[file] || {})[title] || source;
      assert(seen.has(target), `missing merge-base corpus heading or equivalent: ${source} -> ${target}`);
    }
  }
  for (const [file, titles] of Object.entries(manifest.sources[fork])) {
    for (const title of titles) {
      const target = forkMaps[file][title];
      assert.equal(typeof target, 'string', `missing mapping for ${key(file, title)}`);
      assert(seen.has(target), `missing equivalent corpus heading for ${key(file, title)}: ${target}`);
    }
  }
  return { base: baseCases.length, fork: forkCases.length, current: entries(current).length };
}

function readCurrent() {
  return Object.fromEntries(fs.readdirSync(corpus).filter((file) => file.endsWith('.txt')).map((file) => [file, headings(fs.readFileSync(path.join(corpus, file), 'utf8'))]));
}

function checkEvidence(manifest) {
  for (const [rev, files] of Object.entries(manifest.evidence)) {
    assert.deepEqual(Object.keys(files).sort(), Object.keys(manifest.equivalents[rev]).sort(), `evidence files differ for ${rev}`);
    for (const [file, snippets] of Object.entries(files)) {
      assert.deepEqual(Object.keys(snippets).sort(), Object.keys(manifest.equivalents[rev][file]).sort(), `evidence cases differ for ${rev}:${file}`);
      for (const [title, snippet] of Object.entries(snippets)) {
        assert(snippet.length > 0, `empty evidence for ${rev}:${key(file, title)}`);
        const target = manifest.equivalents[rev][file][title];
        const separator = target.indexOf('::');
        assert(separator > 0, `invalid target: ${target}`);
        const targetFile = target.slice(0, separator);
        const targetTitle = target.slice(separator + 2);
        const text = fs.readFileSync(path.join(corpus, targetFile), 'utf8');
        const marker = /^(={3,})\r?\n([^\r\n]+)\r?\n\1\r?$/gm;
        const matches = [...text.matchAll(marker)];
        const cases = matches.filter((match) => match[2] === targetTitle).map((match) => text.slice(match.index + match[0].length, matches.find((next) => next.index > match.index)?.index ?? text.length));
        assert(cases.some((body) => body.split(/\r?\n-{3,}\r?\n/)[0].includes(snippet)), `equivalent source missing ${JSON.stringify(snippet)} for ${rev}:${key(file, title)} -> ${target}`);
      }
    }
  }
}

function verifyHistory(manifest) {
  for (const rev of [base, fork]) {
    let paths;
    try {
      paths = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, 'test/corpus'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n');
    } catch (_) {
      console.log(`History ${rev} unavailable; checking committed inventory snapshot only`);
      continue;
    }
    const original = Object.fromEntries(paths.filter((file) => file.endsWith('.txt')).map((file) => [path.basename(file), headings(execFileSync('git', ['show', `${rev}:${file}`], { cwd: root, encoding: 'utf8' }))]));
    if (rev === base) {
      assert.deepEqual(manifest.sources[base], original, 'merge-base heading snapshot differs from git history');
    } else {
      const additions = Object.fromEntries(Object.entries(original).map(([file, titles]) => [file, titles.filter((title) => !(manifest.sources[base][file] || []).includes(title))]).filter(([, titles]) => titles.length));
      assert.deepEqual(manifest.sources[fork], additions, 'fork-added heading snapshot differs from git history');
    }
  }
}

function selfTest(current) {
  const removed = structuredClone(current);
  removed['modern_syntax.txt'].splice(removed['modern_syntax.txt'].indexOf('modern_expect'), 1);
  assert.throws(() => check(removed, inventory), /missing merge-base corpus heading/);
  const missingBaseEquivalent = structuredClone(inventory);
  missingBaseEquivalent.equivalents[base]['nums.txt']['Old immediate suffix format still works'] = 'nums.txt::no such heading';
  assert.throws(() => check(current, missingBaseEquivalent), /missing merge-base corpus heading or equivalent/);
  const unmapped = structuredClone(inventory);
  delete unmapped.equivalents[fork]['loops.txt'].while_loop;
  assert.throws(() => check(current, unmapped), /fork mappings missing or unexpected/);
  const invalid = structuredClone(inventory);
  invalid.equivalents[fork]['loops.txt'].while_loop = 'loops.txt::not a corpus heading';
  assert.throws(() => check(current, invalid), /missing equivalent corpus heading/);
  const noEvidence = structuredClone(inventory);
  noEvidence.evidence[fork]['loops.txt'].while_loop = 'not present in the equivalent case';
  assert.throws(() => checkEvidence(noEvidence), /equivalent source missing/);
  console.log('Corpus inventory failure-path tests passed');
}

try {
  const current = readCurrent();
  if (process.argv.includes('--self-test')) selfTest(current);
  verifyHistory(inventory);
  const counts = check(current, inventory);
  checkEvidence(inventory);
  console.log(`Corpus inventory: ${counts.base} merge-base headings, ${counts.fork} fork additions, ${counts.current} current headings`);
} catch (error) {
  console.error(`Corpus inventory failed: ${error.message}`);
  process.exitCode = 1;
}
