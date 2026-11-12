#Requires -Version 5.1
<#
.SYNOPSIS
  Initializes the Runpure FF backend repository: Express 5 + TypeScript, layered modular
  monolith, GraphQL endpoint (Yoga + Pothos, trusted documents), Firebase token check,
  nflverse extract, MySQL load, ingest ledger, run lock, scheduler, backfill.

.DESCRIPTION
  Creates the folder, runs git init, writes every source file, copies the code-repo kit
  (AGENTS.md, CLAUDE.md, .github, scripts) from this script's folder, installs npm
  packages, prints schema.graphql, type-checks, and starts local MySQL with Docker
  (mysql:8.4) when Docker is available.

  Implements: ADR-0001, 0005, 0006, 0008, 0009, 0010, 0011, 0012, 0013, 0014, 0015,
  0016, 0017; ETL spec decisions D2, D5, D6, D7, D9a, D12
  (runpure-ff-planning/specs/ff-data-etl-storage-spec.md).
  Updated 2026-11-10 to the decisions of 2026-11-08 and 2026-11-09.

.PARAMETER Path
  Folder to create. Default: .\runpure-ff-backend

.PARAMETER SkipInstall
  Do not run npm install (write files only).

.PARAMETER NoDocker
  Do not run "docker compose up -d" for local MySQL.

.EXAMPLE
  .\init-runpure-backend.ps1
  .\init-runpure-backend.ps1 -Path C:\dev\runpure-ff-backend
#>
[CmdletBinding()]
param(
  [string]$Path = '.\runpure-ff-backend',
  [switch]$SkipInstall,
  [switch]$NoDocker
)

$ErrorActionPreference = 'Stop'
$KitDir = $PSScriptRoot

# ---------------------------------------------------------------------------
# 0. Prerequisites
# ---------------------------------------------------------------------------
$missing = @()
foreach ($tool in 'git', 'node', 'npm') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { $missing += $tool }
}
if ($missing.Count -gt 0) {
  throw "Missing required tools: $($missing -join ', '). Install them, then re-run."
}

$nodeMajor = [int]((& node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 24) {
  Write-Warning "Node $(& node -v) found. The project targets Node 24 (ADR-0017; GraphQL Yoga 6 needs Node 22 or later)."
}

$hasDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
if (-not $hasDocker) {
  Write-Warning 'Docker not found. Local MySQL will not be started; see the instructions printed at the end.'
}

# ---------------------------------------------------------------------------
# 1. Folder and git
# ---------------------------------------------------------------------------
if (Test-Path $Path) {
  if ((Get-ChildItem -Force $Path | Measure-Object).Count -gt 0) {
    throw "Folder '$Path' already exists and is not empty. Choose another -Path."
  }
}
else {
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}
$Root = (Resolve-Path $Path).Path
Write-Host "Initializing backend in $Root"

Push-Location $Root
try {
  & git init -b main | Out-Null
  Write-Host 'git repository initialized (branch: main)'

  function Write-File {
    param([string]$RelativePath, [string]$Content)
    $full = Join-Path $Root $RelativePath
    $dir = Split-Path $full -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $normalized = $Content -replace "`r`n", "`n"
    if (-not $normalized.EndsWith("`n")) { $normalized += "`n" }
    [System.IO.File]::WriteAllText($full, $normalized, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  wrote $RelativePath"
  }

  # -------------------------------------------------------------------------
  # 2. Project files
  # -------------------------------------------------------------------------
  Write-File 'package.json' @'
{
  "name": "runpure-ff-backend",
  "version": "0.1.0",
  "private": true,
  "description": "Runpure FF backend: GraphQL API, nflverse ETL pipeline, scheduled jobs, backfill",
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "npm run schema && tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint src",
    "prepare": "git config core.hooksPath .githooks",
    "schema": "tsx src/graphql/print-schema.ts",
    "spike": "tsx src/jobs/spike-yoga.ts",
    "ingest": "tsx src/jobs/ingest.ts",
    "backfill": "tsx src/jobs/backfill.ts",
    "headers": "tsx src/jobs/headers.ts"
  }
}
'@

  Write-File 'tsconfig.json' @'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"]
}
'@

  Write-File 'eslint.config.js' @'
/** ESLint: every exported function, type and constant needs a JSDoc comment (AGENTS.md rule 5). */
import tsParser from '@typescript-eslint/parser';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true },
          contexts: [
            'ExportNamedDeclaration > VariableDeclaration',
            'ExportNamedDeclaration > TSInterfaceDeclaration',
            'ExportNamedDeclaration > TSTypeAliasDeclaration',
          ],
        },
      ],
    },
  },
];
'@

  Write-File '.githooks/pre-commit' @'
#!/bin/sh
# Blocks the commit when lint or the type-check fails. Enabled by "npm install" (prepare script).
npm run -s lint && npm run -s typecheck
'@

  Write-File '.github/workflows/ci.yml' @'
# Runs the same checks as the pre-commit hook on every pull request and push to main.
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
'@


  Write-File '.gitignore' @'
node_modules/
dist/
.env
*.log
# Firebase service-account keys never go in the repo (ADR-0015)
*firebase-adminsdk*.json
service-account*.json
'@

  Write-File '.env.example' @'
# Copy to .env and adjust. .env is git-ignored.

# Local MySQL container (docker-compose.yml reads these). The setup script puts
# generated passwords in .env; DATABASE_URL must use the same user and password.
MYSQL_ROOT_PASSWORD=change-me-root
MYSQL_DATABASE=runpure
MYSQL_USER=runpure
MYSQL_PASSWORD=change-me
MYSQL_PORT=3306
DATABASE_URL=mysql://runpure:change-me@127.0.0.1:3306/runpure

# HTTP API
PORT=4000

# The frontend's origin; CORS allows only this origin (ADR-0014)
FRONTEND_ORIGIN=http://localhost:3000

# Firebase Admin SDK credentials (ADR-0015): absolute path to the service-account key
# file, kept OUTSIDE this repo. Read by the SDK's application-default credentials.
GOOGLE_APPLICATION_CREDENTIALS=

# Requests per minute per client IP on the GraphQL endpoint (ADR-0017, OWASP API4:2023)
RATE_LIMIT_PER_MINUTE=300

# Local development only: also accept GraphQL operations that are not in the trusted-
# documents store. Refused when NODE_ENV=production (ADR-0017 item 9).
# GRAPHQL_ALLOW_ARBITRARY=true

# Scheduled ingest: one run a day at 06:00 Eastern (ETL spec D7).
# Several cron expressions can be separated by ";".
PIPELINE_CRON=0 6 * * *
PIPELINE_TZ=America/New_York

# First season of the one-time backfill (ADR-0006: 2022)
HISTORY_START_SEASON=2022

# Rows per INSERT batch while loading
LOAD_BATCH_SIZE=1000

# Force the current season instead of deriving it from the date (ETL spec D6)
# CURRENT_SEASON=2026
'@

  Write-File 'docker-compose.yml' @'
# Local development database only. Settings come from .env (git-ignored).
services:
  mysql:
    # Pinned: mysql:lts now tracks 9.7; the project uses 8.4 (ETL spec §7.3).
    image: mysql:8.4
    container_name: runpure-mysql
    # Read only on first start. To change them later: docker compose down -v (deletes data).
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}
      MYSQL_DATABASE: ${MYSQL_DATABASE:?set MYSQL_DATABASE in .env}
      MYSQL_USER: ${MYSQL_USER:?set MYSQL_USER in .env}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?set MYSQL_PASSWORD in .env}
    # This computer only.
    ports:
      - "127.0.0.1:${MYSQL_PORT:-3306}:3306"
    # Data survives restarts; only "docker compose down -v" deletes it.
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:
'@

  Write-File 'sql/README.md' @'
# Schema statements

Schema changes are applied by hand (ADR-0011): run each file in numeric order against
each database copy (local now, hosted later), for example in MySQL Workbench. Every
statement that has been run is kept here so the schema can be rebuilt.

Data tables for each nflverse dataset are created here too, by hand, once their
columns are mapped (see `src/modules/pipeline/service/datasets.ts` and the ETL spec's
§7.2 and data dictionary).

Timestamps are stored as `DATETIME` in UTC (ETL spec §7.2.2).
'@

  Write-File 'sql/0001_pipeline_tables.sql' @'
-- Pipeline bookkeeping (ADR-0006, ADR-0005). Apply by hand (ADR-0011).
-- Timestamps are DATETIME in UTC.

