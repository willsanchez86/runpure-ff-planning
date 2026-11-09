#!/usr/bin/env node
// Mechanical checks for the planning documents. Reports only; never writes.
// Usage: node .claude/skills/doc-check/check.mjs [--root <repo root>]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { root: { type: 'string', default: '.' }, staged: { type: 'boolean' }, base: { type: 'string' } } });
const root = resolve(values.root);
const decisionsDir = join(root, 'design', 'decisions');
const logPath = join(root, 'design', 'architecture-decisions.md');

const errors = [];
const warnings = [];
const rel = (p) => relative(root, p).replaceAll('\\', '/');
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// Status: "Accepted" / "Superseded by ADR-0012" with Markdown links reduced to their text.
const stripLinks = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();

function parseStatus(text) {
  const current = text.match(/^\*\*Status:\*\*\s*(.+)$/m);
  if (current) return { format: 'current', status: stripLinks(current[1]) };
  const table = text.match(/^\|\s*Status\s*\|\s*(.+?)\s*\|\s*$/m);
  if (table) return { format: 'table', status: stripLinks(table[1]) };
  return { format: 'unknown', status: null };
}

const REQUIRED = {
  current: ['Context', 'Decision', 'Options Considered', 'Consequences', 'Relationship to other decisions'],
  table: ['Context and problem statement', 'Decision outcome', 'Consequences'],
};
const STATUS_RE = /^(Proposed|Accepted|Rejected|Deprecated|Superseded by ADR-\d{4})$/;

// ---- ADR files ---------------------------------------------------------------
if (!existsSync(decisionsDir)) {
  console.error(`No ${rel(decisionsDir)} folder. Run from the repository root or pass --root.`);
  process.exit(2);
}

const adrs = new Map(); // number -> { file, path, text, status, format }
for (const name of readdirSync(decisionsDir).sort()) {
  if (!name.endsWith('.md')) continue;
  const path = join(decisionsDir, name);
  const m = name.match(/^ADR-(\d{4})-[a-z0-9-]+\.md$/);
  if (!m) {
    errors.push(`${rel(path)}: file name must be ADR-NNNN-lowercase-slug.md`);
    continue;
  }
  const num = m[1];
  if (adrs.has(num)) errors.push(`${rel(path)}: duplicate number ADR-${num} (also ${adrs.get(num).file})`);
  const text = read(path);
  const { format, status } = parseStatus(text);
  adrs.set(num, { file: name, path, text, status, format });

  const title = text.match(/^# ADR-(\d{4}):\s*\S/m);
  if (!title) errors.push(`${rel(path)}: first heading must be "# ADR-${num}: <decision>"`);
  else if (title[1] !== num) errors.push(`${rel(path)}: title says ADR-${title[1]}, file name says ADR-${num}`);

  if (format === 'unknown') errors.push(`${rel(path)}: no status line found`);
  else if (!STATUS_RE.test(status)) errors.push(`${rel(path)}: status "${status}" is not a lifecycle value`);

  if (REQUIRED[format]) {
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((h) => h[1].trim());
    let last = -1;
    for (const section of REQUIRED[format]) {
      const at = headings.indexOf(section);
      if (at === -1) errors.push(`${rel(path)}: missing section "## ${section}"`);
      else if (at < last) errors.push(`${rel(path)}: section "## ${section}" is out of order`);
      else last = at;
    }
  }

  // Relative links resolve
  for (const link of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    const target = link[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(path), target))) errors.push(`${rel(path)}: broken link to ${target}`);
  }
}

// Sequential numbering
const numbers = [...adrs.keys()].map(Number).sort((a, b) => a - b);
numbers.forEach((n, i) => {
  if (n !== i + 1) {
    errors.push(`numbering: expected ADR-${String(i + 1).padStart(4, '0')}, found ADR-${String(n).padStart(4, '0')} (gap or skipped number)`);
  }
});
// Report only the first gap clearly
if (errors.filter((e) => e.startsWith('numbering:')).length > 1) {
  const first = errors.findIndex((e) => e.startsWith('numbering:'));
  for (let i = errors.length - 1; i > first; i--) if (errors[i].startsWith('numbering:')) errors.splice(i, 1);
}

