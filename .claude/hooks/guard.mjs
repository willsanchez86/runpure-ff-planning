#!/usr/bin/env node
// Claude Code hooks. `pre`: block edits to frozen ADRs except their status line.
// `check`: run the doc check; exit 2 shows errors to Claude (on Stop, it keeps working).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const mode = process.argv[2];

if (mode === 'pre') {
  const t = input.tool_input ?? {};
  const path = t.file_path ?? '';
  if (!/design\/decisions\/ADR-\d{4}-.*\.md$/.test(path) || !existsSync(path)) process.exit(0);
  if (!/^(\*\*Implementation started:\*\*|\|\s*Implementation started\s*\|)/m.test(readFileSync(path, 'utf8'))) process.exit(0);
  const statusOnly = (s) => typeof s === 'string' && !s.includes('\n') && /^(\*\*Status:\*\*|\|\s*Status\s*\|)/.test(s);
  if (input.tool_name === 'Edit' && statusOnly(t.old_string) && statusOnly(t.new_string)) process.exit(0);
  console.error(`${path} is frozen (Implementation started). Only its status line may change; write a new ADR instead.`);
  process.exit(2);
}

if (mode === 'check') {
  if (input.stop_hook_active) process.exit(0); // don't loop forever on Stop
  try {
    execFileSync('node', ['.claude/skills/doc-check/check.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.error(String(e.stdout ?? '') + 'Fix these before finishing.');
    process.exit(2);
  }
}
