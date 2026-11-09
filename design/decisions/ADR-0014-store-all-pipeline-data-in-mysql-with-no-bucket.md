# ADR-0014: Store all pipeline data in MySQL, with no object storage bucket

**Status:** Accepted
**Date:** 2026-11-06
**Deciders:** William Sanchez

## Context

[ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md) put raw downloads and dated copies in an object storage bucket, and used MySQL for everything else. With no transform library ([ADR-0013](ADR-0013-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md)), the pipeline downloads each source file, parses it, and loads the result straight into MySQL.

- **nflverse data** can be downloaded again at any time, so a saved raw copy only means we could rebuild without downloading again.
- **The Sleeper player list** returns only the current state. The dated copies required by [ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md) are the only record of past days.

## Decision

**Use no object storage bucket: don't keep raw downloads, and keep ADR-0004's dated Sleeper player-list copies as rows in MySQL.** MySQL remains the only database, holding:

1. The app-ready tables the Next.js app queries.
2. The ingest ledger and the run lock from [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md).
3. User accounts and every account-owned row ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).
4. The dated Sleeper player-list copies ([ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md)).

## Options Considered

### Option A — MySQL only (chosen)
| Dimension | Assessment |
|---|---|
| Services to run | One (MySQL) |
| Rebuilding loaded data | Download again from the sources |
| Sleeper player-list history | Kept, as dated rows in MySQL |
| Storage growth | All in MySQL, including the dated copies |

### Option B — Bucket plus MySQL, as in ADR-0010 (not chosen)
Keeps raw downloads so the database can be rebuilt without downloading again. Adds a second storage service and provider that the pipeline doesn't otherwise need.

## Consequences

**Easier:** one storage service and one provider; no file layout or bucket permissions to manage.
**Harder / to revisit:**
- No saved raw files: a load error is fixed by downloading from the source again.
- The dated Sleeper copies grow MySQL's storage. ADR-0004 estimates about 1.8 GB a year before compression if each full list is kept.
- ADR-0004's confirmation ("one dated file per pull") is met by one dated set of rows per pull.

## Relationship to other decisions

- **Supersedes** [ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md) in full, restating its MySQL decision unchanged and removing the bucket.
- **Changes where** [ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md)'s dated copies are kept: in MySQL. ADR-0004's decision is unchanged.
- **Keeps** [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)'s run lock and ingest ledger in MySQL.
- **Follows from** [ADR-0013](ADR-0013-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) (files are parsed and loaded directly).