CREATE TABLE IF NOT EXISTS ingest_ledger (
  id                   INT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dataset              VARCHAR(64)       NOT NULL,
  season               SMALLINT UNSIGNED NOT NULL COMMENT '0 for single-file datasets',
  source_url           VARCHAR(512)      NOT NULL,
  source_etag          VARCHAR(128)      NULL,
  source_last_modified VARCHAR(64)       NULL,
  content_length       BIGINT UNSIGNED   NULL,
  status               ENUM('downloading','loaded','failed') NOT NULL,
  rows_loaded          INT UNSIGNED      NULL,
  error                TEXT              NULL,
  started_at           DATETIME          NOT NULL,
  finished_at          DATETIME          NULL,
  UNIQUE KEY uq_ingest_ledger (dataset, season)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS job_run (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind           ENUM('ingest','backfill') NOT NULL,
  started_at     DATETIME     NOT NULL,
  finished_at    DATETIME     NULL,
  outcome        ENUM('running','ok','failed','skipped_locked') NOT NULL DEFAULT 'running',
  pieces_loaded  INT UNSIGNED NOT NULL DEFAULT 0,
  pieces_skipped INT UNSIGNED NOT NULL DEFAULT 0,
  pieces_failed  INT UNSIGNED NOT NULL DEFAULT 0,
  error          TEXT         NULL
) ENGINE = InnoDB;
'@

  Write-File 'sql/0002_users.sql' @'
-- App accounts (ADR-0015, ADR-0001). Each account is keyed to its Firebase uid;
-- account-owned rows elsewhere carry users.id as user_id. Apply by hand (ADR-0011).
--
-- How accounts are created is not decided yet (system design, "Not decided"). Until
-- it is, add each account by hand after its first sign-in, for example:
--   INSERT INTO users (firebase_uid, is_operator) VALUES ('<uid from Firebase console>', TRUE);
-- is_operator grants the operator-only GraphQL fields (pipelineRuns, ingestLedger).

CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  is_operator  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
  UNIQUE KEY uq_users_firebase_uid (firebase_uid)
) ENGINE = InnoDB;
'@

  Write-File 'persisted/README.md' @'
# Trusted documents (ADR-0016 item 3, ADR-0017 item 9)

The GraphQL endpoint runs only operations listed here, looked up by the hash the client
sends (`extensions.persistedQuery.sha256Hash`, Apollo's APQ format).

- `frontend.json`: the web app's operations, `{ "<hash>": "<document>" }`, written by the
  frontend's GraphQL Code Generator run and copied here in the same change set as the
  frontend code that uses them. Deploy the backend first.
- `operator/*.graphql`: operator operations owned by this repo. Each file's SHA-256
  hash is its key; the server prints the hashes at startup.
'@

  Write-File 'persisted/frontend.json' @'
{}
'@

  Write-File 'persisted/operator/PipelineRuns.graphql' @'
query PipelineRuns($limit: Int) {
  pipelineRuns(limit: $limit) {
    id
    kind
    startedAt
    finishedAt
    outcome
    piecesLoaded
    piecesSkipped
    piecesFailed
    error
  }
}
'@

  Write-File 'persisted/operator/IngestLedger.graphql' @'
query IngestLedger {
  ingestLedger {
    dataset
    season
    status
    rowsLoaded
    sourceEtag
    startedAt
    finishedAt
    error
  }
}
'@

  Write-File 'README.md' @'
# Runpure FF backend

Node.js 24 + Express 5 + TypeScript, layered modular monolith (ADR-0008). Holds the
GraphQL API, the nflverse ETL pipeline with its daily scheduled run, and the one-time
backfill. MySQL is the only store (ADR-0005). Rows are mapped by hand, no ORM
(ADR-0010); schema changes are applied by hand from `sql/` (ADR-0011); no transform
library (ADR-0012). Planning documents live in `runpure-ff-planning`; the pipeline is
specified in its `specs/ff-data-etl-storage-spec.md`.

## API (ADR-0014 to ADR-0017)

- One GraphQL endpoint, `/graphql`, built code-first with Pothos and served by GraphQL
  Yoga. `npm run schema` prints the contract to `schema.graphql`; commit it with the
  change that produced it (ADR-0016).
- Every request needs a Firebase ID token (`Authorization: Bearer <token>`) for an
  account in the `users` table; otherwise 401 or 403 (ADR-0015).
- CORS allows only `FRONTEND_ORIGIN`; requests are rate-limited per client IP.
- Only trusted documents run (`persisted/`). `GRAPHQL_ALLOW_ARBITRARY=true` lifts this
  for local development only.
- Operator fields `pipelineRuns` and `ingestLedger` need `users.is_operator`. Until the
  frontend exists, read `job_run` and `ingest_ledger` directly in MySQL.
- `GET /health` is a plain probe for the host, outside the API.

## Layout

```
src/
  app.ts                     Express app wiring
  server.ts                  Process entry: HTTP server + scheduler + shutdown
  config/env.ts              Environment variables
  db/pool.ts, db/lock.ts     MySQL pool (UTC); GET_LOCK run lock (ADR-0006)
  middleware/                request log, Firebase token check, error handler
  routes/index.ts            mounts /health and the GraphQL endpoint
  graphql/                   Pothos builder, schema, Yoga server, persisted store
  modules/
    health/                  controller, routes
    account/                 users model; `me` field
    pipeline/
      model/                 ingest_ledger and job_run queries
      service/
        datasets.ts          nflverse dataset registry + column mappings
        season.ts            current season (D6); which seasons each run loads
        nflverse.service.ts  HEAD for version, streamed CSV download
        load.service.ts      staging table -> swap in one transaction
        ingest.service.ts    one pipeline run (lock, ledger, per-piece load)
      graphql/               pipelineRuns, ingestLedger (operator accounts only)
  scheduler/index.ts         cron schedule that calls the ingest entry point
  jobs/                      CLI entry points: ingest, backfill, headers, spike
sql/                         hand-applied schema statements, in order
persisted/                   trusted documents
```

## Commands

```
npm run spike        proves GraphQL Yoga runs on this Express 5 app (ADR-0017 item 7)
npm run dev          API + scheduler, reloading on change
npm run schema       print schema.graphql
npm run headers      print each dataset's CSV columns and a sample row (for mapping)
npm run ingest       one incremental run now (current season only)
npm run backfill     one-time history load: -- --from 2022 --to 2026 [--dataset name]
npm run typecheck    tsc --noEmit
npm run lint         ESLint: JSDoc required on exports (also runs before each commit and in CI)
npm run build && npm start
```

## Mapping a dataset

1. `npm run headers -- --dataset stats_player_week` to see the columns.
2. Write the `CREATE TABLE` (ETL spec §7.2 and data dictionary) in a new
   `sql/000N_*.sql` file and apply it by hand.
3. Fill `table` and `columns` for that dataset in `datasets.ts`.
4. `npm run ingest -- --dataset stats_player_week`.

Datasets without a mapping are skipped and reported.

## Load rules

- One piece = one dataset file (dataset x season; season 0 for single files) (D5).
- A piece is skipped when its ETag matches the ledger's last successful load.
- Rows stream into `<table>__staging` in batches, then one transaction replaces the
  target rows (that season for history datasets; the whole table otherwise) and commits.
- `history` datasets keep 2022-current (ADR-0006); `current_season` datasets (play-by-play,
  depth charts) keep only the current season (ADR-0013); `single_file` datasets are
  replaced whole.
- Current season (D6): rosters switch to the new season on March 15; every other
  seasonal dataset on the Wednesday after Labor Day. `CURRENT_SEASON` overrides both.
- Empty strings and `NA` become NULL.
- Not built yet: the checks that block or warn on a load (ETL spec §8, D10).
'@

  # -------------------------------------------------------------------------
  # 3. Source: config, db
  # -------------------------------------------------------------------------
  Write-File 'src/config/env.ts' @'
/** Environment settings, read and validated once at startup (see .env.example). */
import 'dotenv/config';

/** Reads a numeric variable, or the fallback when unset; throws on a non-number. */
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
}

const production = process.env.NODE_ENV === 'production';
const allowArbitrary = process.env.GRAPHQL_ALLOW_ARBITRARY === 'true';
if (production && allowArbitrary) {
  throw new Error('GRAPHQL_ALLOW_ARBITRARY must not be set in production (ADR-0017 item 9)');
}

