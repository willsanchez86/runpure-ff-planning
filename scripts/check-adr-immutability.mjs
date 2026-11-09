#!/usr/bin/env node
// Pre-commit check. Applies only to ADRs whose committed version (HEAD) has an
// "Implementation started" line: such an ADR may change only its status line, and only
// from Accepted to "Superseded by ADR-NNNN" or "Deprecated". It can't be deleted or renamed.
// ADRs without that line (not yet implemented) are unrestricted: they can be revised in
// place, deleted and renumbered (governance/templates.md §1).
//
// Runs against staged changes (pre-commit), or with `--base <ref>` against the commits since <ref> (CI).
// Local bypass: `git commit --no-verify`; CI with --base can't be bypassed.
import { execFileSync } from 'node:child_process';

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : null;
const BEFORE = BASE ?? 'HEAD';

const DIR = 'design/decisions/';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function headExists() {
  try {
    git('rev-parse', '--verify', 'HEAD');
    return true;
  } catch {
    return false;
  }
}

const stripLinks = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
const isImplementedLine = (line) =>
  /^\*\*Implementation started:\*\*\s*\d{4}-\d{2}-\d{2}/.test(line) ||
  /^\|\s*Implementation started\s*\|\s*\d{4}-\d{2}-\d{2}/.test(line);
const isStatusLine = (line) => /^\*\*Status:\*\*/.test(line) || /^\|\s*Status\s*\|/.test(line);

function statusOf(line) {
  const current = line.match(/^\*\*Status:\*\*\s*(.+)$/);
  if (current) return stripLinks(current[1]);
  const table = line.match(/^\|\s*Status\s*\|\s*(.+?)\s*\|\s*$/);
  return table ? stripLinks(table[1]) : null;
}

function lines(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
}

if (!BASE && !headExists()) process.exit(0); // first commit: nothing accepted yet

const changes = (BASE ? git('diff', '--name-status', '-M', BASE, 'HEAD', '--', DIR) : git('diff', '--cached', '--name-status', '-M', '--', DIR))
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'));

const problems = [];

for (const [code, path, newPath] of changes) {
  const kind = code[0];
  if (kind === 'A') continue; // new ADR

  let before;
  try {
    before = lines(git('show', `${BEFORE}:${path}`));
  } catch {
    continue; // not in HEAD
  }
  const beforeStatusLine = before.find(isStatusLine);
  const beforeStatus = beforeStatusLine ? statusOf(beforeStatusLine) : null;
  if (beforeStatus === 'Proposed' || beforeStatus === null) continue; // still a draft
  if (!before.some(isImplementedLine)) continue; // implementation not started: revisable in place

  if (kind === 'D') {
    problems.push(`${path}: ${beforeStatus} ADRs can't be deleted`);
    continue;
  }
  if (kind === 'R') {
    problems.push(`${path} -> ${newPath}: ${beforeStatus} ADRs can't be renamed`);
    continue;
  }
  if (kind !== 'M') {
    problems.push(`${path}: unexpected change type ${code}`);
    continue;
  }

  const after = lines(git('show', BASE ? `HEAD:${newPath ?? path}` : `:${path}`));
  const afterStatusLines = after.filter(isStatusLine);
  if (afterStatusLines.length !== 1) {
    problems.push(`${path}: must keep exactly one status line`);
    continue;
  }

  const rest = (arr) => arr.filter((l) => !isStatusLine(l));
  const b = rest(before);
  const a = rest(after);
  const bodyChanged = b.length !== a.length || b.some((l, i) => l !== a[i]);
  if (bodyChanged) {
    const at = b.findIndex((l, i) => l !== a[i]);
    const lineNo = at === -1 ? Math.min(a.length, b.length) + 1 : at + 1;
    problems.push(`${path}: ${beforeStatus} ADR changed outside its status line (first difference near line ${lineNo}, status line excluded)`);
    continue;
  }

  const afterStatus = statusOf(afterStatusLines[0]);
  if (afterStatus === beforeStatus) continue; // formatting of the status line only
  const allowed = beforeStatus === 'Accepted' && (/^Superseded by ADR-\d{4}$/.test(afterStatus) || afterStatus === 'Deprecated');
  if (!allowed) {
    problems.push(`${path}: status can't change from "${beforeStatus}" to "${afterStatus}" (allowed: Accepted -> Superseded by ADR-NNNN or Deprecated)`);
  }
}

if (problems.length) {
  console.error('ADR immutability check failed:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nThese ADRs have an "Implementation started" line, so a changed decision is a new ADR');
  console.error('that supersedes the old one (see governance/templates.md §1).');
  process.exit(1);
}