// Supersession links, both ways
for (const [num, adr] of adrs) {
  const sup = adr.status?.match(/^Superseded by ADR-(\d{4})$/);
  if (!sup) continue;
  const next = adrs.get(sup[1]);
  if (!next) {
    errors.push(`${adr.file}: superseded by ADR-${sup[1]}, which doesn't exist`);
    continue;
  }
  if (next.status === 'Proposed' || next.status === 'Rejected') {
    errors.push(`${adr.file}: superseded by ADR-${sup[1]}, whose status is ${next.status}`);
  }
  if (!new RegExp(`ADR-${num}\\b`).test(next.text)) {
    errors.push(`${next.file}: supersedes ADR-${num} but never mentions it (link back required)`);
  }
}

// ---- Decision log ------------------------------------------------------------
if (!existsSync(logPath)) {
  errors.push(`${rel(logPath)}: decision log missing`);
} else {
  const log = read(logPath);
  const rows = new Map();
  for (const row of log.matchAll(/^\|\s*\[ADR-(\d{4})\]\(([^)]+)\)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/gm)) {
    const [, num, target, , statusCell] = row;
    if (rows.has(num)) errors.push(`log: ADR-${num} listed twice`);
    rows.set(num, { target, status: statusCell.trim() });
  }
  for (const [num, row] of rows) {
    const adr = adrs.get(num);
    if (!adr) {
      errors.push(`log: ADR-${num} has no file in design/decisions/`);
      continue;
    }
    const targetPath = resolve(dirname(logPath), row.target);
    if (!existsSync(targetPath)) errors.push(`log: ADR-${num} links to ${row.target}, which doesn't exist`);
    else if (targetPath !== adr.path) errors.push(`log: ADR-${num} links to ${row.target}, but the file is ${adr.file}`);
    // Log status may carry annotations: "Accepted (lock and ledger in MySQL, per ADR-0005)"
    const logStatus = stripLinks(row.status).replace(/\s*\(.*\)\s*$/, '').trim();
    if (adr.status && logStatus !== adr.status) {
      errors.push(`log: ADR-${num} status "${logStatus}" doesn't match the file's "${adr.status}"`);
    }
  }
  for (const num of adrs.keys()) {
    if (!rows.has(num)) errors.push(`log: ADR-${num} (${adrs.get(num).file}) is not listed`);
  }
}

// ---- Downstream references -------------------------------------------------------
function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return mdFiles(p);
    return name.endsWith('.md') ? [p] : [];
  });
}
const designTop = existsSync(join(root, 'design'))
  ? readdirSync(join(root, 'design'))
      .filter((n) => n.endsWith('.md') && n !== 'architecture-decisions.md')
      .map((n) => join(root, 'design', n))
  : [];
const downstream = [
  ...(existsSync(join(root, 'README.md')) ? [join(root, 'README.md')] : []),
  ...designTop,
  ...mdFiles(join(root, 'governance')).filter((p) => !p.endsWith('templates.md')),
  ...mdFiles(join(root, 'design', 'reviews')),
  ...mdFiles(join(root, 'prds')),
  ...mdFiles(join(root, 'specs')),
];

// Rules out: an ADR may list what it rules out, e.g. `**Rules out:** DuckDB; object storage bucket`.
const ruledOut = []; // { term, num }
for (const [num, adr] of adrs) {
  if (!adr.status?.startsWith('Accepted')) continue;
  const m = adr.text.match(/^\*\*Rules out:\*\*\s*(.+)$/m);
  if (m) for (const term of m[1].split(';').map((t) => t.trim()).filter(Boolean)) ruledOut.push({ term, num });
}
const NEGATION = /\b(no|not|without|removed|instead of|rules? out|ruled out|replaces?|rather than)\b/i;
const CHANGELOG = /^(> )?\*\*v\d/;
const historical = (p) => /\/(research|design\/reviews)\//.test(p.replaceAll('\\', '/'));