/** Validated settings; DATABASE_URL is read only when first needed. */
export const env = {
  port: num('PORT', 4000),
  production,

  /** Read lazily so jobs that never touch the database can run without it. */
  databaseUrl(): string {
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error('DATABASE_URL is not set (see .env.example)');
    return value;
  },

  /** The only origin CORS allows (ADR-0014). */
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  rateLimitPerMinute: num('RATE_LIMIT_PER_MINUTE', 300),
  /** Local development only; see .env.example. */
  allowArbitraryOperations: allowArbitrary,

  timezone: process.env.PIPELINE_TZ ?? 'America/New_York',
  cronSchedules: (process.env.PIPELINE_CRON ?? '0 6 * * *')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean),

  currentSeasonOverride: process.env.CURRENT_SEASON ? num('CURRENT_SEASON', 0) : undefined,
  historyStartSeason: num('HISTORY_START_SEASON', 2022),
  loadBatchSize: num('LOAD_BATCH_SIZE', 1000),
};
'@

  Write-File 'src/db/pool.ts' @'
/** Shared mysql2 connection pool, created on first use (ADR-0010). */
import mysql, { type Pool } from 'mysql2/promise';
import { env } from '../config/env.js';

let pool: Pool | undefined;

/** Returns the shared pool, creating it on first call. DATETIME values are read and written as UTC. */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: env.databaseUrl(),
      waitForConnections: true,
      connectionLimit: 10,
      supportBigNumbers: true,
      // DATETIME values are UTC (ETL spec §7.2.2); read and write them as UTC.
      timezone: 'Z',
    });
  }
  return pool;
}

/** Ends the pool; the next getPool call creates a new one. */
export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}
'@

  Write-File 'src/db/lock.ts' @'
/** MySQL named lock that keeps pipeline runs from overlapping (ADR-0006; ETL spec §5.3). */
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

/** Named MySQL lock shared by scheduled and backfill runs (ADR-0006). Held per connection. */
export const PIPELINE_LOCK_NAME = 'runpure_pipeline_run';

/** Takes the lock without waiting; true if taken. Release it on the same connection. */
export async function tryAcquireLock(conn: PoolConnection, name = PIPELINE_LOCK_NAME): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS got', [name]);
  return Number(rows[0]?.got) === 1;
}

/** Releases the lock this connection holds. */
export async function releaseLock(conn: PoolConnection, name = PIPELINE_LOCK_NAME): Promise<void> {
  await conn.query('SELECT RELEASE_LOCK(?)', [name]);
}
'@

  # -------------------------------------------------------------------------
  # 4. Source: HTTP layer (app, middleware, routes, health and account modules)
  # -------------------------------------------------------------------------
  Write-File 'src/app.ts' @'
/** Builds the Express app: request log, routes, 404 and error handlers (ADR-0008). */
import express from 'express';
import { requestLog } from './middleware/request-log.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { mountRoutes } from './routes/index.js';

