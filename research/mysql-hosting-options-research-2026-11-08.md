# MySQL hosting options — research (2026-11-08)

Research only. No hosting decision has been made; hosting is a deployment-phase decision. Gathered for the open-decisions review on 2026-11-08 and moved here at your direction. Facts are from provider pages fetched 2026-11-08; anything not on a page is marked UNVERIFIED.

## Version support

- MySQL 8.0 reached end of life in April 2026; Oracle HeatWave keeps patching 8.0 until April 2027, then upgrades to 8.4 ([Oracle HeatWave versions](https://docs.oracle.com/en-us/iaas/mysql-database/doc/mysql-server-versions.html)).
- MySQL 8.4 LTS: premier support to 30 April 2029, extended support to 30 April 2032 ([endoflife.date](https://endoflife.date/mysql), third-party; the 2032 date matches Aiven's and AWS's).

## Providers

| Provider | Cheapest plan | Storage | Real MySQL 8.4 | Built-in backups | Notes | Sources |
|---|---|---|---|---|---|---|
| Oracle HeatWave Always Free | $0, no time limit | 50 GB (+50 GB backup) | Listed in HeatWave versions; free tier's version not stated | Daily, 1-day retention, no point-in-time | One per tenancy, home region, no HA. RAM, CPU and inactivity rules UNVERIFIED | [free](https://www.oracle.com/mysql/free/); [always-free doc](https://docs.oracle.com/en-us/iaas/mysql-database/doc/creating-always-free-db-system.html) |
| Aiven Developer | $5/mo | 8 GB, 1 CPU, 1 GB RAM | Yes; 8.4 until 2032 | Single backup (one page says daily), no point-in-time | Free MySQL retired: no new free services from 2026-11-06; remaining free services deleted 2026-12-21 | [pricing](https://aiven.io/pricing/mysql); [developer tier](https://aiven.io/developer-tier-pg-mysql); [free retired](https://aiven.io/free-mysql-database-retired); [lifecycle](https://aiven.io/docs/products/mysql/reference/version-lifecycle) |
| DigitalOcean Managed MySQL | From $15/mo (1 GiB RAM) | Not stated; $0.215/GiB extra | Only 8.4 for new clusters | Daily, 7 days, point-in-time 7 days | Daily backup briefly blocks DDL | [pricing](https://docs.digitalocean.com/products/databases/mysql/details/pricing/); [limits](https://docs.digitalocean.com/products/databases/mysql/details/limits/index.html.md); [backups](https://docs.digitalocean.com/products/databases/mysql/how-to/restore-from-backups/) |
| Azure Database for MySQL Flexible Server | Free 12 months (B1MS, 750 h) | 32 GB + 32 GB backup | 8.4 GA | Default 7 days | Price after free year UNVERIFIED | [free services](https://azure.microsoft.com/en-au/pricing/free-services); [version policy](https://learn.microsoft.com/en-gb/azure/mysql/concepts-version-policy) |
| AWS RDS MySQL | Free plan up to 6 months / credits | UNVERIFIED | 8.4 to Jul 2029 standard support | UNVERIFIED | Not free long-term | [RDS free](https://aws.amazon.com/rds/free); [versions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt) |
| Google Cloud SQL | ~$0.0105/h db-f1-micro (~$7.70/mo, own arithmetic) | Billed | 8.4 default | UNVERIFIED | Shared-CPU not covered by SLA | [pricing](https://cloud.google.com/sql/pricing); [versions](https://docs.cloud.google.com/sql/docs/db-versions) |
| Railway | $5 Hobby (includes $5 usage) | $0.15/GB/mo volume | Docker `mysql` image; tag not stated | Native backups; point-in-time 7 days with binlog archiving | RAM $10/GB/mo | [MySQL](https://docs.railway.com/databases/mysql); [plans](https://docs.railway.com/pricing/plans) |
| TiDB Cloud Starter | $0 | 5 GiB row + 5 GiB columnar | No (MySQL-compatible TiDB) | Daily, 1-day retention | 30-minute transaction limit; no triggers or stored routines | [plans](https://docs.pingcap.com/tidbcloud/select-cluster-tier); [limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/); [backups](https://docs.pingcap.com/tidbcloud/backup-and-restore-serverless/) |
| PlanetScale (Vitess) | ~$39/mo | — | No (Vitess, MySQL 8 compatible) | Every 12 hours | No free plan; no stored routines | [plans](https://planetscale.com/docs/planetscale-plans); [compat](https://planetscale.com/docs/vitess/mysql-compatibility) |

## `GET_LOCK()` on hosts

- Stock MySQL hosts (Aiven, DigitalOcean, RDS, Cloud SQL, Azure, HeatWave, Railway): INFERENCE that it works; no provider page states it.
- TiDB: supported with caveats (timeout clamped 1 s–1 h, no deadlock detection for user locks) ([TiDB locking functions](https://docs.pingcap.com/tidbcloud/locking-functions)).
- PlanetScale/Vitess: UNVERIFIED.

## Backups beyond the host

- `mysqldump --single-transaction` takes a consistent read of InnoDB tables after a brief initial lock ([MySQL 8.4 backup policy](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/backup-policy.html)).
- Free and cheapest tiers keep 1 day or a single backup, so own dumps would extend retention (INFERENCE).