const PRD_SECTIONS = ['At a glance', 'The problem', 'What success looks like', 'Not doing', 'User stories',
  'Must have for launch', 'Should have soon after', 'Later', "How we'll measure it", 'Open questions', 'Build order'];

for (const path of downstream) {
  const text = read(path);
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const ref of line.matchAll(/ADR-(\d{4})\b/g)) {
      const adr = adrs.get(ref[1]);
      if (!adr) warnings.push(`${rel(path)}:${i + 1}: mentions ADR-${ref[1]}, which doesn't exist`);
      else if (adr.status && /^(Superseded|Deprecated)/.test(adr.status)) {
        warnings.push(`${rel(path)}:${i + 1}: mentions ADR-${ref[1]} (${adr.status})`);
      }
    }
    if (historical(path) || CHANGELOG.test(line) || NEGATION.test(line)) return;
    for (const { term, num } of ruledOut) {
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${esc}s?\\b`, term === term.toUpperCase() ? '' : 'i'); // acronyms match case-sensitively
      if (re.test(line) && !line.includes(`ADR-${num}`)) {
        errors.push(`${rel(path)}:${i + 1}: names "${term}", ruled out by ADR-${num}`);
      }
    }
  });
  // Relative links resolve
  for (const link of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(link[1])) continue;
    if (!existsSync(resolve(dirname(path), link[1]))) errors.push(`${rel(path)}: broken link to ${link[1]}`);
  }
  // PRD sections, in order (technical PRDs may add their own)
  if (/\/prds\/(feature|infra)-[^/]+\.md$/.test(path.replaceAll('\\', '/'))) {
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((h) => h[1].trim());
    let last = -1;
    for (const section of PRD_SECTIONS) {
      const at = headings.indexOf(section);
      if (at === -1) errors.push(`${rel(path)}: missing section "## ${section}"`);
      else if (at < last) errors.push(`${rel(path)}: section "## ${section}" is out of order`);
      else last = at;
    }
    if (!/^\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/m.test(text)) errors.push(`${rel(path)}: no "**Last updated:** YYYY-MM-DD" line`);
  }
}

// Downstream sync: with --staged (pre-commit) or --base <ref> (CI), an edited ADR's
// downstream documents that mention it must be edited in the same change.
const changedFiles = (() => {
  const args = process.argv;
  const at = args.indexOf('--base');
  let out;
  try {
    if (at > -1) out = execFileSync('git', ['diff', '--name-only', args[at + 1], 'HEAD'], { cwd: root, encoding: 'utf8' });
    else if (args.includes('--staged')) out = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' });
    else return null;
  } catch { return null; }
  return new Set(out.split('\n').filter(Boolean));
})();
if (changedFiles) {
  for (const f of changedFiles) {
    const m = f.match(/^design\/decisions\/ADR-(\d{4})-/);
    if (!m) continue;
    for (const path of downstream) {
      if (historical(path) || changedFiles.has(rel(path))) continue;
      if (new RegExp(`ADR-${m[1]}\\b`).test(read(path))) {
        errors.push(`${rel(path)}: mentions ADR-${m[1]}, which changed, but wasn't updated in the same change (documentation-suite §2.2)`);
      }
    }
  }
}

// ---- Report ------------------------------------------------------------------
console.log(`Checked ${adrs.size} ADRs, the decision log, and ${downstream.length} downstream documents.\n`);
if (errors.length) {
  console.log(`Errors (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
} else console.log('Errors: none');
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
} else console.log('Warnings: none');
process.exitCode = errors.length ? 1 : 0;