/** Creates the Express app with every route mounted. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLog);
  mountRoutes(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
'@

  Write-File 'src/server.ts' @'
/** Process entry: HTTP server, in-process scheduler and graceful shutdown (ADR-0008). */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';
import { startScheduler, stopScheduler } from './scheduler/index.js';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (GraphQL at /graphql)`);
});

startScheduler();

// ADR-0008: on a shutdown signal, stop starting new runs; an interrupted run is redone
// safely because loads go to a staging table and are swapped in one transaction.
function shutdown(signal: string): void {
  console.log(`${signal} received: shutting down`);
  stopScheduler();
  server.close(() => {
    closePool()
      .catch((err) => console.error('error closing pool', err))
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 30_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
'@

  Write-File 'src/middleware/request-log.ts' @'
/** Logs each HTTP request's method, path, status and duration. */
import type { NextFunction, Request, Response } from 'express';

/** Logs the request once its response finishes. */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}
'@

  Write-File 'src/middleware/error-handler.ts' @'
/** Last Express handlers: 404 for unmatched routes, 500 for unhandled errors. */
import type { NextFunction, Request, Response } from 'express';

/** Answers 404 for any route not matched. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not found' });
}

/** Logs an unhandled error and answers 500. Express 5 also forwards rejected promises from async handlers here. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
}
'@



  Write-File 'src/middleware/auth.ts' @'
/** Firebase ID-token check in front of the GraphQL endpoint (ADR-0015; ADR-0017 item 2). */
import type { NextFunction, Request, Response } from 'express';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getPool } from '../db/pool.js';
import { findUserByFirebaseUid, type AppUser } from '../modules/account/model/user.model.js';

declare global {
  namespace Express {
    interface Request {
      /** The signed-in account, set by requireUser. */
      user?: AppUser;
    }
  }
}

function firebaseAuth() {
  // Credentials come from GOOGLE_APPLICATION_CREDENTIALS, a key file outside the repo (ADR-0015).
  if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
  return getAuth();
}

/**
 * Runs before the GraphQL endpoint (ADR-0015, ADR-0017 item 2): verifies the Firebase ID
 * token, then finds the account keyed to its uid. No valid token: 401. No account: 403.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  if (!match) {
    res.status(401).json({ error: 'missing bearer token' });
    return;
  }

  let uid: string;
  try {
    uid = (await firebaseAuth().verifyIdToken(match[1])).uid;
  } catch {
    res.status(401).json({ error: 'invalid token' });
    return;
  }

  const user = await findUserByFirebaseUid(getPool(), uid);
  if (!user) {
    res.status(403).json({ error: 'no account for this sign-in' });
    return;
  }
  req.user = user;
  next();
}
'@

  Write-File 'src/routes/index.ts' @'
/** Mounts /health and the GraphQL endpoint behind CORS, the rate limit and the token check (ADR-0014, ADR-0015, ADR-0017). */
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { createGraphQLServer } from '../graphql/server.js';
import { requireUser } from '../middleware/auth.js';
import { healthRoutes } from '../modules/health/routes/health.routes.js';

/** Mounts /health and the GraphQL endpoint on the app. */
export function mountRoutes(app: Express): void {
  // Plain probe for the host; not part of the API.
  app.use('/health', healthRoutes);

  // The API: one GraphQL endpoint (ADR-0017). CORS for the frontend's origin only
  // (ADR-0014), then the rate limit, then the token check (ADR-0015), then Yoga.
  const yoga = createGraphQLServer();
  // Yoga's call signatures don't fit Express 5's handler overloads, so it is wrapped.
  const graphql = async (req: Request, res: Response): Promise<void> => {
    await yoga(req, res);
  };
  app.use(
    yoga.graphqlEndpoint,
    cors({ origin: env.frontendOrigin }),
    rateLimit({ windowMs: 60_000, limit: env.rateLimitPerMinute }),
    requireUser,
    graphql,
  );
}
'@

  Write-File 'src/modules/health/controller/health.controller.ts' @'
/** Health probe for the host: answers once the database responds. */
import type { Request, Response } from 'express';
import { getPool } from '../../../db/pool.js';

/** Answers status ok once the database responds to SELECT 1. */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  await getPool().query('SELECT 1');
  res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
}
'@

  Write-File 'src/modules/health/routes/health.routes.ts' @'
/** Route for GET /health. */
import { Router } from 'express';
import { getHealth } from '../controller/health.controller.js';

/** Router for GET /health. */
export const healthRoutes = Router();
healthRoutes.get('/', getHealth);
'@

  Write-File 'src/modules/account/model/user.model.ts' @'
/** Queries on the users table (ADR-0015; sql/0002_users.sql). */
import type { Pool, RowDataPacket } from 'mysql2/promise';

/** An app account, keyed to its Firebase uid (ADR-0015). */
export interface AppUser {
  id: number;
  firebaseUid: string;
  isOperator: boolean;
}

interface UserRow extends RowDataPacket {
  id: number;
  firebase_uid: string;
  is_operator: number;
}

/** Finds the account for a Firebase uid; undefined when there is none. */
export async function findUserByFirebaseUid(pool: Pool, uid: string): Promise<AppUser | undefined> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, firebase_uid, is_operator FROM users WHERE firebase_uid = ?',
    [uid],
  );
  const row = rows[0];
  if (!row) return undefined;
  return { id: row.id, firebaseUid: row.firebase_uid, isOperator: Number(row.is_operator) === 1 };
}
'@


  Write-File 'src/modules/account/graphql/account.graphql.ts' @'
/** GraphQL field `me`: the signed-in account (ADR-0015). */
import { builder } from '../../../graphql/builder.js';
import type { AppUser } from '../model/user.model.js';

const User = builder.objectRef<AppUser>('User').implement({
  description: 'The signed-in account.',
  fields: (t) => ({
    id: t.exposeID('id'),
    isOperator: t.exposeBoolean('isOperator'),
  }),
});

builder.queryField('me', (t) =>
  t.field({
    type: User,
    description: 'The account making this request.',
    resolve: (_root, _args, ctx) => ctx.user,
  }),
);
'@

  # -------------------------------------------------------------------------
  # 5. Source: GraphQL (ADR-0016, ADR-0017)
  # -------------------------------------------------------------------------
  Write-File 'src/graphql/builder.ts' @'
/** Pothos schema builder and the per-request context (ADR-0017 items 1, 8, 11). */
import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import type { AppUser } from '../modules/account/model/user.model.js';

/** Context passed to every resolver. */
export interface GraphQLContext {
  /** Set by the token middleware before the request reaches GraphQL (ADR-0017 item 2). */
  user: AppUser;
}

/**
 * Code-first schema (ADR-0017 item 8). Authorization stays in the services (item 1);
 * the `operator` scope guards the operator fields (item 11).
 */
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: { operator: boolean };
}>({
  plugins: [ScopeAuthPlugin],
  scopeAuth: {
    authScopes: async (ctx) => ({ operator: ctx.user.isOperator }),
  },
});

builder.queryType({});
'@

  Write-File 'src/graphql/schema.ts' @'
/** Assembles the GraphQL schema from every module's fields (ADR-0016). */
import { builder } from './builder.js';
import '../modules/account/graphql/account.graphql.js';
import '../modules/pipeline/graphql/pipeline.graphql.js';

/** The executable schema served at /graphql and printed to schema.graphql. */
export const schema = builder.toSchema();
'@

  Write-File 'src/graphql/print-schema.ts' @'
/** Prints the contract to schema.graphql (ADR-0016 item 1). Commit the file with the change. */
import { writeFileSync } from 'node:fs';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { schema } from './schema.js';

writeFileSync('schema.graphql', `${printSchema(lexicographicSortSchema(schema))}\n`);
console.log('wrote schema.graphql');
'@

  Write-File 'src/graphql/persisted-store.ts' @'
/** Loads the trusted documents the GraphQL endpoint accepts (ADR-0016 item 3). */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Trusted documents (ADR-0016 item 3, ADR-0017 item 9): the frontend's operations from
 * persisted/frontend.json, plus this repo's operator operations, keyed by SHA-256.
 */
export function loadPersistedStore(dir = 'persisted'): Map<string, string> {
  const store = new Map<string, string>();

  const frontendFile = join(dir, 'frontend.json');
  if (existsSync(frontendFile)) {
    const entries = JSON.parse(readFileSync(frontendFile, 'utf8')) as Record<string, string>;
    for (const [hash, document] of Object.entries(entries)) store.set(hash, document);
  }

  const operatorDir = join(dir, 'operator');
  if (existsSync(operatorDir)) {
    for (const file of readdirSync(operatorDir).filter((f) => f.endsWith('.graphql'))) {
      const document = readFileSync(join(operatorDir, file), 'utf8');
      const hash = createHash('sha256').update(document).digest('hex');
      store.set(hash, document);
      console.log(`trusted operator operation ${file}: ${hash}`);
    }
  }
  return store;
}
'@

  Write-File 'src/graphql/server.ts' @'
/** GraphQL Yoga server with trusted documents and operation logging (ADR-0017 items 5, 7, 9). */
import type { Request, Response } from 'express';
import { createYoga, type Plugin } from 'graphql-yoga';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { env } from '../config/env.js';
import type { GraphQLContext } from './builder.js';
import { loadPersistedStore } from './persisted-store.js';
import { schema } from './schema.js';

/**
 * Logs each operation's name and its errors, because GraphQL reports failures inside
 * an HTTP 200 response (ADR-0017 item 5).
 */
const logOperations: Plugin = {
  onExecute({ args }) {
    const name = args.operationName ?? 'anonymous';
    return {
      onExecuteDone({ result }) {
        if (Symbol.asyncIterator in result) return;
        if (result.errors?.length) {
          console.error(`graphql ${name}: ${result.errors.length} error(s)`, result.errors.map((e) => e.message));
        } else {
          console.log(`graphql ${name}: ok`);
        }
      },
    };
  },
};

/** Options for createGraphQLServer. */
export interface GraphQLServerOptions {
  /** Accept operations outside the trusted documents. Default: env (local dev only). */
  allowArbitraryOperations?: boolean;
}

/** GraphQL Yoga mounted on Express (ADR-0017 item 7). Expects req.user to be set. */
export function createGraphQLServer(options: GraphQLServerOptions = {}) {
  const store = loadPersistedStore();
  const allowArbitrary = options.allowArbitraryOperations ?? env.allowArbitraryOperations;

  return createYoga<{ req: Request; res: Response }, GraphQLContext>({
    schema,
    graphqlEndpoint: '/graphql',
    // GraphiQL sends arbitrary operations, which trusted documents refuse.
    graphiql: false,
    // CORS is set by the cors middleware (src/routes/index.ts). Yoga's own CORS, on by
    // default, would overwrite it with whatever origin the request names (ADR-0014).
    cors: false,
    context: ({ req }) => {
      if (!req.user) throw new Error('GraphQL reached without a signed-in user');
      return { user: req.user };
    },
    plugins: [
      usePersistedOperations({
        getPersistedOperation: (key: string) => store.get(key) ?? null,
        allowArbitraryOperations: () => allowArbitrary,
      }),
      logOperations,
    ],
  });
}
'@

  # -------------------------------------------------------------------------
  # 6. Source: pipeline module
  # -------------------------------------------------------------------------
  Write-File 'src/modules/pipeline/model/pipeline.model.ts' @'
/** Queries on ingest_ledger and job_run (ADR-0006; ETL spec §5.3; sql/0001_pipeline_tables.sql). */
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// Timestamps are written with UTC_TIMESTAMP(): DATETIME values are UTC (ETL spec §7.2.2).

// ---- ingest_ledger ---------------------------------------------------------

/** Ledger state of one piece. */
export type LedgerStatus = 'downloading' | 'loaded' | 'failed';

/** One ingest_ledger row: a dataset for one season (season 0 for single files). */
export interface LedgerRow extends RowDataPacket {
  id: number;
  dataset: string;
  season: number;
  source_url: string;
  source_etag: string | null;
  source_last_modified: string | null;
  content_length: number | null;
  status: LedgerStatus;
  rows_loaded: number | null;
  error: string | null;
  started_at: Date;
  finished_at: Date | null;
}

/** The ledger row for one piece, if any. */
export async function findLedger(pool: Pool, dataset: string, season: number): Promise<LedgerRow | undefined> {
  const [rows] = await pool.query<LedgerRow[]>(
    'SELECT * FROM ingest_ledger WHERE dataset = ? AND season = ?',
    [dataset, season],
  );
  return rows[0];
}

/** Every ledger row, by dataset and season. */
export async function listLedger(pool: Pool): Promise<LedgerRow[]> {
  const [rows] = await pool.query<LedgerRow[]>('SELECT * FROM ingest_ledger ORDER BY dataset, season');
  return rows;
}

/** Values written to the ledger for one piece. */
export interface LedgerUpsert {
  dataset: string;
  season: number;
  sourceUrl: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  status: LedgerStatus;
  rowsLoaded?: number | null;
  error?: string | null;
}

/** Inserts or updates a piece's ledger row. Status downloading restarts started_at and clears finished_at. */
export async function upsertLedger(pool: Pool, u: LedgerUpsert): Promise<void> {
  await pool.query(
    `INSERT INTO ingest_ledger
       (dataset, season, source_url, source_etag, source_last_modified, content_length,
        status, rows_loaded, error, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), IF(? = 'downloading', NULL, UTC_TIMESTAMP())) AS new
     ON DUPLICATE KEY UPDATE
       source_url = new.source_url,
       source_etag = new.source_etag,
       source_last_modified = new.source_last_modified,
       content_length = new.content_length,
       status = new.status,
       rows_loaded = new.rows_loaded,
       error = new.error,
       started_at = IF(new.status = 'downloading', UTC_TIMESTAMP(), ingest_ledger.started_at),
       finished_at = IF(new.status = 'downloading', NULL, UTC_TIMESTAMP())`,
    [
      u.dataset,
      u.season,
      u.sourceUrl,
      u.etag,
      u.lastModified,
      u.contentLength,
      u.status,
      u.rowsLoaded ?? null,
      u.error ?? null,
      u.status,
    ],
  );
}

// ---- job_run ---------------------------------------------------------------

/** Kind of pipeline run. */
export type JobKind = 'ingest' | 'backfill';
/** Result of a pipeline run. */
export type JobOutcome = 'running' | 'ok' | 'failed' | 'skipped_locked';

/** One job_run row. */
export interface JobRunRow extends RowDataPacket {
  id: number;
  kind: JobKind;
  started_at: Date;
  finished_at: Date | null;
  outcome: JobOutcome;
  pieces_loaded: number;
  pieces_skipped: number;
  pieces_failed: number;
  error: string | null;
}

/** Pieces loaded, skipped and failed in one run. */
export interface PieceCounts {
  loaded: number;
  skipped: number;
  failed: number;
}

/** Records a new run as running; returns its id. */
export async function startJobRun(pool: Pool, kind: JobKind): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO job_run (kind, started_at) VALUES (?, UTC_TIMESTAMP())',
    [kind],
  );
  return result.insertId;
}

/** Records a run's outcome, counts and any error. */
export async function finishJobRun(
  pool: Pool,
  id: number,
  outcome: JobOutcome,
  counts: PieceCounts,
  error: string | null = null,
): Promise<void> {
  await pool.query(
    `UPDATE job_run
       SET finished_at = UTC_TIMESTAMP(), outcome = ?, pieces_loaded = ?, pieces_skipped = ?, pieces_failed = ?, error = ?
     WHERE id = ?`,
    [outcome, counts.loaded, counts.skipped, counts.failed, error, id],
  );
}

/** The most recent runs, newest first. */
export async function recentJobRuns(pool: Pool, limit = 20): Promise<JobRunRow[]> {
  const [rows] = await pool.query<JobRunRow[]>(
    'SELECT * FROM job_run ORDER BY id DESC LIMIT ?',
    [limit],
  );
  return rows;
}
'@


  Write-File 'src/modules/pipeline/graphql/pipeline.graphql.ts' @'
/** Operator-only GraphQL fields pipelineRuns and ingestLedger (ADR-0017 item 11). */
import { getPool } from '../../../db/pool.js';
import { builder } from '../../../graphql/builder.js';
import { listLedger, recentJobRuns, type JobRunRow, type LedgerRow } from '../model/pipeline.model.js';

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

const JobRun = builder.objectRef<JobRunRow>('JobRun').implement({
  description: 'One pipeline run (job_run).',
  fields: (t) => ({
    id: t.exposeInt('id'),
    kind: t.exposeString('kind'),
    startedAt: t.string({ resolve: (r) => r.started_at.toISOString() }),
    finishedAt: t.string({ nullable: true, resolve: (r) => iso(r.finished_at) }),
    outcome: t.exposeString('outcome'),
    piecesLoaded: t.exposeInt('pieces_loaded'),
    piecesSkipped: t.exposeInt('pieces_skipped'),
    piecesFailed: t.exposeInt('pieces_failed'),
    error: t.exposeString('error', { nullable: true }),
  }),
});

const LedgerEntry = builder.objectRef<LedgerRow>('IngestLedgerEntry').implement({
  description: 'One loaded piece: a dataset for one season (ingest_ledger).',
  fields: (t) => ({
    dataset: t.exposeString('dataset'),
    season: t.exposeInt('season', { description: '0 for single-file datasets' }),
    sourceUrl: t.exposeString('source_url'),
    sourceEtag: t.exposeString('source_etag', { nullable: true }),
    sourceLastModified: t.exposeString('source_last_modified', { nullable: true }),
    contentLength: t.float({ nullable: true, resolve: (r) => (r.content_length === null ? null : Number(r.content_length)) }),
    status: t.exposeString('status'),
    rowsLoaded: t.exposeInt('rows_loaded', { nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    startedAt: t.string({ resolve: (r) => r.started_at.toISOString() }),
    finishedAt: t.string({ nullable: true, resolve: (r) => iso(r.finished_at) }),
  }),
});

builder.queryFields((t) => ({
  pipelineRuns: t.field({
    type: [JobRun],
    description: 'Most recent pipeline runs, newest first. Operator accounts only.',
    authScopes: { operator: true },
    args: { limit: t.arg.int({ defaultValue: 20, description: '1 to 100' }) },
    resolve: (_root, args) => recentJobRuns(getPool(), Math.min(Math.max(args.limit ?? 20, 1), 100)),
  }),
  ingestLedger: t.field({
    type: [LedgerEntry],
    description: 'Every ledger piece. Operator accounts only.',
    authScopes: { operator: true },
    resolve: () => listLedger(getPool()),
  }),
}));
'@

  Write-File 'src/modules/pipeline/service/datasets.ts' @'
/**
 * nflverse dataset registry: the Phase 1 datasets (ETL spec D2) plus the team file (D9a).
 * Weekly rosters are not loaded (D2).
 *
 * Each entry names one published release file per season (or one file in total).
 * `scope` decides which seasons are loaded and kept:
 *   history        - 2022..current, backfilled once (ADR-0006)
 *   current_season - current season only; the previous season is removed (ADR-0013)
 *   single_file    - one file covering all seasons, replaced whole
 * `rollover` decides when a seasonal dataset moves to the new season (D6):
 *   march_15       - season rosters
 *   season_opener  - everything else: the Wednesday after Labor Day (default)
 *
 * Order matters: datasets load in this order, and `team` comes first because every
 * team-code column has a foreign key to it (ETL spec §7.2). `team` loads by upsert,
 * since MySQL rejects deleting a team row that other tables still reference.
 *
 * `table` and `columns` are the hand-written mapping (ADR-0010) from CSV header to
 * MySQL column. A dataset without them is skipped by the loader. Run
 * `npm run headers -- --dataset <name>` to list a dataset's columns; table and column
 * names follow the ETL spec §7.2 and its data dictionary.
 *
 * File paths from the ETL spec §4.1.
 */

/** Which seasons a dataset loads and keeps; see the header above. */
export type DatasetScope = 'history' | 'current_season' | 'single_file';
/** When a seasonal dataset switches to the new season (D6). */
export type SeasonRollover = 'march_15' | 'season_opener';

/** Target column name, or a column plus a cast from the CSV string. */
export type ColumnSpec = string | { to: string; cast?: (value: string) => unknown };

/** One nflverse dataset and its hand-written mapping. */
export interface DatasetDef {
  name: string;
  scope: DatasetScope;
  /** When the dataset switches to a new season (D6). Default: season_opener. */
  rollover?: SeasonRollover;
  /** Path under RELEASE_BASE; `season` is ignored for single-file datasets. */
  path: (season: number) => string;
  /** True when the file is gzip-compressed. */
  gzip?: boolean;
  /** 'upsert': insert new rows and update existing ones, delete none (the team table). */
  replace?: 'upsert';
  /** MySQL table to load into. Required for loading. */
  table?: string;
  /** CSV column holding the season (history datasets only). Default "season". */
  seasonColumn?: string;
  /** CSV header -> MySQL column. Required for loading. */
  columns?: Record<string, ColumnSpec>;
}

/** Base URL of nflverse release files. */
export const RELEASE_BASE = 'https://github.com/nflverse/nflverse-data/releases/download';

/** Every dataset, in load order. */
export const datasets: DatasetDef[] = [
  // Loaded first: every team-code column has a foreign key to it (D9a; ETL spec §7.2).
  { name: 'teams', scope: 'single_file', replace: 'upsert', path: () => 'teams/teams_colors_logos.csv' },

  // Weekly player and team stat lines (nflfastR::calculate_stats). Every season from 2022.
  { name: 'stats_player_week', scope: 'history', path: (s) => `stats_player/stats_player_week_${s}.csv` },
  { name: 'stats_team_week', scope: 'history', path: (s) => `stats_team/stats_team_week_${s}.csv` },

  // Season rosters: the new season is published from March 15 (D6).
  { name: 'rosters', scope: 'history', rollover: 'march_15', path: (s) => `rosters/roster_${s}.csv` },

  // Snap counts and official injury reports.
  { name: 'snap_counts', scope: 'history', path: (s) => `snap_counts/snap_counts_${s}.csv` },
  { name: 'injuries', scope: 'history', path: (s) => `injuries/injuries_${s}.csv` },

  // Single files covering all seasons. Player and game references carry no database
  // foreign key (ETL spec §7.2), so these two are replaced whole.
  { name: 'schedules', scope: 'single_file', path: () => 'schedules/games.csv' },
  { name: 'players', scope: 'single_file', path: () => 'players/players.csv' },

  // Current season only (ADR-0013). Play-by-play uses the gzip file.
  { name: 'depth_charts', scope: 'current_season', path: (s) => `depth_charts/depth_charts_${s}.csv` },
  { name: 'pbp', scope: 'current_season', path: (s) => `pbp/play_by_play_${s}.csv.gz`, gzip: true },

  // Shape of a mapped dataset (illustration only; columns keep nflverse's names, §7.2.2):
  // {
  //   name: 'schedules', scope: 'single_file', path: () => 'schedules/games.csv',
  //   table: 'game',
  //   columns: {
  //     game_id: 'game_id',
  //     season: { to: 'season', cast: Number },
  //     week: { to: 'week', cast: Number },
  //     gameday: 'gameday',
  //     home_team: 'home_team',
  //     away_team: 'away_team',
  //   },
  // },
];

/** The dataset with this name, if any. */
export function findDataset(name: string): DatasetDef | undefined {
  return datasets.find((d) => d.name === name);
}
'@

  Write-File 'src/modules/pipeline/service/season.ts' @'
/** Current-season rule (ETL spec D6) and the seasons each run loads (ADR-0006, ADR-0013). */
import { env } from '../../../config/env.js';
import type { DatasetDef, SeasonRollover } from './datasets.js';
import type { JobKind } from '../model/pipeline.model.js';

/** Ledger season used for single-file datasets. */
export const SINGLE_FILE_SEASON = 0;

/** Today's calendar date as YYYY-MM-DD in the pipeline's time zone. */
function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The Wednesday after Labor Day (the first Monday of September), as YYYY-MM-DD. */
export function seasonOpenerSwitch(year: number): string {
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const toMonday = (1 - septemberFirst.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, 8, 1 + toMonday + 2)).toISOString().slice(0, 10);
}

/**
 * The NFL season a dataset should treat as current (ETL spec D6): the season in progress
 * on today's date. Between seasons, rosters switch on March 15 and every other seasonal
 * dataset on the Wednesday after Labor Day, as nflverse publishes them. CURRENT_SEASON
 * overrides the rule.
 */
export function currentSeason(rollover: SeasonRollover = 'season_opener', now: Date = new Date()): number {
  if (env.currentSeasonOverride) return env.currentSeasonOverride;
  const today = todayIn(env.timezone, now);
  const year = Number(today.slice(0, 4));
  const switchDate = rollover === 'march_15' ? `${year}-03-15` : seasonOpenerSwitch(year);
  return today >= switchDate ? year : year - 1;
}

/** Season range for a backfill. */
export interface SeasonRange {
  from: number;
  /** Default: the dataset's current season. */
  to?: number;
}

/**
 * Which seasons a run loads for a dataset (ADR-0006, ADR-0013).
 * Scheduled ingest: current season only; the file for a season holds every week, so
 * stat corrections are covered by re-reading the current season's file.
 * Backfill: the full history range for history datasets.
 */
export function seasonsToLoad(def: DatasetDef, kind: JobKind, range?: SeasonRange): number[] {
  const current = currentSeason(def.rollover);
  switch (def.scope) {
    case 'single_file':
      return [SINGLE_FILE_SEASON];
    case 'current_season':
      return [current];
    case 'history': {
      if (kind === 'ingest') return [current];
      const from = range?.from ?? env.historyStartSeason;
      const to = range?.to ?? current;
      const seasons: number[] = [];
      for (let s = from; s <= to; s++) seasons.push(s);
      return seasons;
    }
  }
}
'@

  Write-File 'src/modules/pipeline/service/nflverse.service.ts' @'
/** Reads nflverse release files over HTTPS (ETL spec §4.1). */
import { Readable, pipeline } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import { parse } from 'csv-parse';
import { RELEASE_BASE, type DatasetDef } from './datasets.js';

// Generic client name; never put personal details here.
const USER_AGENT = 'runpure-ff-pipeline';

/** Version headers of a release file, compared with the ledger to skip unchanged files. */
export interface SourceVersion {
  url: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
}

/** Full download URL of a dataset's file for one season. */
export function sourceUrl(def: DatasetDef, season: number): string {
  return `${RELEASE_BASE}/${def.path(season)}`;
}

/**
 * Version check without downloading. GitHub redirects release assets to a storage host;
 * fetch follows the redirect. Whether that host returns ETag and Last-Modified is to be
 * verified at build (ETL spec §4.2); without them every run reloads the piece.
 */
export async function headSource(url: string): Promise<SourceVersion> {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HEAD ${url} -> HTTP ${res.status}`);
  const length = res.headers.get('content-length');
  return {
    url,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
    contentLength: length === null ? null : Number(length),
  };
}

