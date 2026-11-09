# Runpure FF — Relational SQL vs. Vector Databases

**Comprehensive comparative research and architectural implementation report**  
**Prepared:** November 7, 2026  
**Public-implementation review window:** November 2024–November 2026  
**Project:** Runpure FF (fantasy-football player explorer and prospective matchup-analysis platform)  
**Status:** Independent assessment; the recommendations below are **proposals**, not accepted Runpure FF architecture decisions.

> **How to read:** Every report section is an accordion, **collapsed by default**. Select a linked heading in the table of contents and expand its section. The table of contents uses explicit HTML anchors for compatibility with GitHub-style Markdown renderers. Some plain-text Markdown viewers do not support interactive `<details>` elements; the underlying content remains in the file.

## Table of contents

1. [Executive summary and recommendation](#executive-summary)
2. [Scope, methodology, and evidence quality](#methodology)
3. [What is being compared: three real architectural choices](#architectural-choices)
4. [Side-by-side decision matrix](#comparison-matrix)
5. [Tools, frameworks, and developer ecosystem](#tools-frameworks)
6. [Initial implementation complexity and maintainability](#implementation-maintenance)
7. [Memory, disk, and capacity planning](#memory-storage)
8. [Speed, efficiency, and correctness](#performance)
9. [Hosting cost and total cost of ownership](#hosting-cost)
10. [Pitfalls, reliability, security, and data quality](#pitfalls)
11. [Benefits and affordances: Phase 1 to multimodal](#benefits-roadmap)
12. [API applicability and response design](#api-design)
13. [ETL-to-frontend workflows: relational vs. hybrid vector](#etl-workflows)
14. [Public adoption and implementation trends, 2024–2026](#trends)
15. [Runpure FF fit, decisions, and proposed experiments](#recommendations)
16. [Source review: authoritative references and direct links](#references)

---

<a id="executive-summary"></a>
<details>
<summary><strong>1. Executive summary and recommendation</strong></summary>

**Conclusion:** Relational SQL and vector databases solve different problems. Runpure FF should keep **MySQL as the operational system of record** for players, teams, schedules, weekly stats, identity mappings, user data, league ownership, and the ingestion ledger. A dedicated vector database is **not required for Phase 1** and would not replace MySQL's role. For future analytics, use reproducible feature tables and benchmark **exact statistical similarity** before introducing a vector index. [R1–R5; V1–V3]

The most promising future vector-related use cases are **historical player analogs, comparable game situations, injury/news similarity, semantic document search, recommendations, and image/video-based retrieval**. These are retrieval applications; *predicting next week's fantasy points* is a separate statistical/ML evaluation problem. Similarity may become an input to forecasts or a way to explain them, but should not be mistaken for a forecasting model.

Three implementation paths should be kept distinct:

| Path | Summary | Phase 1 fit | Later fit |
|---|---|---|---|
| **A. MySQL only** | Conventional relational schema, SQL indexes, SQL/TypeScript-derived features, exact distance over small candidate sets | **Best default** | Still useful for many analytics |
| **B. MySQL + dedicated vector index** | MySQL retains truth; Qdrant/Pinecone/Weaviate/Milvus supplies similarity search, keyed by MySQL IDs | Extra complexity without demonstrated Phase 1 value | Strong candidate for semantic/multimodal retrieval or ANN at scale |
| **C. Relational database with vector search** | PostgreSQL + pgvector or a specific managed MySQL product with supported vector features | Usually unnecessary now | Attractive if one database can meet performance and operational requirements |

**Key future-proofing priorities, in order:** (1) stable source-agnostic player/game IDs; (2) point-in-time historical data and lineage; (3) retained or reproducible source evidence and feature calculations; (4) versioned feature definitions; (5) retrieval-quality and latency benchmarks. A vector database itself can generally be added later as a **rebuildable derivative index**.

**Documented project context:** Accepted ADRs specify Next.js frontend, a distinct Express/TypeScript backend and scheduler, TypeScript/MySQL ETL, a MySQL-only storage plan, manual SQL access, and current-season-only play-by-play/depth-chart retention. Those choices are not changed by this report. The earlier bucket+PostgreSQL and bucket+MySQL plans were superseded by ADR-0014. [P1–P6]

</details>

<a id="methodology"></a>
<details>
<summary><strong>2. Scope, methodology, and evidence quality</strong></summary>

### Scope

This report addresses tools/frameworks, ease of implementation, maintainability, memory, speed/efficiency, hosting costs, pitfalls, near- and long-term benefits, API integration, public implementations from the preceding two years, and the ETL-to-frontend path for both relational and vector systems.

### Evidence selection

The source pass prioritized **original technical documentation** from Oracle/MySQL, PostgreSQL/pgvector, Google Cloud, Microsoft, Qdrant, Milvus, Weaviate, Pinecone, and official database service pricing pages. It also used **first-party production engineering reports** from Notion, Uber, and Ring/AWS, plus the Stack Overflow Developer Survey. These sources provide more direct evidence than general comparison blogs. The references section contains **at least five authoritative sources specifically supporting relational systems and at least five specifically supporting vector systems**, with direct URLs. [R1–R9; V1–V10; T1–T4]

### How claims are treated

| Evidence | Suitable for | Caveat |
|---|---|---|
| Maintainer/official documentation | Actual API features, index behavior, supported configurations, documented limitations | Does not prove superior performance versus competitors |
| Official pricing | Current advertised plan structure and list prices | Region, usage, backups, egress, taxes, and promotional terms change |
| First-party engineering case study | Evidence that a system was deployed and how it was designed | Reported performance/costs are workload-specific and often not independently reproduced |
| Developer survey | Respondent-reported tool usage | Not database market share, install counts, or replacement rate |
| Calculations and design examples herein | Transparent capacity estimates and candidate implementation | **Illustrative**, not Runpure FF measured benchmarks |

### Limitations

No Runpure FF implementation repository, live database schema, production metrics, complete ETL spec, or measured target traffic were evaluated in this comparative pass; the baseline comes from the provided ADRs. Exact MySQL storage footprint, future vector counts, feature dimensionality, latency SLOs, and operating costs require benchmarking before final selection. The historical source data's availability and licensing/retention terms also need separate verification before any new archival decision. [P1–P6]

</details>

<a id="architectural-choices"></a>
<details>
<summary><strong>3. What is being compared: three real architectural choices</strong></summary>

### Relational SQL

A relational database organizes structured data in tables with keys, constraints, indexes, and transactions. Queries combine `WHERE`, `JOIN`, grouping, window functions, and aggregates. InnoDB supplies transactional and concurrency facilities; its buffer pool caches table and index pages. [R1–R4]

Examples in Runpure FF: `player → team`, `player → weekly_stats`, `game → teams`, `player → source_identifier`, and `user → owned_league`. Complex historical relationships can be represented via join tables, effective-date intervals, and point-in-time snapshots.

### Vector similarity retrieval

A vector-search engine indexes numerical representations of objects so queries can ask for **nearest neighbors** under cosine, dot-product, Euclidean, or related metrics. A vector record usually includes an ID and filterable metadata; it is not a substitute for a relational schema with transactional joins and foreign keys. ANN indexes such as HNSW and IVF trade some recall for speed, whereas flat/exact search can provide exact neighbors within the chosen metric. [V1–V4]

**Two different kinds of vectors matter here:**

- **Engineered statistical feature vectors**, e.g., `[recent_target_share, route_participation, opponent_pressure_rate, usage_volatility]`, are not necessarily AI embeddings. Distance requires deliberate normalization, weighting, and football-domain validation.
- **Learned embeddings** from text, images, audio, or video models capture semantic or multimodal properties and are usually more appropriate for searching reports, highlights, scouting notes, or news.

### Integrated retrieval

Vector retrieval does **not inherently require a separate vector database**. PostgreSQL with `pgvector` offers SQL joins plus exact and approximate vector retrieval. Google Cloud SQL for MySQL has vendor-specific native vector facilities; **do not assume ordinary/self-hosted MySQL provides the same Cloud SQL search syntax or indexing**. Microsoft SQL Server also provides a native vector data type. [V5; R6–R7]

### Not a fourth data store: GraphQL

GraphQL is an API schema/query layer, not a vector database or a graph database. Runpure FF could expose relational queries, vector-backed recommendations, or both through REST or GraphQL. GraphQL adds no intrinsic similarity retrieval functionality.

</details>

<a id="comparison-matrix"></a>
<details>
<summary><strong>4. Side-by-side decision matrix</strong></summary>

| Dimension | Relational SQL (MySQL) | Dedicated vector DB | Practical implication |
|---|---|---|---|
| Canonical data | Excellent for authoritative facts, constraints, updates | Usually represents derived searchable objects and metadata | Keep MySQL as source of truth |
| Data shape | Tables, columns, foreign keys, typed values | Vectors, IDs, payload/filter fields | Storage models are complementary |
| Query model | Exact filters, joins, aggregates, ordering | Similarity top-*k*, metadata filtering, sometimes hybrid text search | Select tool based on retrieval operation |
| Query tooling | Standard SQL and mature drivers | API/SDK with engine-specific query semantics | Current backend already has SQL workflow |
| Transactions | Mature ACID model for related writes | Product-dependent consistency/write visibility | Do not assume relational-equivalent transactions |
| Referential integrity | Keys, FKs, unique constraints | Typically enforced by application/sync pipeline | Preserve canonical IDs in MySQL |
| Structured reporting | Very strong | Generally not its central optimization | SQL for season stats, rosters, standings |
| Similarity of 5–50 numeric features | Exact scan in code/SQL can be sufficient on modest subsets | Possible, but may be overkill | Benchmark exact first |
| Similarity of 768–1,536-dimensional embeddings | Requires vector-aware tooling or external computation | Designed for this | Dedicated/indexed solutions become attractive |
| Semantic text search | Full-text keyword retrieval, or extension/service for vectors | Core use case; some engines offer hybrid keyword/vector | New capability for news/scouting |
| Multimodal retrieval | Stores metadata and asset pointers | Similarity search across compatible modality embeddings | Hybrid architecture likely |
| Explainability | SQL predicates and aggregations are inspectable | Neighbor score can be opaque without feature explanations | Surface contributing factors, not just score |
| Storage and RAM | Working set/index/cache dependent | Vector dimensions, precision, index, filter and cache dependent | Both need workload sizing |
| Performance guarantees | Strong for well-indexed exact queries | ANN trades latency for approximate recall | Measure both latency and relevance |
| Scaling | Mature vertical scaling/read replicas; distributed writes vary by architecture | Many platforms target large-scale ANN with sharding | Relevant only after demand is measured |
| Operations | Familiar to project | New service/index/version lifecycle if dedicated | Separate vector DB adds ownership |
| Vendor portability | Standard SQL with dialect differences | APIs and metadata/index behavior vary | Treat vector store as replaceable |
| Direct Phase 1 value | Very high | Low | Do not replace MySQL |
| Later matchup analysis | Foundation for all features/outcomes | Useful analog-retrieval acceleration | SQL + models first, ANN if justified |

**Interpretation:** “Faster” is not a general attribute of one category. An indexed MySQL lookup for `player_id = ?` should not be compared directly with a high-dimensional nearest-neighbor query—the two systems are solving different retrieval tasks. [R3–R5; V1–V5]

</details>

<a id="tools-frameworks"></a>
<details>
<summary><strong>5. Tools, frameworks, and developer ecosystem</strong></summary>

### Relational/structured stack

| Layer | Candidate tools | Fit with current decisions |
|---|---|---|
| Database | **MySQL**; alternate PostgreSQL, SQL Server, MariaDB | MySQL is accepted |
| TypeScript access | `mysql2` with Promise API and prepared statements | Fits hand-written SQL/no ORM |
| Optional query tooling | Kysely, Knex, Drizzle, Prisma | Not required; ORM currently rejected |
| ETL extraction | Node `fetch`, streams, parsers, checksums | Fits TypeScript ETL |
| Validation | Explicit TypeScript guards; optional Zod | Useful when nflverse/Sleeper schemas change |
| Transform | MySQL SQL, TypeScript; optional future DuckDB/Polars | Current ADR prefers TypeScript + MySQL |
| Query tuning | `EXPLAIN`, InnoDB buffer metrics, Performance Schema | Mature native diagnostics |
| Schema change | Version-controlled SQL scripts; optional dbmate/Flyway | Would require reconsidering accepted manual-DDL ADR |
| Analytics | SQL window functions, generated summary/feature tables | Strong basis for opponent-adjusted features |

MySQL documentation covers index structures, query plans, memory management, and transactional behavior. [R1–R5]

### Dedicated vector/search stack

| Layer | Candidate tools | Notes |
|---|---|---|
| Dedicated engines | Qdrant, Weaviate, Milvus, Pinecone | Differ in API, operational model, filters, indexes, pricing |
| Relational-vector alternative | PostgreSQL + pgvector | Can avoid second database service |
| Managed MySQL-vector alternative | **Google Cloud SQL for MySQL**, supported versions/configurations | Vendor-specific—not generic MySQL portability |
| Local indexing library | FAISS / hnswlib | A search index need not imply a remote DB service |
| Numeric feature processing | TypeScript, Python/scikit-learn, SQL | Feature scaling/model assessment are distinct from DB engine |
| Embedding generation | Hosted embedding APIs, Sentence Transformers, multimodal models | Required for semantic/multimodal use, **not** for basic engineered feature vectors |
| Optional retrieval orchestration | LangChain, LlamaIndex | Helpful in some RAG workflows; not needed just to query neighbors |
| Client integration | Vendor's TypeScript SDK or HTTP client | Fits existing Express API |
| Monitoring | Vector ingestion/version lag, recall@k, latency, cost | Additional operational surface |

Qdrant, Milvus, Weaviate, and Pinecone all publish original technical specifications, including indexing, filtering, hybrid retrieval, or SDK integration. [V1–V4; V6–V7]

### Selection principle

Start from a *question and retrieval SLO*, not the product label: SQL for authoritative structured facts; full-text for exact terms; exact vector comparison when small; specialized ANN/hybrid retrieval when relevance, scale, or latency demands it.

</details>

<a id="implementation-maintenance"></a>
<details>
<summary><strong>6. Initial implementation complexity and maintainability</strong></summary>

| Work item | MySQL-only Phase 1 | MySQL + dedicated vector store |
|---|---|---|
| Database provisioning | Already required | Additional vendor/cluster/credentials |
| Core player/team/game schema | Required | Still required |
| Ingestion/source validation | Required | Still required |
| Analytical feature engineering | Required for matchup work | **Still required** |
| Embedding model or vector scheme | Only if a similarity experiment is added | Required for vector use |
| Index build/upsert | Conventional SQL indexes | Additional vector collection/index lifecycle |
| Consistency | One operational store | Must reconcile SQL and vector index |
| Model/index versioning | Recommended for derived features | Essential for semantic embeddings |
| Data deletion/authorization | Normal DB/API controls | Must propagate to derived index too |
| Backups/recovery | Database snapshot/log restore | Separate index backup or rebuild process |
| Operational alerts | DB/ETL health | Plus indexing lag, vector failures and drift |
| Vendor changes | SQL dialect and migration work | Re-embedding/index rebuilding may be needed |

### Hidden work in vector systems

A “similar player” endpoint sounds simple, but must settle position-specific comparability; numeric scaling; feature inclusion; how much to weight recent weeks; missing-data treatment; whether an observation is **pregame** or **postgame**; training and evaluation windows; and whether the resulting neighbors improve a real decision.

For text/video search, the additional responsibilities are chunking/segmentation, model choice, model-specific input preparation, embeddings, deduplication, metadata filters, safety/privacy constraints, re-embedding on model changes, and index synchronization. Notion's 2026 engineering account is a concrete example of the work involved in incremental updates and avoiding unnecessary re-embedding. [T2]

### Maintainability recommendation

Define a **stable retrieval interface** in Express (`findHistoricalAnalogs`, `searchPlayerNews`) that can call exact calculations initially and a vector store later. Keep model/feature versions, source IDs, and authoritative facts in MySQL. This avoids coupling controllers to a specific vector vendor and permits rebuilding indexes without rewriting business rules.

</details>

<a id="memory-storage"></a>
<details>
<summary><strong>7. Memory, disk, and capacity planning</strong></summary>

### MySQL memory

InnoDB's buffer pool caches frequently accessed **table and index pages**. RAM usage depends on the active data set, query plans, connection count, temporary work, and concurrent ETL/API traffic; cold reads may be disk-bound. It is incorrect to assume relational data must be fully memory resident. [R3]

### Vector memory

For an uncompressed dense vector stored as 32-bit floats:

\[
\text{raw vector bytes} = N_\text{vectors} \times D_\text{dimensions} \times 4
\]

| Number of vectors | Dimensions | Raw float32 vectors only |
|---:|---:|---:|
| 100,000 | 768 | ~0.29 GiB |
| 100,000 | 1,536 | ~0.57 GiB |
| 1,000,000 | 768 | ~2.86 GiB |
| 1,000,000 | 1,536 | ~5.72 GiB |

These are calculated capacity examples, **not Runpure FF measurements**. They exclude HNSW/IVF index structures, record IDs, metadata, replication, process overhead, caches, and ingestion/build-time memory.

Index choice changes both speed and footprint. HNSW generally consumes additional memory for graph links; IVF, quantization, and disk-based designs can trade memory against recall, I/O, or CPU. Qdrant documents disk-oriented storage and quantization, and Milvus documents flat, IVF, HNSW, and disk-based alternatives. [V2–V3; V5]

### Runpure FF sizing implications

The relevant unit is **player-week**, **player-game**, **team-game**, or **pregame matchup scenario**, not necessarily one vector per player. A player-week vector is a different observation from a player-career vector, and using both without explicit labels can create misleading neighbors.

Before provisioning, estimate: number of historical seasons × games/weeks × players/teams × feature versions × representations. Then compare exact-search latency over position- and date-filtered candidate sets to an indexed search. No current document establishes that an ANN index would be necessary at the expected Phase 1 scale.

</details>

<a id="performance"></a>
<details>
<summary><strong>8. Speed, efficiency, and correctness</strong></summary>

### Workload-specific performance

| Workload | Likely best starting point | Why |
|---|---|---|
| Player by canonical ID | MySQL PK lookup | Exact indexed retrieval |
| Weekly stats, schedules, owned league | MySQL joins and indexes | Referential facts and filtered records |
| Season averages, rolling 4-week aggregates | MySQL aggregation or precomputed feature table | Efficient structured analysis |
| Small set of comparable quarterback weeks | Exact distance in TypeScript/SQL | No ANN index overhead necessary |
| Millions of high-dimensional semantic embeddings | Indexed vector retrieval | Purpose-built top-*k* nearest-neighbor workload |
| Natural-language injury/news search | Keyword + semantic/hybrid retrieval | Semantics and exact names both matter |
| Weekly fantasy forecast | Predictive/analytical model | A similarity index alone does not forecast outcomes |
| Similar historical videos/highlights | Multimodal embeddings + vector search | Retrieval across visual-semantic content |

### Exact versus approximate

Exact *k*-NN calculates distances to the candidate set, returning the true nearest neighbors for the selected representation/metric. Approximate ANN can improve latency and throughput by examining fewer candidates but may miss exact neighbors. **Recall@k**, p50/p95 latency, filtering correctness, update freshness, and cost all matter. The pgvector project documents exact search and HNSW/IVFFlat tradeoffs; Google Cloud SQL for MySQL likewise distinguishes exact KNN from ANN. [V5; R6]

### Common benchmark traps

1. Comparing a warm-cache vector search to a cold-cache SQL scan, or vice versa.
2. Reporting only p50 latency while p95/p99 misses API targets.
3. Ignoring metadata filters such as position, tenant, season, or historical availability.
4. Measuring only index query time, not embedding generation, SQL enrichment, network calls, and serialization.
5. Choosing cosine similarity on arbitrary unscaled football statistics.
6. Evaluating historical analogs using features created *after* the target game—**future-information leakage**. Time-based evaluation must respect chronology. [E3]

**Recommended experiment:** Compare three pipelines on the same candidate population: (1) SQL-filter + exact TypeScript distance, (2) exact vector distance in a vector-aware store, and (3) ANN with equivalent metadata filtering. Verify identical target-feature definitions; record recall@10 versus exact ground truth, p50/p95, ingestion time, memory/disk footprint, and monthly cost. No universal winner is assumed.

</details>

<a id="hosting-cost"></a>
<details>
<summary><strong>9. Hosting cost and total cost of ownership</strong></summary>

### Verified advertised examples (November 7, 2026)

| Offering | Advertised model | Published illustrative tier or minimum | Interpretation |
|---|---|---|---|
| **Aiven MySQL Developer** | Managed relational | **US$5/month**; listed 1 GB RAM / 8 GB total storage | Entry managed MySQL; check selected cloud/region and constraints [C1] |
| Amazon RDS for MySQL | Managed relational | Usage-based compute, storage, backup, traffic | Requires instance-size and usage estimate [C2] |
| Google Cloud SQL for MySQL | Managed relational/vector (supported versions) | Usage-based | Native vector features are not necessarily the cheapest hosting option [R6] |
| **Qdrant Cloud Free** | Managed vector | **Free**; listed 0.5 vCPU / 1 GB RAM / 4 GB disk | Useful for prototype; free tier is not a production SLA [C3] |
| Qdrant Cloud Standard | Managed vector | Usage-based | Estimate RAM, disk and availability [C3] |
| **Pinecone Starter** | Serverless vector | **Free**, usage limits apply | Prototype entry tier [C4] |
| **Pinecone Builder** | Serverless vector | **US$20/month flat** | Small-team tier; confirm inclusions [C4] |
| **Pinecone Standard** | Serverless vector | **US$50/month minimum usage** | Usage above minimum charged separately [C4] |
| PostgreSQL + pgvector | Relational + vector | Host-specific | One service may handle both workloads [V5] |

**Hosting change affecting earlier Runpure FF assumptions:** Aiven officially states that **new free MySQL instances cannot be created from November 6, 2026**, and surviving free MySQL instances will be switched off and their data/backups deleted **December 21, 2026**. Aiven's pricing overview may still display a “Free” product row; the retirement notice controls its current availability. The actual Runpure FF host was *not* confirmed from the supplied ADRs. [C5]

### Total cost of ownership (TCO), not just list price

`Monthly total ≈ relational hosting + vector hosting + embedding/inference + ETL/indexing compute + backups + networking/egress + operational time`

For **engineered numeric feature vectors**, a paid embedding API may be unnecessary, but CPU/ETL work remains. For **semantic news/video retrieval**, embedding inference and reindexing may be major costs. Dedicated vector deployments may require a larger resource footprint as corpus size, index count, high availability, and tenant filters grow. Managed pricing changes; validate final offers before deployment. [C1–C4]

### Recommendation on cost

Avoid a separate always-on vector service in Phase 1 unless a clear feature needs it. A small free prototype can still be justified for experimentation. Prefer a per-request and per-million-observation cost model over a comparison of advertised minimum plans alone.

</details>

<a id="pitfalls"></a>
<details>
<summary><strong>10. Pitfalls, reliability, security, and data quality</strong></summary>

### Relational SQL pitfalls

| Risk | Manifestation | Mitigation |
|---|---|---|
| Missing/poor indexes | Slow joins, scans | `EXPLAIN`, targeted composite indexes [R4] |
| ETL/API contention | Batch writes degrade interactive latency | Streaming, batching, job separation when needed |
| Schema drift | Local/production differ | Tracked, repeatable SQL schema changes (proposal) |
| Historical growth | Snapshots/indexes overwhelm low storage tier | Size data; separate archive and operational access patterns |
| Source identity ambiguity | Sleeper/nflverse IDs mapped incorrectly | Canonical identifier map, provenance, audit checks |
| Incomplete point-in-time data | Past features silently use future revisions | Explicit `as_of`/published/ingested timestamps |
| Backup assumptions | Historical source evidence lost | Restore drills and retention policy |

### Dedicated vector pitfalls

| Risk | Manifestation | Mitigation |
|---|---|---|
| Semantic/feature mismatch | Neighbors look mathematically close but are football-irrelevant | Domain evaluation with labeled relevant cases |
| Feature scaling/weighting | One high-range input dominates numeric distance | Versioned normalization and weights |
| ANN recall loss | Misses a close candidate | Evaluate against exact top-*k* and tune index |
| Stale index | New injury/team info not reflected | Idempotent upserts; index-lag monitoring; reconciliation |
| Incompatible model versions | Old and new embeddings mixed | Model/feature-version separation; explicit reindex |
| Filtering errors | Similarity leaks cross-league/user data | Server-enforced tenant constraints and SQL authorization |
| Vendor lock-in | Query semantics/index maintenance vary | Retrieval adapter and rebuildable vectors |
| Explainability failure | “94% similar” misread as predictive probability | Metric-specific labels, feature contributions, examples |
| Multimodal ownership rights | Unauthorized/unsafe reuse of source media | Validate licenses, retention and permissions |

**Security:** Even when a vector result includes a user or league ID in metadata, the Express backend must enforce authorization when enriching the result from MySQL; never trust the client's metadata filters alone. Updates and deletes must propagate to every derived index. Operational and retrieval semantics differ across vendors. [V1–V4]

**Data correctness:** Player similarity is especially sensitive to dates, player role, minimum opportunities, injury context, and survivorship effects. A point-in-time snapshot is essential if the platform later reports how a forecast *would have performed* at a historical decision moment. [E3]

</details>

<a id="benefits-roadmap"></a>
<details>
<summary><strong>11. Benefits and affordances: Phase 1 to multimodal</strong></summary>

| Capability | Phase 1 importance | Later value | Most appropriate first approach |
|---|---|---|---|
| Player directory and roster cards | Essential | Essential | MySQL |
| Stats/season/game history | Essential | Essential | MySQL |
| Flexible fantasy scoring | Essential | Essential | MySQL stats + TypeScript scoring |
| Rolling player efficiency and opportunity | Useful | Very high | SQL feature tables |
| Opponent-adjusted matchup analysis | Future | Very high | Temporal SQL features + statistical models |
| Similar historical player-weeks | Future | High | Exact numeric distance, then ANN if justified |
| Similar historical defensive/game situations | Future | High | Derived feature vectors with position/game-context filters |
| Breakout candidate identification | Future | High | Supervised forecasting + analog explanations |
| Injury/contextual analysis | Future | High | Dated structured fields plus semantic news retrieval |
| Natural-language searches (“underused explosive WRs”) | Future | High | Structured filters + semantic/hybrid search |
| Personalized draft recommendations | Future | High | SQL ownership/preferences plus ranking/retrieval models |
| Scouting reports and news | Future | High | Text embeddings + keyword/vector hybrid |
| Similar video plays and multimodal comparisons | Out of scope | Potentially high | Multimodal embedding model + vector retrieval + asset store |

### The subtle point about “behavioral” and “contextual” similarity

Examples such as “players with similar recent opportunity profiles” or “QB matchups against similarly aggressive defenses” are often **structured feature-comparison tasks**, not necessarily language embedding tasks. They require a designed feature space and temporal controls. Conversely, “injury reports describing a comparable situation without matching keywords” is genuinely **semantic retrieval**, where embedding models are a natural candidate.

### Where a vector store does *not* substitute for a model

To predict next week's outcomes, historical neighbor returns must be validated against a baseline forecast. A vector retrieval system may explain *why* a projection resembles prior cases; it does not by itself estimate a calibrated point distribution, injury risk, or win probability.

### Proposed phased route

1. **Phase 1:** retain MySQL; accurate historical/source identities; log reproducible ETL metadata.
2. **Phase 2:** pregame feature tables and leakage-safe backtests; initial exact analog lookup.
3. **Phase 3:** evaluate ANN/vector index once actual candidate volume and API latency justify it.
4. **Phase 4:** introduce licensed documents, image/video sources, learned embeddings, hybrid search, and multimodal retrieval with explicit provenance.

</details>

<a id="api-design"></a>
<details>
<summary><strong>12. API applicability and response design</strong></summary>

### Current Express API with relational retrieval

```text
Next.js player/matchup screen
  → Express route/controller
    → authentication and tenant scope
      → MySQL parameterized SQL (players, stats, schedule, features)
        → TypeScript scoring/analysis service
          → typed JSON payload
            → Next.js
```

Example **illustrative** endpoint:

```http
GET /api/players/123/matchup?season=2026&week=12
```

```json
{
  "playerId": 123,
  "season": 2026,
  "week": 12,
  "opponent": "DAL",
  "recentAverageFantasyPoints": 18.5,
  "featureAsOf": "2026-11-18T12:00:00Z",
  "projection": null,
  "projectionStatus": "not_available_in_phase_1"
}
```

The endpoint and values are examples, not existing API contracts; a future projection needs its own model and product decision.

### Optional vector-backed API service

```text
Next.js analog/search screen
  → Express controller: authorized input validation
    → SQL: canonical observation and its as-of features
    → vector adapter: top-k neighbor IDs + distances, with metadata filters
    → SQL: enrich and enforce current permissions/source state
    → optional exact re-rank and explanatory feature-difference calculation
    → typed JSON including provenance, model version, distance semantics
      → Next.js
```

Example **illustrative** endpoint:

```http
GET /api/players/123/historical-analogs?season=2026&week=10&limit=5
```

```json
{
  "playerId": 123,
  "observation": { "season": 2026, "week": 10 },
  "similarityMethod": "scaled_numeric_features_euclidean_v1",
  "featureAsOf": "2026-11-04T15:00:00Z",
  "analogs": [
    {
      "playerId": 456,
      "season": 2022,
      "week": 9,
      "distance": 0.18,
      "explanation": ["similar prior-4-game usage", "similar opponent pass defense"]
    }
  ]
}
```

The distances and explanations above are purely illustrative. Do **not** expose distance as a forecast probability. Keep source metadata, feature-version information, and reference IDs available for auditability.

### GraphQL's role

GraphQL can expose either kind of backend retrieval, but it does not replace SQL or vector search. For Runpure FF, an Express REST route is sufficient unless a separately established frontend contract motivates GraphQL. Authorization, query cost limits, and backend retrieval logic remain necessary regardless of transport.

</details>

<a id="etl-workflows"></a>
<details>
<summary><strong>13. ETL-to-frontend workflows: relational vs. hybrid vector</strong></summary>

### A. Relational-only implementation (recommended Phase 1)

```text
nflverse files + documented Sleeper API
            │
            ▼
  TypeScript extraction (fetch/streams)
            │
            ▼
  Schema validation + source provenance
            │
            ▼
  Canonical IDs + normalization + staging
            │
            ▼
  MySQL transactional load/upsert + ingest ledger
            │
            ▼
  SQL derived stats / pregame analytical features
            │
            ▼
  Express service: SQL filters/joins + scoring
            │
            ▼
       JSON API → Next.js
```

| Step | Concise task | Likely tech/method |
|---|---|---|
| 1. Extract | Fetch nflverse releases and Sleeper player list | Node.js/TypeScript, HTTP fetch, streaming parser |
| 2. Validate | Check expected schema, season/week, source timestamp | TypeScript guards or Zod, content hashes |
| 3. Transform | Map Sleeper/nflverse IDs; normalize dates, teams, stats | TypeScript, SQL |
| 4. Stage and load | Batch inserts/transactional replacement by source partition | `mysql2`, staging tables, `INSERT ... SELECT`/upsert |
| 5. Record integrity | Store source version, ingest job, row counts, completion state | MySQL ledger and locks |
| 6. Derive | Build pregame and postgame summaries, averages, opponent context | MySQL SQL; eventual background batch |
| 7. Retrieve | Exact predicates, joins, ordering and optional small-set distances | Parameterized SQL, TypeScript services |
| 8. Respond | Compute scoring, serialize verified output | Express controllers, JSON |
| 9. Render | Player cards, game/matchup tables | Next.js |

**Important ADR alignment:** The existing ADR-0007 keeps fantasy-point calculation in application code; the workflow above honors that choice. ADR-0016 places ETL scheduling with the Express backend, not the Next.js frontend. [P3–P6]

### B. Relational + vector implementation (candidate future phase)

```text
        Existing validated MySQL ETL
                    │
                    ▼
           Authoritative MySQL
                    │
                    ▼
    Point-in-time feature/materialization job
                    │
            ┌───────┴────────┐
            ▼                ▼
    Numeric feature       Text/image/video
       vectors               model embeddings
            └────────┬────────┘
                     ▼
     Versioned vector records (MySQL observation IDs)
                     │
                     ▼
     Qdrant / Pinecone / Weaviate / Milvus
                     │
                     ▼
Express: authorized query → top-k IDs + distance
                     │
                     ▼
    MySQL enrichment + exact re-rank/evidence
                     │
                     ▼
             JSON → Next.js
```

| Additional step | Concise task | Likely tech/method |
|---|---|---|
| 1. Materialize observations | Build `(player_id, season, week, as_of)` features without future data | MySQL and TypeScript |
| 2. Normalize/encode | Scale and weight statistics; embed news/media if used | TypeScript or Python/scikit-learn; hosted/local embedding model |
| 3. Version | Store `feature_version`, `embedding_model_version`, source hash | MySQL metadata tables |
| 4. Index | Upsert vector IDs/metadata; configure filters and search metric | Vector TypeScript SDK, ANN/exact settings |
| 5. Synchronize | Retry missing writes, reconcile deletes/updates, monitor lag | Ledger/outbox/event job with idempotent upserts |
| 6. Query | Create query vector using **same** feature/model transform | Express service, vector client |
| 7. Filter | Apply position, eligible season, observation cutoff and tenant rules | Vector metadata filter **plus** MySQL authorization |
| 8. Enrich/re-rank | Fetch official stats and explain matches | MySQL, TypeScript |
| 9. Respond | Return IDs, distances, explanatory deltas and provenance | Typed Express JSON, Next.js |

### C. An intermediate path without a dedicated database

Keep the same feature tables in MySQL. For a query, select a manageable candidate set (e.g., position + eligible historical weeks), compute normalized distances in a TypeScript service, sort, and return the nearest matches. This tests **whether similarity is useful to users** before you pay the infrastructure cost of approximate-nearest-neighbor indexing. It is also a direct benchmark baseline for any later ANN system.

### D. Recovery contracts

- MySQL remains authoritative; vector records are **rebuildable** from versioned features and source lineage.
- Make index updates idempotent; do not assume cross-database atomic transactions.
- Keep source timestamp, ingestion timestamp, and historical feature cutoff distinct.
- Measure end-to-end API latency, not only the vector query time.
- Keep frontend unaware of whether retrieval is SQL-only, integrated vector, or dedicated vector.

</details>

<a id="trends"></a>
<details>
<summary><strong>14. Public adoption and implementation trends, November 2024–November 2026</strong></summary>

### Trend A — Relational engines are integrating vectors

| Date/source | Publicly documented development | Architectural significance |
|---|---|---|
| **Feb 11, 2025 — Google Cloud SQL for MySQL** [T1] | Vector search became generally available for supported managed MySQL configurations; exact KNN and indexed ANN are available | An existing SQL engine can offer vector capability without a separate vector store |
| **2025 — SQL Server 2025** [R7] | Microsoft documents native vector data type and constraints | Major commercial relational products are adding vector primitives |
| **2024–2026 — pgvector ecosystem** [V5] | Maintainer documentation covers exact and ANN nearest-neighbor search within PostgreSQL | Integrated SQL-plus-vector remains a real alternative |

**Do not generalize managed-provider features to every MySQL host**; vector syntax/index support depends on the specific platform and release. [R6]

### Trend B — Vector infrastructure is being optimized for scale and lower total cost

Vendors emphasize quantization, disk-backed indexes, hybrid retrieval, and storage/compute separation. These approaches can reduce specific workload costs, but introduce different latency, recall, and operational tradeoffs. [V2–V4; V7]

### Trend C — Public engineering implementations use different architectures

| Public case | Date | What was actually implemented | What the example does **not** prove |
|---|---|---|---|
| **Uber + OpenSearch** [T3] | Dec 18, 2025 | Large-scale semantic search using OpenSearch vector capabilities | Not that OpenSearch is best for small fantasy-sports workloads |
| **Notion vector search** [T2] | Feb 19, 2026 | Billion-scale vector indexing work, cost reduction, hash-based incremental embedding updates, infrastructure revisions | Not that the reported cost savings will generalize to Runpure FF |
| **Ring + PostgreSQL/pgvector (AWS)** [T4] | Apr 21, 2026 | Large-scale video-frame embedding search on PostgreSQL + pgvector, using careful partitioning and exact scans in a documented implementation | Not that every workload or SQL host can meet the same scale/latency |

**Notable nuance from Ring:** Its AWS case study reports choosing **exact parallel scans rather than ANN indexes** for its specific partitioned workload and recall requirements. This reinforces the need to benchmark *exact retrieval* instead of assuming vector indexing is always preferable. [T4]

### Trend D — SQL remains widespread; vector adoption cannot be inferred from this survey alone

The **2026 Stack Overflow Developer Survey** database question (12,061 respondents) reports PostgreSQL **57.9%**, SQLite **42.1%**, MySQL **35.1%**, Redis **28.3%**, and SQL Server **27.1%** among respondents reporting extensive development work over the preceding year. These numbers are **self-reported usage, not market share**. The survey categories do not constitute a complete comparable census of vector products; therefore they cannot quantify vector DB replacement or growth directly. [T5]

### Overall interpretation of the two-year evidence

The visible implementation trend is **convergence and specialization**, not universal replacement: operational records remain relational, semantic retrieval adds vector/search infrastructure where needed, and several established relational products now support vector operations themselves. Vendor engineering narratives demonstrate feasible patterns but do not provide head-to-head, independently controlled benchmarks for Runpure FF.

</details>

<a id="recommendations"></a>
<details>
<summary><strong>15. Runpure FF fit, decisions, and proposed experiments</strong></summary>

### Current documented plan vs. recommendation

| Area / ADR | Documented current choice | Assessment | Proposed action |
|---|---|---|---|
| ADR-0003 sources | nflverse base; documented Sleeper fields fill gaps | Strong structural foundation | **Keep**; preserve provenance and mapping |
| ADR-0004 Sleeper snapshots | Dated player-list copies retained | Valuable temporal evidence | **Keep requirement**; evaluate compressed immutable snapshot storage |
| ADR-0006 backfill | 2017–2026 once; incremental mutable windows; ledger/lock | Correct architectural direction | **Keep**; test crash recovery and historical corrections |
| ADR-0007 scoring | Compute fantasy points in app from stored stats | Flexible scoring | **Keep**; version scoring rules |
| ADR-0009/0013 pipeline | TypeScript + MySQL SQL, no transform library | Appropriate for initial measured load | **Keep until benchmark shows need** |
| ADR-0011 SQL access | Handwritten SQL, no ORM | Acceptable with tests | **Keep** if queries remain parameterized |
| ADR-0012 schema changes | Manual DDL, no migration tool | Reproducibility risk as environments multiply | **Consider change** to tracked SQL migrations |
| ADR-0014 storage | MySQL only; no object bucket | Simpler now, historical snapshot growth/recovery tradeoff | **Reconsider** immutable source evidence storage |
| ADR-0015 retention | Play-by-play/depth chart current season only | Minimizes operational storage, limits historical features | **Reassess** once Phase 2 modeling requirements are defined |
| ADR-0016 runtime | Next.js frontend; Express modular backend + scheduler | Sensible boundaries | **Keep**; worker split based on measured contention |
| No accepted vector ADR | No dedicated vector DB | Correct for Phase 1 scope | **Do not add yet** |

The ADRs are decision records; changing their substance should use the project's formal supersession process rather than editing previously accepted text. [P1]

### Proposed minimal future-ready data contracts (not accepted schema)

- `player_identity_map(source_system, source_player_id, canonical_player_id, valid_from, valid_to)`
- `historical_observation(player_id, season, week, game_id, observed_at, ingested_at, source_version)`
- `matchup_features(entity_type, entity_id, season, week, feature_as_of, feature_version, payload_or_columns)`
- `feature_definition(feature_version, normalization, allowed_inputs, calculation_code_version)`
- `retrieval_index_state(index_name, entity_key, feature_version, indexed_at, source_hash, status)` — only if an index is added.

These are *illustrative contracts*, not DDL. They preserve canonical IDs, time semantics, and versioned derived data without committing to any vector vendor.

### Suggested gating experiment

**Experiment:** “Can retrieving similar historical player-weeks produce useful, transparent matchup insights?”

| Gate | Evidence to collect | Decision implication |
|---|---|---|
| Product relevance | User-ranked examples of useful analogs vs superficial coincidences | No index warranted if relevance is poor |
| Data sufficiency | Availability of pregame features from retained sources | Fix history before selecting DB |
| Accuracy | Neighbor quality, same-position filters, historical as-of correctness | Validate feature design |
| Retrieval performance | Exact scan p50/p95 versus candidate-set size | ANN only if exact path misses target |
| ANN performance | recall@10 versus exact ground truth and p95 API time | Select index parameters if gain is material |
| Reliability | Rebuild, reconciliation, delete/permission behavior | Validate operations |
| Cost | Full monthly DB + index + model + infra/egress cost | Compare TCO, not free tiers |

**Decision recommendation:** Keep MySQL for Phase 1, do not purchase a separate vector database as an architectural placeholder, and make historical feature correctness the entry criterion for Phase 2 analytics. If vector retrieval is warranted, compare a managed integrated SQL-vector option with a dedicated engine using the same workload and acceptance tests.

</details>

<a id="references"></a>
<details>
<summary><strong>16. Source review: authoritative references and direct links</strong></summary>

**Source audit:** Entries labeled **R** provide relational database documentation (**9** original/authoritative references); entries labeled **V** provide vector indexing/retrieval documentation (**7** original/authoritative references); **T** and **C** cover production cases, industry usage, and pricing. Project source **P** references identify the specific uploaded ADR files. The vendor documents are primary authorities for their products, not neutral comparative benchmarks.

### A. Relational SQL and integrated relational/vector — primary sources (9)

| Ref. | Authority and direct link | Used for |
|---|---|---|
| **R1** | Oracle/MySQL, [InnoDB Transaction Model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html) | Transactional correctness, consistency and locking |
| **R2** | Oracle/MySQL, [Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html) | Relational indexing/storage |
| **R3** | Oracle/MySQL, [InnoDB Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html) | RAM use and cache tradeoffs |
| **R4** | Oracle/MySQL, [Using EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/using-explain.html) | Query planning and diagnostics |
| **R5** | Oracle/MySQL, [Full-Text Search Functions](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html) | Exact/keyword text-search capabilities |
| **R6** | Google Cloud, [Vector Search in Cloud SQL for MySQL](https://docs.cloud.google.com/sql/docs/mysql/vector-search) | Managed SQL/vector convergence; limitations; exact and ANN |
| **R7** | Microsoft Learn, [SQL Server Vector Data Type](https://learn.microsoft.com/en-us/sql/t-sql/data-types/vector-data-type?view=sql-server-ver17) | Relational-native vector type and constraints |
| **R8** | Oracle/MySQL, [InnoDB ACID Model](https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html) | Relational transactional properties |
| **R9** | Oracle/MySQL, [JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html) | Structured-plus-document storage flexibility |

### B. Dedicated and integrated vector retrieval — primary sources (7)

| Ref. | Authority and direct link | Used for |
|---|---|---|
| **V1** | Qdrant, [Technical Documentation Overview](https://qdrant.tech/documentation/overview/) | Core vector store, filters, APIs |
| **V2** | Qdrant, [Performance and Storage Optimization](https://qdrant.tech/documentation/ops-optimization/optimize/) | Quantization, on-disk storage, memory tradeoffs |
| **V3** | Milvus, [Index Explained](https://milvus.io/docs/index-explained.md) | HNSW, IVF, DiskANN, recall-memory tradeoffs |
| **V4** | Weaviate, [Hybrid Search Concepts](https://docs.weaviate.io/weaviate/concepts/search/hybrid-search) | Vector/keyword retrieval combinations |
| **V5** | pgvector maintainers, [Official Repository and Documentation](https://github.com/pgvector/pgvector) | PostgreSQL exact search, HNSW, IVFFlat |
| **V6** | Pinecone, [Architecture — How Pinecone Works](https://www.pinecone.io/how-pinecone-works/) | Storage/compute, metadata indexing, query architecture |
| **V7** | Weaviate, [TypeScript Client](https://docs.weaviate.io/weaviate/client-libraries/typescript) | API client integration |

### C. Public implementations and adoption evidence (5)

| Ref. | Direct link | Evidence and limitations |
|---|---|---|
| **T1** | Google Cloud, [Cloud SQL MySQL Release Notes](https://docs.cloud.google.com/sql/docs/mysql/release-notes) | GA date for vector search: Feb 11, 2025 |
| **T2** | Notion engineering, [Two Years of Vector Search at Notion](https://www.notion.com/blog/two-years-of-vector-search-at-notion) | Feb 19, 2026; first-party cost/ingestion engineering |
| **T3** | Uber engineering, [Powering Billion-Scale Vector Search with OpenSearch](https://www.uber.com/us/en/blog/powering-billion-scale-vector-search-with-opensearch/) | Dec 18, 2025; large-scale vector engineering example |
| **T4** | AWS/Ring, [Ring's Billion-Scale Semantic Video Search with PostgreSQL and pgvector](https://aws.amazon.com/blogs/database/rings-billion-scale-semantic-video-search-with-amazon-rds-for-postgresql-and-pgvector/) | Apr 21, 2026; integrated SQL-vector example; first-party workload metrics |
| **T5** | Stack Overflow, [2026 Developer Survey — Databases](https://survey.stackoverflow.co/2026/technology/data/databases) | Respondent-reported DB usage; **not** market share |

### D. Hosting, pricing and evaluation (6)

| Ref. | Direct link | Evidence |
|---|---|---|
| **C1** | Aiven, [MySQL Pricing](https://aiven.io/pricing/mysql) | Advertised managed MySQL tiers |
| **C2** | AWS, [Amazon RDS MySQL Pricing](https://aws.amazon.com/rds/mysql/pricing/) | Usage-based SQL hosting |
| **C3** | Qdrant, [Cloud Pricing](https://qdrant.tech/pricing/) | Vector hosting starter and usage tiers |
| **C4** | Pinecone, [Cloud Pricing](https://www.pinecone.io/pricing/) | Vector hosted starter, builder, standard tiers |
| **C5** | Aiven, [Free MySQL Tier Retirement](https://aiven.io/docs/products/mysql/howto/mysql-free-tier-migration-options) | Nov 6 / Dec 21, 2026 availability/retirement dates |
| **E3** | scikit-learn, [TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit) | Chronological validation and leakage prevention |

### E. Internal planning sources reviewed

These were supplied by the project and are **decision records rather than independent technical research**. References refer to the filenames in the planning package.

- **P1:** `README.md`, `architecture-decisions.md`, `templates.md` (ADR status, governance and current/superseded choices).
- **P2:** `ADR-0003-use-independent-sources-with-sleeper-filling-specific-gaps.md` and `ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md` (source selection and snapshot history).
- **P3:** `ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md` and `ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md` (incremental loads and scoring).
- **P4:** `ADR-0009-write-the-data-pipeline-in-typescript.md`, `ADR-0011-map-database-rows-to-code-by-hand-without-an-orm.md`, `ADR-0012-apply-schema-changes-by-hand-with-no-migration-tool.md`, and `ADR-0013-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md` (language, transformations, DB access and change process).
- **P5:** `ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md` and `ADR-0015-keep-play-by-play-and-depth-charts-for-the-current-season-only.md` (current storage and retention).
- **P6:** `ADR-0002-build-the-phase-1-web-app-with-nextjs.md` and `ADR-0016-run-the-api-and-pipeline-in-a-separate-express-backend.md` (frontend/backend runtime).

**Interpretation rule:** References establish what the source actually supports; architectural choices and priorities in this report are **analyst recommendations**, not asserted source facts. Vendor performance claims are treated as case-specific examples, and all cost figures are snapshots subject to change.

</details>

---

**Decision statement:** Keep MySQL as the Runpure FF system of record; prioritize reproducible historical features and point-in-time correctness; demonstrate relevance and performance of similarity search before committing to a dedicated vector engine. Any proposed replacement of an accepted ADR should proceed through the project's supersession process.