/**
 * Streams a CSV from its URL and yields one object per row (header -> string value).
 * Nothing is held in memory beyond the current parser buffers (ADR-0008: jobs share the
 * API process, so files are never loaded whole).
 */
export async function openCsv(url: string, gzip = false): Promise<AsyncIterable<Record<string, string>>> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`GET ${url} -> HTTP ${res.status}`);

  const source = Readable.fromWeb(res.body as unknown as WebReadableStream);
  const parser = parse({
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  // pipeline, unlike pipe, passes a download or gunzip error on to the parser, so the
  // caller's loop over rows fails (and the run lock is released) instead of waiting forever.
  const ignore = (): void => {};
  if (gzip) pipeline(source, createGunzip(), parser, ignore);
  else pipeline(source, parser, ignore);
  return parser as unknown as AsyncIterable<Record<string, string>>;
}
'@

  Write-File 'src/modules/pipeline/service/load.service.ts' @'
/** Loads one piece through a staging table (ADR-0006; ETL spec §5.3). */
import type { Pool } from 'mysql2/promise';
import { env } from '../../../config/env.js';
import type { ColumnSpec, DatasetDef } from './datasets.js';

/** CSV tokens treated as NULL. nflverse files are written from R, which uses "NA". */
const NULL_TOKENS = new Set(['', 'NA']);

/** Converts one CSV value: NULL tokens to null, then the optional cast. */
function convert(value: string | undefined, spec: ColumnSpec): unknown {
  if (value === undefined || NULL_TOKENS.has(value)) return null;
  if (typeof spec === 'string') return value;
  return spec.cast ? spec.cast(value) : value;
}

/** Quotes a MySQL identifier. */
const id = (name: string): string => `\`${name.replace(/`/g, '``')}\``;

/**
 * Loads one piece (dataset x season) into its table:
 *   1. rows stream into `<table>__staging` in batches;
 *   2. one transaction deletes the rows being replaced and copies staging in, or, for
 *      an upsert dataset (the team table), inserts new rows and updates existing ones;
 *   3. staging is dropped.
 * A crash before step 2 leaves the target untouched; the next run drops the leftover
 * staging table and starts again (ADR-0006).
 */
export async function loadPiece(
  pool: Pool,
  def: DatasetDef,
  season: number,
  records: AsyncIterable<Record<string, string>>,
): Promise<number> {
  if (!def.table || !def.columns) {
    throw new Error(`dataset ${def.name} has no table/columns mapping`);
  }
  const table = def.table;
  const columns = def.columns;
  const staging = `${table}__staging`;
  const csvColumns = Object.keys(columns);
  const targetColumns = csvColumns.map((c) => {
    const spec = columns[c];
    return typeof spec === 'string' ? spec : spec.to;
  });
  const seasonColumn = def.seasonColumn ?? 'season';

  const conn = await pool.getConnection();
  try {
    await conn.query('DROP TABLE IF EXISTS ??', [staging]);
    await conn.query('CREATE TABLE ?? LIKE ??', [staging, table]);

    let batch: unknown[][] = [];
    let total = 0;
    const flush = async (): Promise<void> => {
      if (batch.length === 0) return;
      await conn.query('INSERT INTO ?? (??) VALUES ?', [staging, targetColumns, batch]);
      total += batch.length;
      batch = [];
    };

    for await (const record of records) {
      batch.push(csvColumns.map((c) => convert(record[c], columns[c])));
      if (batch.length >= env.loadBatchSize) await flush();
    }
    await flush();

    await conn.beginTransaction();
    try {
      if (def.replace === 'upsert') {
        // Nothing is deleted: other tables' foreign keys still reference these rows.
        const updates = targetColumns.map((c) => `${id(c)} = s.${id(c)}`).join(', ');
        const cols = targetColumns.map(id).join(', ');
        await conn.query(
          `INSERT INTO ${id(table)} (${cols}) SELECT ${cols} FROM ${id(staging)} AS s ON DUPLICATE KEY UPDATE ${updates}`,
        );
        await conn.commit();
        await conn.query('DROP TABLE IF EXISTS ??', [staging]);
        return total;
      }
      if (def.scope === 'history') {
        await conn.query('DELETE FROM ?? WHERE ?? = ?', [table, seasonColumn, season]);
      } else {
        // single_file: whole table replaced; current_season: previous season removed (ADR-0013)
        await conn.query('DELETE FROM ??', [table]);
      }
      await conn.query('INSERT INTO ?? (??) SELECT ?? FROM ??', [table, targetColumns, targetColumns, staging]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    await conn.query('DROP TABLE IF EXISTS ??', [staging]);
    return total;
  } finally {
    conn.release();
  }
}
'@

  Write-File 'src/modules/pipeline/service/ingest.service.ts' @'
/** One pipeline run: lock, ledger, piece-by-piece load (ADR-0006). */
import { getPool } from '../../../db/pool.js';
import { releaseLock, tryAcquireLock } from '../../../db/lock.js';
import {
  findLedger,
  finishJobRun,
  startJobRun,
  upsertLedger,
  type JobKind,
  type JobOutcome,
} from '../model/pipeline.model.js';
import { datasets } from './datasets.js';
import { loadPiece } from './load.service.js';
import { headSource, openCsv, sourceUrl } from './nflverse.service.js';
import { seasonsToLoad, type SeasonRange } from './season.js';

/** What one run loads. */
export interface RunOptions {
  kind: JobKind;
  /** Limit to these dataset names. Default: all. */
  datasets?: string[];
  /** Backfill season range. Default: HISTORY_START_SEASON..each dataset's current season. */
  range?: SeasonRange;
  /** Reload even when the source ETag is unchanged. */
  force?: boolean;
}

/** What one run did, for logs and the CLI. */
export interface RunSummary {
  jobRunId: number | null;
  outcome: JobOutcome;
  loaded: number;
  skipped: number;
  failed: number;
  details: string[];
}

/**
 * One pipeline run: take the run lock, record a job_run, then for every selected
 * dataset x season: check the source version, skip if unchanged, otherwise stream it
 * into MySQL and record the ledger row. A failed piece is recorded and the run goes on;
 * the next run retries it (ADR-0006).
 */
export async function runPipeline(opts: RunOptions): Promise<RunSummary> {
  const pool = getPool();
  const summary: RunSummary = { jobRunId: null, outcome: 'running', loaded: 0, skipped: 0, failed: 0, details: [] };

  const lockConn = await pool.getConnection();
  try {
    if (!(await tryAcquireLock(lockConn))) {
      const id = await startJobRun(pool, opts.kind);
      await finishJobRun(pool, id, 'skipped_locked', summary);
      summary.jobRunId = id;
      summary.outcome = 'skipped_locked';
      summary.details.push('another run holds the pipeline lock; exiting');
      return summary;
    }

    summary.jobRunId = await startJobRun(pool, opts.kind);
    const selected = datasets.filter((d) => !opts.datasets || opts.datasets.includes(d.name));

    for (const def of selected) {
      if (!def.table || !def.columns) {
        summary.skipped++;
        summary.details.push(`${def.name}: no table/columns mapping yet, skipped`);
        continue;
      }

      for (const season of seasonsToLoad(def, opts.kind, opts.range)) {
        const label = `${def.name} ${season === 0 ? 'all' : season}`;
        const url = sourceUrl(def, season);
        try {
          const version = await headSource(url);
          const previous = await findLedger(pool, def.name, season);
          const unchanged =
            !opts.force &&
            previous?.status === 'loaded' &&
            previous.source_etag !== null &&
            previous.source_etag === version.etag;
          if (unchanged) {
            summary.skipped++;
            summary.details.push(`${label}: unchanged (etag ${version.etag}), skipped`);
            continue;
          }

          const base = {
            dataset: def.name,
            season,
            sourceUrl: url,
            etag: version.etag,
            lastModified: version.lastModified,
            contentLength: version.contentLength,
          };
          await upsertLedger(pool, { ...base, status: 'downloading' });
          const records = await openCsv(url, def.gzip);
          const rows = await loadPiece(pool, def, season, records);
          await upsertLedger(pool, { ...base, status: 'loaded', rowsLoaded: rows, error: null });

          summary.loaded++;
          summary.details.push(`${label}: loaded ${rows} rows`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          summary.failed++;
          summary.details.push(`${label}: FAILED ${message}`);
          await upsertLedger(pool, {
            dataset: def.name,
            season,
            sourceUrl: url,
            etag: null,
            lastModified: null,
            contentLength: null,
            status: 'failed',
            error: message,
          }).catch((e) => console.error('could not record failure in ledger', e));
        }
      }
    }

    summary.outcome = summary.failed > 0 ? 'failed' : 'ok';
    await finishJobRun(pool, summary.jobRunId, summary.outcome, summary);
    return summary;
  } finally {
    await releaseLock(lockConn).catch(() => undefined);
    lockConn.release();
  }
}
'@

  # -------------------------------------------------------------------------
  # 7. Source: scheduler and job entry points
  # -------------------------------------------------------------------------
  Write-File 'src/scheduler/index.ts' @'
/** In-process schedule for the daily ingest run (ADR-0008; ETL spec D7, D12). */
import { schedule, validate, type ScheduledTask } from 'node-cron';
import { env } from '../config/env.js';
import { runPipeline } from '../modules/pipeline/service/ingest.service.js';

/**
 * In-process scheduler (ADR-0008; node-cron, ETL spec D12). It only holds schedules and
 * calls the ingest entry point, so moving jobs to a separate worker later means starting
 * the same entry point elsewhere. Overlap between runs is prevented by the MySQL run
 * lock, not here. Default: one run a day at 06:00 Eastern (D7).
 */
let stopping = false;
const tasks: ScheduledTask[] = [];

/** Starts one cron task per PIPELINE_CRON expression; throws on an invalid expression. */
export function startScheduler(): void {
  for (const expression of env.cronSchedules) {
    if (!validate(expression)) throw new Error(`invalid cron expression in PIPELINE_CRON: "${expression}"`);
    const task = schedule(
      expression,
      async () => {
        if (stopping) return;
        try {
          const summary = await runPipeline({ kind: 'ingest' });
          console.log(`scheduled ingest: job_run ${summary.jobRunId} ${summary.outcome} (loaded ${summary.loaded}, skipped ${summary.skipped}, failed ${summary.failed})`);
        } catch (err) {
          console.error('scheduled ingest crashed', err);
        }
      },
      { timezone: env.timezone },
    );
    tasks.push(task);
    console.log(`scheduled ingest: "${expression}" (${env.timezone})`);
  }
}

/** Stops every task. A run already in progress finishes; no new run starts. */
export function stopScheduler(): void {
  stopping = true;
  for (const task of tasks) task.stop();
}
'@

  Write-File 'src/jobs/ingest.ts' @'
/** Entry point: one incremental run now. Usage: npm run ingest -- [--dataset name]... [--force] */
import { parseArgs } from 'node:util';
import { closePool } from '../db/pool.js';
import { runPipeline } from '../modules/pipeline/service/ingest.service.js';

const { values } = parseArgs({
  options: {
    dataset: { type: 'string', multiple: true },
    force: { type: 'boolean', default: false },
  },
});

const summary = await runPipeline({ kind: 'ingest', datasets: values.dataset, force: values.force ?? false });
for (const line of summary.details) console.log(line);
console.log(`job_run ${summary.jobRunId}: ${summary.outcome} (loaded ${summary.loaded}, skipped ${summary.skipped}, failed ${summary.failed})`);
await closePool();
process.exitCode = summary.outcome === 'failed' ? 1 : 0;
'@

  Write-File 'src/jobs/backfill.ts' @'
/**
 * Entry point: the one-time history load (ADR-0006). Runs from the command line, never
 * from the scheduler. Resumable: pieces already loaded with an unchanged ETag are skipped.
 * Usage: npm run backfill -- [--from 2022] [--to 2026] [--dataset name]... [--force]
 * Without --to, each dataset loads up to its own current season (D6).
 */
import { parseArgs } from 'node:util';
import { closePool } from '../db/pool.js';
import { runPipeline } from '../modules/pipeline/service/ingest.service.js';
import { env } from '../config/env.js';

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    to: { type: 'string' },
    dataset: { type: 'string', multiple: true },
    force: { type: 'boolean', default: false },
  },
});

const from = values.from ? Number(values.from) : env.historyStartSeason;
const to = values.to ? Number(values.to) : undefined;
if (!Number.isInteger(from) || (to !== undefined && (!Number.isInteger(to) || from > to))) {
  throw new Error(`invalid season range ${from}..${to ?? 'current'}`);
}

console.log(`backfill ${from}..${to ?? 'current season'}`);
const summary = await runPipeline({ kind: 'backfill', datasets: values.dataset, range: { from, to }, force: values.force ?? false });
for (const line of summary.details) console.log(line);
console.log(`job_run ${summary.jobRunId}: ${summary.outcome} (loaded ${summary.loaded}, skipped ${summary.skipped}, failed ${summary.failed})`);
await closePool();
process.exitCode = summary.outcome === 'failed' ? 1 : 0;
'@

  Write-File 'src/jobs/headers.ts' @'
/**
 * Mapping aid: prints each dataset's CSV columns with a sample value, reading only the
 * first row of the current season's file. No database needed.
 * Usage: npm run headers -- [--dataset name]...
 */
import { parseArgs } from 'node:util';
import { datasets } from '../modules/pipeline/service/datasets.js';
import { openCsv, sourceUrl } from '../modules/pipeline/service/nflverse.service.js';
import { currentSeason, SINGLE_FILE_SEASON } from '../modules/pipeline/service/season.js';

const { values } = parseArgs({ options: { dataset: { type: 'string', multiple: true } } });
const selected = datasets.filter((d) => !values.dataset || values.dataset.includes(d.name));

for (const def of selected) {
  const url = sourceUrl(def, def.scope === 'single_file' ? SINGLE_FILE_SEASON : currentSeason(def.rollover));
  console.log(`\n== ${def.name}\n   ${url}`);
  try {
    const records = await openCsv(url, def.gzip);
    for await (const record of records) {
      const columns = Object.keys(record);
      console.log(`   ${columns.length} columns`);
      for (const c of columns) console.log(`   ${c} = ${record[c]}`);
      break;
    }
  } catch (err) {
    console.error(`   could not read: ${err instanceof Error ? err.message : String(err)}`);
  }
}
'@

  Write-File 'src/jobs/spike-yoga.ts' @'
/**
 * ADR-0017 item 7: the first build step is a spike proving GraphQL Yoga runs on this
 * Express 5 app; if it fails, the fallback is Apollo Server 5 with @as-integrations/express5.
 * Mounts Yoga on Express 5 with a stand-in user (no Firebase, no database), sends one
 * real HTTP request, and reports the result. Usage: npm run spike
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AddressInfo } from 'node:net';
import { createGraphQLServer } from '../graphql/server.js';
import '../middleware/auth.js'; // declares req.user

function standInUser(req: Request, _res: Response, next: NextFunction): void {
  req.user = { id: 0, firebaseUid: 'spike', isOperator: false };
  next();
}

const app = express();
const yoga = createGraphQLServer({ allowArbitraryOperations: true });
// Wrapped as in src/routes/index.ts: Yoga's call signatures don't fit Express 5's overloads.
app.use(yoga.graphqlEndpoint, standInUser, async (req: Request, res: Response) => {
  await yoga(req, res);
});

const server = app.listen(0);
await new Promise<void>((resolve) => server.once('listening', () => resolve()));
const { port } = server.address() as AddressInfo;

try {
  const res = await fetch(`http://127.0.0.1:${port}${yoga.graphqlEndpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ me { id isOperator } }' }),
  });
  const body = (await res.json()) as { data?: { me?: { id: string } }; errors?: unknown };
  if (res.status === 200 && body.data?.me?.id === '0') {
    console.log('SPIKE PASSED: GraphQL Yoga answered through Express 5.', JSON.stringify(body));
  } else {
    console.error(`SPIKE FAILED: HTTP ${res.status}`, JSON.stringify(body));
    process.exitCode = 1;
  }
} finally {
  server.close();
}
'@

  # -------------------------------------------------------------------------
  # 8. Code-repo kit, .env, npm install, schema, typecheck, Docker
  # -------------------------------------------------------------------------
  # The kit's AGENTS.md, CLAUDE.md, pull-request template, planning-refs workflow and
  # script sit next to this script in runpure-ff-planning/code-repo-kit.
  foreach ($item in 'AGENTS.md', 'CLAUDE.md', '.github', 'scripts') {
    $source = Join-Path $KitDir $item
    if (Test-Path $source) {
      Copy-Item $source -Destination $Root -Recurse -Force
      Write-Host "  copied $item from code-repo-kit"
    }
    else {
      Write-Warning "code-repo-kit item '$item' not found next to this script; copy it by hand."
    }
  }

  # .env gets random local passwords (letters and digits, safe inside DATABASE_URL),
  # so docker compose never starts with the placeholder values.
  if (-not (Test-Path (Join-Path $Root '.env'))) {
    function New-LocalPassword { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ }) }
    $rootPassword = New-LocalPassword
    $appPassword = New-LocalPassword
    $envText = (Get-Content (Join-Path $Root '.env.example') -Raw) `
      -replace 'MYSQL_ROOT_PASSWORD=change-me-root', "MYSQL_ROOT_PASSWORD=$rootPassword" `
      -replace 'MYSQL_PASSWORD=change-me', "MYSQL_PASSWORD=$appPassword" `
      -replace 'mysql://runpure:change-me@', "mysql://runpure:$appPassword@"
    [System.IO.File]::WriteAllText((Join-Path $Root '.env'), $envText, [System.Text.UTF8Encoding]::new($false))
    Write-Host '  wrote .env (from .env.example, with generated MySQL passwords)'
  }

  if (-not $SkipInstall) {
    Write-Host 'Installing npm packages...'
    & npm install express@5 mysql2 csv-parse node-cron dotenv graphql graphql-yoga@6 '@graphql-yoga/plugin-persisted-operations' '@pothos/core' '@pothos/plugin-scope-auth' firebase-admin cors express-rate-limit
    if ($LASTEXITCODE -ne 0) { throw 'npm install (dependencies) failed' }
    # typescript ~6.0: typescript-eslint doesn't support TypeScript 7 yet (peer range below 6.1).
    & npm install --save-dev 'typescript@~6.0' tsx '@types/node' '@types/express' '@types/cors' eslint '@typescript-eslint/parser' eslint-plugin-jsdoc
    if ($LASTEXITCODE -ne 0) { throw 'npm install (dev dependencies) failed' }

    Write-Host 'Printing schema.graphql...'
    & npm run schema
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Printing the schema failed. Review the output above.' }

    Write-Host 'Linting...'
    & npm run lint
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Lint reported errors. Review the output above.' }

    Write-Host 'Type-checking...'
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Type-check reported errors. Review the output above.' }
    else { Write-Host 'Type-check passed.' }
  }

  $mysqlStarted = $false
  if ($hasDocker -and -not $NoDocker) {
    Write-Host 'Starting local MySQL (docker compose up -d)...'
    & docker compose up -d
    if ($LASTEXITCODE -eq 0) { $mysqlStarted = $true }
    else { Write-Warning 'docker compose failed. Is Docker Desktop running? Start it and run "docker compose up -d" in the repo.' }
  }
}
finally {
  Pop-Location
}

# ---------------------------------------------------------------------------
# 9. What remains to be done by hand
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host " Backend initialized at $Root" -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Next steps (not done by this script):'
Write-Host '  1. npm run spike   -> must print SPIKE PASSED (Yoga on Express 5, ADR-0017 item 7).'
Write-Host '     If it fails, stop: the fallback is Apollo Server 5 (ADR-0017).'
if (-not $mysqlStarted) {
  Write-Host '  2. Start Docker Desktop, then in the repo:  docker compose up -d'
}
else {
  Write-Host '  2. MySQL is starting in Docker (container runpure-mysql, port 3306).'
}
Write-Host '  3. Connect to 127.0.0.1:3306 with MYSQL_USER / MYSQL_PASSWORD from .env (database runpure),'
Write-Host '     e.g. in MySQL Workbench, and run sql\0001_pipeline_tables.sql and sql\0002_users.sql.'
Write-Host '  4. Firebase: create the project, download a service-account key to a folder OUTSIDE'
Write-Host '     this repo, and set GOOGLE_APPLICATION_CREDENTIALS in .env to its path.'
Write-Host '  5. npm run headers            -> see each dataset''s columns'
Write-Host '  6. For each dataset: write its CREATE TABLE in sql\000N_*.sql (ETL spec 7.2 and data'
Write-Host '     dictionary), apply it, then fill table + columns in src\modules\pipeline\service\datasets.ts.'
Write-Host '  7. npm run ingest -- --dataset <name>   -> first load; then npm run backfill'
Write-Host '  8. git add -A && git commit -m "Initialize backend" (commit schema.graphql too).'
Write-Host '     On GitHub: add the PLANNING_REPO_TOKEN secret and protect main (code-repo-kit/README.md).'
Write-Host ''
