# Fantasy Workbench — Hosting Options Research & Decision Reference

**Research date:** November 20, 2026  
**Status:** Research complete for shortlisting; **hosting decision pending proof of concept and ADR**  
**Decision constraint:** Target **≤ US$15/month recurring**, preferably free when the trade-off is justified  
**Scope:** Phase 1 through planned/deferred Fantasy Workbench features; optional reuse for a few similar applications  
**Supersedes:** November 20, 2026 original hosting research, hosting follow-up, updated research, evidence-based reranking, and the 20-section consolidated report. The latter documents are historical, not parallel decision references.

> **Decision summary.** No provider is a proven universal winner. On the documented balanced scoring model, **OVHcloud VPS-1 (79.3)**, **Oracle Always Free A1 (77.5)**, and **Cloud Run + Aiven + Cloudflare Pages (76.6)** form the primary shortlist. The differences are smaller than reasonable uncertainty in the subjective ratings. OVH most directly hosts the current code; Oracle minimizes nominal cost but introduces free-instance availability/reclamation risk; Cloud Run reduces VM administration but its low-cost database is a substantial capacity and availability constraint. **Do not select solely from decimal scores; run the compatibility, full ETL, recovery and real-cost checks in §7.**

## Contents

1. [Executive summary and decision context](#executive-summary)
2. [System requirements and deployment assumptions](#requirements)
3. [Ranked complete hosting configurations](#rankings)
4. [Detailed evaluations of ranked options](#evaluations)
5. [Alternative, conditional and excluded options](#alternatives)
6. [Evaluation methodology and scoring audit](#methodology)
7. [Validation plan and decision gates](#validation)
8. [Sources and references](#sources)

---

<a id="executive-summary"></a>
## 1. Executive summary and decision context

### Decision to be made

Choose a hosting **configuration** for the existing Next.js frontend, Express/GraphQL API, scheduled ingestion jobs and MySQL 8 database—not simply a low advertised VM price. The research assesses both (a) keeping the existing API + scheduler in a single always-on process and (b) using a sleeping/scale-to-zero API with a **separately invoked ETL command**. The latter is permissible as an architectural change, not something already implemented or approved.

### Shortlist at a glance

| Candidate | Cost position | Why a human engineer would select it | What must be demonstrated |
|---|---|---|---|
| **[OVHcloud VPS-1](https://us.ovhcloud.com/vps/)** | Advertised **from $4.54/month**; earlier flexible-monthly estimate **~$5.35**, **not independently confirmed at checkout** | Single provider; present Node + cron + real MySQL fit; predictable base VM capacity | Full ETL + API fit in 4 GB; independent backups/restore; checkout and renewal cost |
| **[Oracle Always Free A1](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)** | **$0 nominal** within free quotas | Large nominal free memory, reusable VM/container environment | A1 capacity, ARM64 images, recovery after reclamation, acceptable interruption risk |
| **[Cloud Run + Aiven MySQL + Cloudflare Pages](https://cloud.google.com/run/pricing)** | **~$5/month floor**, **not an invoice or cap** | Scale-to-zero API, independently scheduled ETL, managed OS/database | Aiven's 1 GB/8 GB tier supports real SQL + backfill; static export; total billed cost and latency |

**Conditional choices:** [OVH VPS-2](https://us.ovhcloud.com/vps/) or [Contabo Cloud VPS 4](https://contabo.com/en-us/pricing/) when actual ingestion, additional apps or projections justify 8 GB rather than 4 GB. Lower-scored Render/Koyeb alternatives can be useful for a personal prototype with accepted cold starts. No option has passed an application-specific hosted load test.

**Reading guide:** The first comparison table (§3) is the decision interface; §4 gives one consistently structured evaluation for **every scored configuration**; §5 records alternative configurations and explicit non-eligibility reasons rather than implying that omitted providers ranked last. The methodology and measurements supporting an ADR follow in §§6–7.

---

<a id="requirements"></a>
## 2. System requirements and deployment assumptions

**Source of truth:** supplied `system-design.md` v2.5 (November 19, 2026), particularly §§1–4, 6–8, and supplied `00-overview.md` (November 18, 2026), particularly *How the features fit together*, *Features and infrastructure*, *Shared terms* and *Deferred features*. The linked repo ADRs/specifications were **not independently supplied/reviewed**; the description below is limited to the two supplied documents. The system design states that its ADRs, not the design itself, make architecture decisions.

### 2.1 Existing implementation and workload

| Item | Current requirement / observation | Consequence for hosting |
|---|---|---|
| Frontend | **Next.js App Router**, browser calling API directly, Firebase ID token; CSS Modules, TanStack Query | Static hosting is **possible, not established**; test `output: 'export'` against actual routes/features. SSR requires a compatible runtime. |
| API | **Node 24, TypeScript, Express 5, GraphQL Yoga/Pothos**, `mysql2`, handwritten SQL | Standard Node service/container is a direct fit; short-lived edge functions are **not** a direct replacement. |
| ETL/scheduler | NFL data from nflverse, `node-cron` in same Node process, daily **06:00 America/New_York**; historical backfill CLI | Either run VM continuously or create a **separate scheduled job**; do not expect in-process cron to fire when API sleeps. |
| Database | **Actual MySQL 8**; session `TEMPORARY` tables, transaction/foreign key semantics, DDL for staging | MySQL-wire compatibility alone is not enough; test exact SQL and connection/session handling. |
| Size now | ~**410 MB** MySQL, ~**235 MB** CSV source data; ~6,900 player rows/season | These are **not** peak RAM, disk staging, full backfill runtime or DB transaction-rate measurements. |
| Users | One at launch; every account-owned row has `user_id`, Firebase auth and request authorization | Do not compromise user isolation, persistent DB state or security to obtain a free tier. |
| Reliability | Single host acceptable initially; user-owned rows **not rebuildable** from NFL source data | Independently recoverable encrypted backups must be verified. |
| Owner priorities | One developer; **≤$15/month**; preferably free; one provider preferred | Cost is significant, but avoid hidden maintenance, reliability or surprise billing costs. |
| Deploy gates | MTDP, auth milestone before public exposure, production hardening | The hosting choice does not waive the existing gates. |

**Phase 1** serves player explorer and NFL scores/schedule. Later phases connect leagues on Sleeper/Yahoo/ESPN, provide roster/lineup/trade workflows and historical snapshots, and add a custom projections model. User-data refresh targets are **≤15 minutes outside games** and **≤60 seconds during games**; the live board polls roughly every 30–60 seconds. Those later targets must be assessed **end to end**; a scheduler that fires once a minute is not by itself proof of 60-second freshness.

### 2.2 Hard gates versus allowed compromises

**Non-negotiable for a deployable configuration:** a usable HTTPS authenticated Express/GraphQL endpoint; durable **real MySQL 8** with working required SQL/session operations; a runner capable of completing/retrying ingestion independently of browser requests; outbound access to NFL releases and Firebase; secrets management; and a verified recovery approach for irreplaceable data.

**Allowed with a documented ADR where needed:** API sleeping/cold starts, independent scheduler and job, multi-provider hosting, one VM and no high availability at launch, adding a separate worker later. **Not silently allowed:** migration to PostgreSQL/TiDB, use of a provider that drops temporary-table semantics, an ephemeral database, or weakening Firebase/auth boundaries. The backend's single-process scheduling is the **current decided topology**; changing it requires recording the decision and disabling duplicate in-process scheduling.

### 2.3 Cost scope and future scope

Every configuration is evaluated as **frontend + API + persistent MySQL + ETL/scheduling**, not API alone. Posted prices are generally **base recurring floors** excluding taxes, domain, off-provider backup storage, outbound/network/registry/logging overages and operator hours unless specified. The $15 target is a **cost constraint, not a proven spending cap** on usage-billed platforms. Prices can change by country, contract term, promotional period and resource use.

Future features (lineup polling, projections, notifications, AI-generated articles/reports, agentic permitted platform actions) and the possible hosting of **one or two other Node/Next/MySQL apps** are *secondary* criteria—**8% combined scoring weight**. AI inference/API fees, SMS/email delivery and any third-party service charges are **not** included in the $15 hosting estimate because model/provider/volume choices are not known. Platform API restrictions and supported write operations are requirements outside the power of a hosting provider to fix.

---

<a id="rankings"></a>
## 3. Ranked complete hosting configurations

**Comparable scorecard:** 11 configurations received ratings in the most recent neutral reranking and remain the **formal scored set**, shown in order below. Scores are weighted engineering judgments—not measured performance or uptime probabilities. Six additional surveyed configurations and their explicit comparison/exclusion status appear in §5; they are **not assumed worse because they lack a score**. All baseline costs require checkout/billing confirmation.

| Rank | Complete configuration | Indicative base recurring cost | Score /100 | Main reason | Principal limitation | Evidence confidence |
|---:|---|---:|---:|---|---|---|
| **1** | **[OVHcloud VPS-1](https://us.ovhcloud.com/vps/)** — Next.js + Express/cron + self-hosted MySQL | **From $4.54**; ~**$5.35** earlier flexible estimate | **79.3** | Closest fit to current code, one bill | Self-managed host/DB; 4 GB shared | **Medium** (resources published; workload untested) |
| **2** | **[Oracle Always Free A1 VM](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)** — all three components | **$0** if free resources available/eligible | **77.5** | Lowest cash; flexible 12 GB allowance | Capacity, ARM builds, idle reclamation | **Conditional** |
| **3** | **[Cloud Run API + Jobs](https://cloud.google.com/run/pricing) + [Scheduler](https://cloud.google.com/scheduler/pricing) + [Aiven](https://aiven.io/pricing/mysql) + [Pages](https://developers.cloudflare.com/pages/)** | **~$5+** if Google free allowances suffice | **76.6** | Managed compute and separate scheduled ETL | Aiven 1 GB RAM/8 GB disk; cross-cloud overhead | **Conditional** |
| **4** | **[OVHcloud VPS-2](https://us.ovhcloud.com/vps/)** — all components | **From $8.50**; ~**$10** earlier flexible estimate | **76.0** | 8 GB capacity and straightforward growth | Pays more before measured need | **Medium** |
| **5** | **[Contabo Cloud VPS 4](https://contabo.com/en-us/pricing/)** — all components | **€4.40/month promotional, 24-month term advertised** | **75.1** | 8 GB RAM/100 GB SSD for low sticker price | Setup/term/renewal and I/O unverified | **Conditional on quote** |
| **6** | **[IONOS VPS S+](https://www.ionos.com/servers/vps)** — all components | **~$6** | **73.8** | Simple conventional VPS | 2 GB RAM; peak ETL contention | **Medium-low** |
| **7** | **[DigitalOcean 2 GiB Droplet](https://www.digitalocean.com/pricing/droplets)** — all components | **$12** | **68.2** | Conventional developer-friendly VM | Less RAM for more money | **High price; unknown workload** |
| **8** | **[Railway Hobby](https://docs.railway.com/pricing/plans)** — API, job and persistent MySQL service | **$5 minimum**, usage-billed | **66.8** | Easy per-repo service deployment | Constant RAM/CPU, volume and egress may exceed budget | **Low bill predictability** |
| **9** | **[Render Free](https://render.com/docs/free) + [Render Cron](https://render.com/docs/cronjobs) + [Aiven](https://aiven.io/pricing/mysql) + static frontend** | **~$6+** | **66.6** | Sleeping API with provider-native job | Cold starts; free quotas; 1 GB DB | **Conditional** |
| **10** | **[Koyeb Free](https://www.koyeb.com/docs/reference/instances) + [GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) + [Aiven](https://aiven.io/pricing/mysql)** | **~$5+** | **65.4** | Lowest-cost experimental split stack | Tiny API CPU/RAM; schedule best effort | **Conditional** |
| **11** | **[Vercel Hobby](https://vercel.com/docs/plans/hobby) adapted API + [Aiven](https://aiven.io/pricing/mysql) + separate job** | **~$5+ only if limits/terms met** | **62.0** | Strong Next.js deployment path | Express runtime refactor; noncommercial restriction | **Conditional / weaker fit** |

**Takeaway:** #1–#3 are within **2.7 points**. A single one-point change on a 20%-weight/5-point scale changes the total by **4 points**, enough to reorder them. Price-to-RAM comparisons are **not performance benchmarks**; none has passed a real ETL/SQL compatibility test. The prices above are bases, not all-in invoices.

### Model selection: what a score does not show

A **VM** allows the existing one-process API/scheduler to remain as designed. A **managed/API-scale-to-zero** stack requires an ETL CLI invoked externally; it trades VM administration for IAM, multiple providers and database tiers. The **free VM** has possible reclamation and provisioning constraints; a **free sleeping API** has cold starts but can be legitimate if the job runs elsewhere. Free frontend hosting is only free *for this application* if the actual Next.js build satisfies the provider's static-export requirements.

---

<a id="evaluations"></a>
## 4. Detailed evaluations of ranked options

Each option below uses the same decision fields: **deployment**, **cost/resources**, **fit and scheduling**, **CI/CD and expansion**, **risk/required proof**, and **assessment**. Plan descriptions and offer prices are provider-published facts or previously recorded indicative estimates; claims about this app's capacity are **inferences pending tests**.

<a id="option-1"></a>
### 4.1 — #1 OVHcloud VPS-1 (79.3)

- **Deployment:** One Linux VM hosting HTTPS proxy (e.g. Caddy), Next.js, Express/GraphQL + `node-cron` + ETL, and MySQL 8 on a private container network.
- **Cost/resources:** [OVH US](https://us.ovhcloud.com/vps/) advertises **2 vCores, 4 GB RAM, 40 GB NVMe, from $4.54/month**, with a daily prior-24-hour backup. The previous **~$5.35 flexible-monthly** estimate is **not an independently verified checkout**; off-host logical DB backups extra.
- **Fit and scheduling:** No scheduler refactor needed; real MySQL 8 and session locks can run locally; one VM is a permitted launch single point of failure.
- **CI/CD and expansion:** GitHub Actions builds/tagged images and deploys to the VM; second apps can use distinct containers, secrets, DB schemas and proxy routes until shared RAM/I/O becomes limiting.
- **Risk/required proof:** Full ETL + concurrent API within **4 GB**, recovery to another machine, firewall/patching/admin time, backup retention, actual US-monthly renewal price.
- **Assessment:** Best **current-code / predictable-base-cost** reference, **not** a proven workload fit or universal winner.

<a id="option-2"></a>
### 4.2 — #2 Oracle Cloud Always Free A1 (77.5)

- **Deployment:** One eligible **ARM64** OCI A1 VM for the same three runtime components and self-managed MySQL; Docker images/native dependencies must support ARM64.
- **Cost/resources:** [Oracle's official policy](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) grants **1,500 A1 OCPU-hours and 9,000 GB-hours/month** (roughly **2 OCPUs and 12 GB RAM** over a full month), plus qualifying block-storage allowance, if eligible and provisionable. Not a promise that capacity is available.
- **Fit and scheduling:** Existing `node-cron` works while VM runs. All-in-one platform avoids outside MySQL charges; underlying VM, not a managed DB, supplies **actual MySQL 8**.
- **CI/CD and expansion:** GitHub Actions deploys ARM64/multiarch images. Nominal free memory may accommodate more small applications, but capacity and account quotas are shared.
- **Risk/required proof:** **Potential idle reclamation**, free-region stock-outs, backup/restore after loss, ARM64 build, no guarantee of instant reprovisioning; do not generate artificial usage to avoid the policy.
- **Assessment:** Best **$0 nominal** option if disruption and provisioning risk are explicitly acceptable; see the implementation-specific idle discussion in §4.2a.

#### 4.2a — Oracle idle rule applied to Fantasy Workbench

Oracle says an Always Free VM **may** be reclaimed if **all** applicable conditions hold over **seven days**: **95th-percentile CPU utilization <20%**, **network utilization <20%**, and **for A1 only, memory utilization <20%** ([Oracle policy](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)). Running Docker and a 06:00 ET cron does **not** independently prove the instance is active under that policy. One person browsing intermittently plus a short daily ETL is **plausibly** low CPU/network utilization; the 95th percentile especially will not be rescued by just a brief daily burst. If the VM is allocated **12 GB**, 20% memory is **2.4 GB**; if allocated **4 GB**, it is **0.8 GB**. Actual resident memory and Oracle's measured metrics remain unknown, so **reclamation likelihood cannot be quantified**. Genuine additional apps might change utilization, but they do not guarantee safety; independent backups and a tested alternate host are mandatory.

<a id="option-3"></a>
### 4.3 — #3 Cloud Run + Cloud Scheduler + Aiven + Cloudflare Pages (76.6)

- **Deployment:** [Cloud Run](https://cloud.google.com/run/pricing) request-based Express container (minimum instances zero); separately launched **Cloud Run Job** runs the existing ETL command; [Cloud Scheduler](https://cloud.google.com/scheduler/pricing) triggers it; [Aiven MySQL](https://aiven.io/pricing/mysql) persists data; [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) serves the frontend **if static export works**.
- **Cost/resources:** [Aiven Developer](https://aiven.io/free-mysql-database-retired) is **$5/month**, **1 CPU, 1 GB RAM, 8 GB storage**, with a single disaster-recovery backup and **no HA/uptime SLA**. The [next Hobbyist tier begins at $19/month](https://aiven.io/pricing/mysql), outside the total budget. Google compute/job/schedule may fit free allowances for low usage, but networking, registry, logging, extra jobs and off-host backups mean **$5 is a floor**, not an assured total.
- **Fit and scheduling:** This is **not** the current deployment unchanged: disable API `node-cron`, build a separately invokable idempotent ETL image/command, secure cross-cloud MySQL with TLS, and record the scheduler ADR. Cloud Scheduler supports time zones; test New York DST behavior.
- **CI/CD and expansion:** GitHub Actions can release API and job from the **same versioned backend image**; independent scaling helps transient compute/second apps, but each new managed database may incur a separate monthly charge or consume shared DB capacity.
- **Risk/required proof:** Aiven's exact `TEMPORARY`, DDL/grants and staging transactions; full backfill on **1 GB database RAM**; cross-cloud latency/egress, static frontend build, first invoice and retention/restore.
- **Assessment:** Strongest **low-OS-admin** contender, conditional mainly on the low-cost DB tier.

<a id="option-4"></a>
### 4.4 — #4 OVHcloud VPS-2 (76.0)

- **Deployment:** Same single-host architecture as VPS-1, but with more resources; scheduler remains in-process unless changed deliberately.
- **Cost/resources:** [OVH US](https://us.ovhcloud.com/vps/) advertises **4 vCores, 8 GB RAM, 75 GB NVMe, from $8.50/month**; **~$10 flexible-monthly** was a prior estimate, not a fresh checkout quote.
- **Fit and scheduling:** Direct fit for Node and self-managed MySQL 8; increased shared capacity could reduce ETL/UI contention.
- **CI/CD and expansion:** Same Actions→image→VM flow; more realistic shared room for an additional app or CPU-intensive projections, while retaining a single failure domain.
- **Risk/required proof:** Resource use must justify extra expense; verify actual price/upgrade path and backup/restore.
- **Assessment:** Best **straightforward scale-up** if 4 GB fails the acceptance test, not necessary on published database size alone.

<a id="option-5"></a>
### 4.5 — #5 Contabo Cloud VPS 4 (75.1)

- **Deployment:** All components and MySQL 8 on one Linux VPS, with original cron or isolated system job.
- **Cost/resources:** [Contabo](https://contabo.com/en-us/pricing/) advertises **4 vCPUs, 8 GB RAM, 100 GB SSD** and a **€4.40/month headline tied to a 24-month term**. Currency, region, setup fees, first invoice and renewal need checkout review; this is not a verified no-commitment USD quote.
- **Fit and scheduling:** Generic x86 Linux and a durable disk support the existing runtime in principle.
- **CI/CD and expansion:** Docker/GitHub deployment and several segregated applications are feasible within measured resource limits.
- **Risk/required proof:** Performance/I/O under ETL, contractual total cost, backup strategy, sustained service quality; vCPU count alone does not indicate throughput.
- **Assessment:** Strong nominal hardware-per-price alternative, **conditional on price terms and a workload trial**.

<a id="option-6"></a>
### 4.6 — #6 IONOS VPS S+ (73.8)

- **Deployment:** Same all-in-one VM layout, real MySQL 8 and present in-process cron.
- **Cost/resources:** [IONOS](https://www.ionos.com/servers/vps) lists VPS S+ around **$6/month** with **2 GB RAM**; verify CPU, region, renewal and order terms at checkout.
- **Fit and scheduling:** Straightforward Linux/Node/MySQL deployment; limited headroom for full backfill while serving GraphQL.
- **CI/CD and expansion:** Generic SSH/container GitHub deploy; an additional substantial app likely creates earlier memory pressure than on 4/8 GB alternatives.
- **Risk/required proof:** Combined Node/MySQL RSS, swap/no-swap and staging disk behavior, recovery and real recurring quote.
- **Assessment:** Viable budget VM but **weaker resources per quoted dollar** than OVH's 4 GB offer.

<a id="option-7"></a>
### 4.7 — #7 DigitalOcean 2 GiB Droplet (68.2)

- **Deployment:** One Droplet for Next.js + Express/ETL + MySQL 8; continuous API and local scheduling.
- **Cost/resources:** [DigitalOcean](https://www.digitalocean.com/pricing/droplets) lists **$12/month**, **1 vCPU, 2 GiB RAM, 50 GiB disk** for this size.
- **Fit and scheduling:** Standard Linux virtual machine; no application architecture shift.
- **CI/CD and expansion:** Works with GitHub Actions and Docker; disk/network/monitoring integrations are available, but separate apps share tight memory.
- **Risk/required proof:** ETL/API peak use, 2 GB feasibility, paid backup and final bill.
- **Assessment:** Conventional operational choice; **less price-capacity headroom** at the stated budget.

<a id="option-8"></a>
### 4.8 — #8 Railway Hobby (66.8)

- **Deployment:** Separate Railway services for API, job execution and persistent **self-managed MySQL 8** on a volume; verify that the chosen scheduling topology actually invokes jobs without keeping a second always-running worker.
- **Cost/resources:** [Railway Hobby](https://docs.railway.com/pricing/plans) is a **$5/month minimum** with usage credit—not a $5 all-in guarantee. Published meters include **RAM $10/GB-month**, **CPU $20/vCPU-month**, **volume $0.15/GB-month**, **egress $0.05/GB**. As an illustration, **1.5 GB memory continuously resident would cost ~$15/month for RAM alone**, before other usage.
- **Fit and scheduling:** Containers/volumes can accommodate Node and MySQL; sleeping/free variants cannot be assumed to preserve the present cron.
- **CI/CD and expansion:** Excellent repo→service deployment ergonomics; additional apps and idle MySQL all contribute to shared usage bills.
- **Risk/required proof:** Metered cost model using real CPU/RAM-hours, volume and egress; validated scheduler, DB durability, backup/restore, and cost-control behavior.
- **Assessment:** Operationally convenient; **billing uncertainty** is the main reason it ranks below inexpensive VMs.

<a id="option-9"></a>
### 4.9 — #9 Render Free + Render Cron + Aiven (66.6)

- **Deployment:** [Render Free web API](https://render.com/docs/free) (can sleep), separate [Render Cron Job](https://render.com/docs/cronjobs) for ETL, [Aiven MySQL](https://aiven.io/pricing/mysql), static frontend host if compatible.
- **Cost/resources:** **~$5 Aiven + at least $1/Render cron service/month**, plus actual cron compute and optional extras. Free web sleeps after approximately **15 minutes** without inbound traffic; requests can incur wake-up latency.
- **Fit and scheduling:** Separate cron preserves daily ETL independent of sleeping API; Render cron expressions use **UTC**, so handling **06:00 Eastern with DST** requires deliberate scheduling logic or adjustment.
- **CI/CD and expansion:** GitHub-connected web/job deploys; additional free/paid services and Aiven DB capacity/charges constrain reuse.
- **Risk/required proof:** Cron runtime and cost, cold-start tolerance, DB SQL/1 GB tier, correct ET schedule and backups.
- **Assessment:** Plausible prototype or low-volume stack; weaker certainty than Cloud Run's job pattern.

<a id="option-10"></a>
### 4.10 — #10 Koyeb Free + GitHub Actions ETL + Aiven (65.4)

- **Deployment:** [Koyeb Free](https://www.koyeb.com/docs/reference/instances) API, [scheduled GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) runner for the independent ETL CLI, Aiven Developer DB and optional static frontend.
- **Cost/resources:** **~$5 Aiven baseline** if runner minutes and web remain within allowances. Koyeb Free offers **0.1 vCPU, 512 MB RAM, 2 GB ephemeral SSD**, one free instance per organization and scale-to-zero after about **one hour** without traffic; its documentation says **not for production applications**.
- **Fit and scheduling:** A sleeping Express instance is acceptable with an independent ETL job, but GitHub scheduled workflows are **best effort**, not guaranteed to start at 06:00 precisely; MySQL must be accessed securely from runner hosts.
- **CI/CD and expansion:** Simple GitHub-native build/run; one-free-instance limit leaves little room for another application under the same free allowance.
- **Risk/required proof:** API boot, Node 24 RAM, SQL access and grants, runner minutes, late/dropped ETL detection and recovery.
- **Assessment:** Low-cost **nonproduction experiment**; not preferred for unattended game-window workflows.

<a id="option-11"></a>
### 4.11 — #11 Vercel Hobby adapted API + Aiven + separate job (62.0)

- **Deployment:** [Vercel Hobby](https://vercel.com/docs/plans/hobby) serves Next.js well, but the existing Express API and multi-minute ETL must be **adapted** for a supported API/serverless model or hosted externally; Aiven supplies MySQL and an independent job host runs ingestion.
- **Cost/resources:** **~$5 Aiven floor** only with Vercel usage in free limits and a separately affordable scheduled runner. **Hobby is for personal, noncommercial use** under the documented terms.
- **Fit and scheduling:** More changes than other choices; cannot simply place the existing always-on Express + `node-cron` process in a Vercel Function and expect it to stay alive.
- **CI/CD and expansion:** Excellent GitHub→Next.js workflow; future monetized reports or other commercial apps would require reevaluating Hobby eligibility.
- **Risk/required proof:** Serverless API rewrite scope, request/runtime limits, trusted GraphQL documents, separate ETL, actual total cost.
- **Assessment:** Consider **for frontend hosting**, not as the preferred complete backend architecture.

---

<a id="alternatives"></a>
## 5. Alternative, conditional and excluded options

### 5.1 Six additional surveyed configurations — explicit disposition

These options were present in earlier surveys but **not rated in the 11-option numerical reranking**. Each is assessed under the same deployment, cost, scheduling/CI, expansion, risk and disposition fields. **Unscored means incomparable evidence or redundant topology—not a hidden low ranking.** A newly measured/quoted option may be promoted into the next decision scorecard using §6.

| Configuration and deployment | Cost | Scheduling / CI and reuse | Main uncertainty or disadvantage | Disposition |
|---|---|---|---|---|
| **[Render Free + GitHub Actions + Aiven](https://render.com/docs/free) + Pages** | **~$5+** assuming included Actions minutes | Same sleeping API/DB as #9; Actions runs ETL; GitHub-native, additional services share quotas | Actions daily trigger can run late or be dropped; no Render Cron minimum, but not the same scheduling assurance | **Alternative execution variant of #9**; not a distinct platform score until a schedule SLA/tolerance is specified |
| **[Koyeb Free + Cloud Run Job + Aiven](https://www.koyeb.com/docs/reference/instances) + Pages** | **~$5+** under Google free quota | Koyeb web and managed Google job improve ETL isolation; multiple providers | Same **0.1 vCPU/512 MB** free API and Aiven constraints as #10; extra IAM/operational coordination | **Execution variant of #10**; compare if Actions delays prove unacceptable |
| **[Koyeb Eco Small paid + Aiven + independent ETL job](https://www.koyeb.com/docs/reference/instances)** | Koyeb **$5.36/month** + Aiven **$5** + separate job/network costs (**$10.36+**) | 1 GB paid API, GitHub deploy; job needs a distinct host/trigger; DB still separate | Narrow <$15 margin, and no complete job/egress quote; full ETL untested | **Conditional price competitor**; get full quote before scoring |
| **[Hetzner cost-optimized VPS + self-hosted MySQL](https://www.hetzner.com/cloud/cost-optimized/)** | **TBD by region, IPv4, post-June-2026 pricing** | VM and Node/cron/MySQL fit; Actions deploy; reused Docker host possible | Orderable region-specific plan/IPv4+tax quote not established in earlier studies | **Conditional VPS competitor**; no unsupported numerical score until quote and location available |
| **[AWS Lightsail 2 GB with public IPv4](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html)** | **$12/month**, **2 vCPU, 2 GB, 60 GB** published | Conventional single VM and cron/MySQL; GitHub deploy; can host another small app within memory | Memory tighter and price higher than top VPS; independent SQL backup needed | **Viable comparison provider**; omitted from the inherited 11-score matrix, **not technically excluded**; score if shortlist expands |
| **[Fly.io Machines + self-hosted persistent MySQL](https://fly.io/pricing-update/)** | **Usage-dependent**; previous **~$13.47** figure is **obsolete/unverified** after **October 1, 2026** machine pricing change | Independent Node machine(s), volume-backed MySQL, GitHub deploy and auto-stop opportunities | Need defensible API+DB VM sizing, volume/backup, scheduler and price scenario; small persistent DB may crowd budget | **Conditional metered competitor**; cannot claim under $15 until sized |

**Other ordinary VPS providers:** [Vultr](https://www.vultr.com/pricing/) and [Akamai/Linode](https://www.akamai.com/cloud/pricing/cpu) are viable standard Linux/MySQL hosts, but there was no documented, fully comparable US plan/checkout and workload advantage in the inherited research. Neither is declared inferior by default. This watchlist avoids treating an unscored vendor as an exclusion.

### 5.2 Attractive free services that are **not validated replacements**

| Candidate | Published attraction | Technical or policy issue | Current treatment |
|---|---|---|---|
| **[Enzonic free MySQL 8.4](https://databases.enzonic.com/)** | Advertises up to 3 GB/database, 10 GB account total, sleep after five minutes without connections, backups | **Actual MySQL 8.4** is promising, but the young service's durability, DDL privileges, connection wake behavior, session locks, temp tables and full ETL capacity **are untested** | **Investigate as $0 database proof of concept**; do not rank as production-ready |
| **[Oracle MySQL HeatWave Always Free](https://docs.oracle.com/en-us/iaas/mysql-database/doc/features-mysql-heatwave-service.html)** | Potential managed free MySQL | Distinct from free A1 VM; provider-selected version/lifecycle, network topology and SQL capabilities need to match actual MySQL 8 decision | Conditional; do not silently substitute for self-managed MySQL 8 |
| **[TiDB Cloud Starter](https://docs.pingcap.com/tidb/stable/locking-functions/)** | Free MySQL-protocol-like database | **Not the same MySQL 8 engine**; session and locking behavior may differ | **Excluded without new database ADR and full SQL compatibility study** |
| **[Aiven Free MySQL (legacy)](https://aiven.io/free-mysql-database-retired)** | Older references show a $0 MySQL option | **No new free MySQL services** as of Nov. 2026; $5 Developer is new-entry choice | **Excluded** from new-application budget |
| **[GitHub Actions alone](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)** | Can run scheduled ingestion within eligible Actions quotas | Does **not** host a persistent MySQL DB or user-facing GraphQL endpoint; minimum **five-minute** cron interval and delayed/dropped triggers | Use as **job component**, not a complete platform |
| **[Google Cloud e2-micro Always Free](https://cloud.google.com/free/docs/free-cloud-features)** | Free eligible tiny VM | Limited compute/RAM for OS + Node + MySQL + backfill; applicable networking/IP costs and region must be checked | Not preferred without separate measured tiny-instance proof |
| Free PostgreSQL tiers | Often robust and free | Conflict with the decided MySQL-only architecture | Excluded unless new ADR deliberately changes the DB engine |

### 5.3 Shared scheduling and CI/CD comparison

| Scheduler/runner | 06:00 Eastern daily ETL | Later ≤60-second league-data target | Important qualification |
|---|---|---|---|
| **Existing `node-cron` on VM** | Direct fit while VM healthy | A frequent worker is possible, but end-to-end freshness unproven | Monitor missing runs, duplicate execution and restarts. |
| **[Cloud Scheduler → Cloud Run Jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule)** | Supports New York timezone and managed execution | Minute-level triggers possible; latency/rate budgets can still violate 60 s | Cloud Scheduler includes **three free schedules per billing account** ([pricing](https://cloud.google.com/scheduler/pricing)); job compute, egress and runtime bill separately above quotas. |
| **[GitHub Actions `schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)** | Supports IANA `timezone` and 06:00 ET, **best effort** | **No** for strict 60-second target; cron minimum 5 minutes | High loads can delay/drop scheduled workflow; default branch only; project/repo runner minutes aggregate. |
| **[Render Cron](https://render.com/docs/cronjobs)** | Yes, **UTC-based** expressions, DST handling required | Frequent polling theoretically possible; cost/freshness unverified | **$1/month minimum per cron service**, runtime-based compute, max **12-hour** job. |
| **[Cloudflare Workers Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/)** | Can trigger a separate job | Can trigger lightweight tasks, not prove freshness | Workers CPU/runtime constraints make them **not** a drop-in execution host for existing streamed CSV→MySQL ETL. |

**Minimum safe change to allow an API that sleeps:** (1) retain the ETL/backfill entry point and make it independently runnable with accurate exit codes; (2) release a job executable (ideally the **same versioned backend image** with a different command); (3) disable `node-cron` in the API deployment; (4) preserve the staging transaction and run ledger; (5) detect **missed** as well as failed jobs; (6) store no durable job state in an ephemeral container; (7) connect to DB over authenticated TLS with least privileges. This is a **scheduler/deployment ADR**, not a replacement for the chosen API/data architecture.

**CI/CD ownership across three repos:** `runpure-ff-planning` runs docs/PRD/ADR checks and deploys nothing; `runpure-ff-backend` runs Node tests, GraphQL schema/trusted-operation checks and **real MySQL 8 integration tests**, builds a pinned Docker image, and deploys API plus optionally the ETL job; `runpure-ff-frontend` runs typecheck/tests/build and contract validation, then deploys Next.js to the chosen host. Require protected branches, release tags/rollback, least-privilege deployment credentials, build/registry-cost awareness, and approved hand-applied ordered SQL statements. Avoid deploying frontend persisted GraphQL documents and backend allowlist out of sync.

### 5.4 Later features and an additional-app environment

| Growth example from the supplied overview | VPS / Oracle implications | Managed / sleeping-service implications |
|---|---|---|
| Viewing leagues, roster snapshots and up-to-the-minute lineup/trade data | Frequent background jobs share VM CPU/RAM; separate worker later if needed | Worker/job cadence and external DB latency matter; API sleeping is **not** the same as background work sleeping. |
| Projections/rankings, analytics, matchup analysis | Batch compute may contend with GraphQL unless separate process; 8 GB upgrade may help | On-demand batch job scales separately; DB or billed CPU can become limiting. |
| News/weather alerts and notifications | Reliable worker, outbound APIs and retry/audit needed | Managed scheduler/queues helpful; recurring jobs and delivery charges may add up. |
| AI-generated articles/reports and agentic actions | Hosting orchestrator is easy; external model cost and API permissions/verification dominate | Same; serverless execution may suit bursts, but agentic lineup actions need verified permitted write paths and fail-closed behavior. |
| **One or two other similar apps** | Share host cost and deployment tooling, but **isolate** app processes, secrets, schema/users, backups and deployment; blast radius and peaks shared | Free/API quotas shared or per-app, separate DBs may each cost **$5+**, and multi-cloud operations/credentials multiply. |

**Do not provision extra RAM, databases, GPU compute or queues today solely for speculative expansion.** Keep job entry points, data ownership and backups separable so capacity changes do not require a rewrite.

---

<a id="methodology"></a>
## 6. Evaluation methodology and scoring audit

### 6.1 Method and evidence boundaries

The process was: extract architectural constraints from supplied documents; build **complete configurations** (frontend, API, MySQL, job runner and deployment); check official provider product/pricing/policy pages; treat scheduling separation as **permitted but not yet implemented**; rank 11 comparable configurations with a disclosed weighted rubric; retain six further surveyed variants/providers with **specific reasons not to invent scores**; test sensitivity by changing weights; specify what only actual deployment tests can prove. The previous report's score inputs are carried forward **unchanged** to preserve the already-requested unbiased reranking—not recalibrated to favor any provider in this structural rewrite.

**Evidence classifications:** **D** = stated in supplied design/overview; **P** = provider-published price/feature/policy as of research date; **E** = engineering estimate/inference; **U** = unknown/unverified. Product pages do **not** establish throughput, 99th-percentile latency, backups having been tested, or that a configuration fits actual ETL memory.

### 6.2 Weights and rating anchors

| Dimension | Weight | What the reviewer considered |
|---|---:|---|
| **C — Complete recurring cost** | **25%** | Frontend + API + database + scheduled execution; free allowance and paid-upgrade cliffs |
| **F — Architecture/runtime fit** | **20%** | Actual MySQL 8, session SQL, Node/Express runtime, ETL CLI and required changes |
| **R — Reliability/recovery** | **20%** | Free instance reclaim/sleep, durability, restart behavior, recoverability and failure domains |
| **O — Operational effort** | **15%** | Single-developer OS/DB maintenance, IAM, deployments, cross-provider networking |
| **P — Billing predictability** | **10%** | Fixed quote, renewal/promotion, metering, IP/NAT/egress and DB tier steps |
| **G — Future features and similar apps** | **8%** | Game polling, model jobs, notifications, ability to safely share or expand environments |
| **CI — GitHub CI/CD** | **2%** | Tests, images, deploys, release control and rollback integration |
| **TOTAL** | **100%** | The speculative growth factor **cannot overwhelm** present fit/cost/recovery. |

Each rating is **0–5**: **0** = fundamentally unworkable; **1** = serious obstacle; **2** = substantial compromise; **3** = workable with caveats; **4** = good; **5** = excellent. Decimal subratings are **judgments**, not objective measurements. **Total score (0–100) = Σ(weight in percentage points × rating ÷ 5).** Costs are *not* reduced to simple $/GB: RAM/disk are insufficient proxies for real SQL/ETL performance.

### 6.3 Complete inherited scoring matrix (independently recomputable)

| Configuration | C | F | R | O | P | G | CI | **Weighted /100** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **OVH VPS-1** | 4.3 | 5.0 | 3.2 | 2.7 | 4.5 | 3.9 | 4.2 | **79.3** |
| **Oracle A1 Always Free** | 5.0 | 4.7 | 2.2 | 2.5 | 4.2 | 4.6 | 4.0 | **77.5** |
| **Cloud Run + Aiven + Pages** | 4.2 | 4.2 | 3.3 | 4.0 | 3.4 | 3.1 | 4.5 | **76.6** |
| **OVH VPS-2** | 3.4 | 5.0 | 3.3 | 2.6 | 4.5 | 4.6 | 4.2 | **76.0** |
| **Contabo VPS 4** | 4.2 | 5.0 | 3.0 | 2.5 | 2.8 | 4.6 | 4.0 | **75.1** |
| **IONOS VPS S+** | 4.0 | 4.8 | 3.1 | 2.8 | 4.0 | 2.6 | 4.0 | **73.8** |
| **DigitalOcean 2 GiB** | 2.5 | 4.8 | 3.3 | 2.8 | 4.3 | 2.8 | 4.5 | **68.2** |
| **Railway Hobby** | 3.2 | 4.1 | 2.8 | 3.6 | 2.5 | 3.5 | 4.5 | **66.8** |
| **Render Free + Cron + Aiven** | 3.6 | 3.4 | 2.6 | 4.0 | 3.5 | 2.4 | 4.5 | **66.6** |
| **Koyeb Free + Actions + Aiven** | 4.2 | 3.2 | 2.2 | 3.5 | 3.8 | 1.8 | 4.5 | **65.4** |
| **Vercel Hobby + Aiven + job** | 4.2 | 1.5 | 2.7 | 3.8 | 3.5 | 2.5 | 4.5 | **62.0** |

**Illustrative calculation, OVH VPS-1:** `25×4.3/5 + 20×5.0/5 + 20×3.2/5 + 15×2.7/5 + 10×4.5/5 + 8×3.9/5 + 2×4.2/5 = 79.32 ≈ 79.3`.

**Meaning of subjective differences:** OVH's **F=5.0** reflects minimal topology changes, **O=2.7** self-admin cost; Oracle's **R=2.2** reflects availability/reclamation risk, **not observed Oracle downtime**; Cloud Run's **O=4.0** reflects managed compute, while **R=3.3/P=3.4** reflect the untested Aiven single-node tier and variable cross-cloud costs. All three scores remain conditional on actual DB functionality and recoverability. A single-point subrating change at 20% weight changes the final score **4 points**, larger than the top-three gap.

### 6.4 Sensitivity: same ratings, alternative weights

The subratings above are **held fixed**; only the criterion weights change. Weight order is **C/F/R/O/P/G/CI**.

| Scenario | Weights (%) | #1 | #2 | #3 |
|---|---|---|---|---|
| **Balanced baseline** | **25/20/20/15/10/8/2** | OVH VPS-1 **79.3** | Oracle A1 **77.5** | Cloud Run + Aiven **76.6** |
| **Cash-first** | **40/20/10/10/10/8/2** | Oracle A1 **85.6** | OVH VPS-1 **83.1** | Contabo **79.2** |
| **Minimal administration** | **15/15/20/30/10/8/2** | Cloud Run + Aiven **76.0** | OVH VPS-1 **73.8** | OVH VPS-2 **72.0** |
| **Reliability emphasis** | **15/20/30/15/10/8/2** | OVH VPS-1 **77.1** | OVH VPS-2 **75.8** | Cloud Run + Aiven **74.8** |

**Interpretation:** A plausible change in priorities changes the winner. “Objectivity” here means **traceable assumptions, consistent measurement dimensions and honest uncertainty**, not pretending estimated subratings are empirically proven. To compare an unscored but viable provider (e.g. Lightsail or Hetzner), obtain a complete equivalent offer and assign **all seven dimensions**, not an arbitrary overall number.

### 6.5 Cost arithmetic and assumptions

| Scenario | Illustrative arithmetic | Interpretation |
|---|---|---|
| **OVH VPS-1** | `1 VM × advertised from $4.54` | VM covers all runtime components; independent backup/domain/tax extra; promo/term not monthly guarantee. |
| **Oracle A1** | `eligible A1 free quotas × $0 = $0` | Only if successfully provisioned/eligible and within all charged-resource boundaries. |
| **Managed API** | `$5 Aiven Developer + Google/Pages usage within free quotas` | **$5+**, *not* all-in guarantee or a budget cap. Aiven's **$19** next tier already exceeds budget alone. |
| **20-min daily job** | `20×60×30 = 36,000 vCPU-seconds` at 1 vCPU | Order-of-magnitude **illustration**, not measured ETL runtime or complete job bill. |
| **GitHub runner** | `20 min/day × 30 = 600 runner minutes` | Plus dependency installation and PR CI; hosted runner entitlements are **shared**, not per app. |
| **One additional separate Aiven DB** | `2 × $5 = $10/month` for two Developer instances | Leaves $5 for API/jobs/traffic/backups under existing budget; separate managed DB may be costly. |
| **Railway persistent memory** | `1.5 GB-month × $10/GB-month = $15` | RAM charge illustration **alone**; CPU, storage, egress and subscriptions need checking. |

**Unmeasured / deliberately *not* estimated as facts:** actual Node and MySQL peak RAM; MySQL index/staging headroom; duration of initial 2022–2026 backfill and daily incremental; runtime CPU contention; API p95; network utilization/egress; per-app request counts; backup storage growth; real cross-region DB RTT; checkout/first-month invoice; game-day API poll rates. Published storage size (~410 MB) does **not** establish those figures.

**Cost exclusions to add before purchase:** domain/DNS if not already owned; independent encrypted logical DB backup storage and restore tooling; Docker registry and builds; paid monitoring/log retention; external data transfer and NAT/static egress IP; taxes, setup fees, renewal/term conditions; optional alert/email/AI services. Provider backup snapshots with short retention **are not a verified recovery plan** for future user data. The no-bucket ADR concerns application data; a separate **encrypted backup archive** requires its own documented backup/recovery decision, not a silent redefinition of the application store.

---

<a id="validation"></a>
## 7. Validation plan and decision gates

An engineer should be able to resolve the close shortlist without consulting an older report. **Do not mark a candidate “approved” until these acceptance checks are recorded**; lack of test results is a known evidence gap, not a pass.

| Priority | Test and measurement | Pass condition / artifact | Options affected |
|---|---|---|---|
| **Gate** | **MySQL 8 SQL compatibility** on actual host/managed plan | Successful run with session temporary tables, staging DDL, FKs/transactions, TLS and least-privilege grants; test connection loss/retry | All; especially Aiven and Enzonic |
| **Gate** | **Complete 2022–2026 backfill and incremental ETL** | Record wall time, max Node RSS, MySQL RAM/CPU, temporary/index/staging disk high-water, bytes transferred and failure/recovery semantics; demonstrate no data corruption on termination | OVH 4 GB, Aiven 1 GB, small VPS/free APIs |
| **Gate** | **Encrypted off-host DB backup and independent restore** | Demonstrated recovery of owned rows, schema, ledger and future encrypted credentials with keys separate; record practical RPO/RTO | All; OCI reclamation is especially salient |
| **Gate** | **Reliable scheduled 06:00 ET execution** | One scheduling authority, appropriate DST behavior, idempotence/MySQL lock, retries, alert on failure **and missing expected run** | All, particularly Actions/Render/sleeping APIs |
| **Gate** | **Security and launch controls** | MTDP/auth milestone, Firebase ID-token verification, CORS, HTTPS/HSTS, proxy trust/rate limits, secrets, least-privilege DB and nonpublic DB access completed | All |
| **High** | **API + ETL concurrency** | Record GraphQL p50/p95/errors during ingest; protect DB from connection starvation; no user-visible unacceptable degradation | VM vs Cloud Run |
| **High** | **Frontend build and images** | `next build` static export pass/fail; SSR path selected otherwise; Node 24 and x86/ARM images build and boot | Pages/Vercel/OCI |
| **High** | **First-month all-in bill and repeatable quote** | Show line items for VM, DB, jobs, transfer, storage, backup, logs, registry, domain/tax and renewal; projected recurring total ≤$15 | Especially GCP/Aiven, Railway, Contabo, Fly |
| **Later** | **Game-window ≤60 s freshness** | Measured schedule→platform response→DB commit→GraphQL UI, including rate limits and failures; writes only where genuinely supported and verified | All future league/agent paths |
| **Optional** | **Second app dry run** | Different credentials/schema/restore and independent deploy; measured peak overlap and no unsafe cross-app access | Future/secondary 8% factor |

### Efficient proof-of-concept order

1. **Local baseline (no hosting purchase):** run real full ETL with a **4 GB aggregate Docker memory limit**, capture peak RAM/I/O/run duration, and exercise the exact MySQL 8 operations. Do not infer “4 GB fits” from 410 MB database size.
2. **Resolve frontend mode:** prove static export or budget a proper Next.js runtime. Use identical build output for provider comparisons.
3. **Try OCI only if eligible A1 capacity exists:** verify ARM64 and full restore **to a new VM**; document tolerance for reclamation and a paid-host fallback.
4. **Test the managed contender with an actual Aiven Developer database** and a Cloud Run Job running the same backend release image; record SQL privileges, full ETL, DB bottlenecks and billable egress. Do not assume Aiven 1 GB is sufficient.
5. **Compare a 4 GB VPS** (OVH or a genuinely equivalent priced offer) against the same workload. Record both engineer setup/maintenance effort and observed request/ETL behavior.
6. **Choose and record a hosting ADR** in the planning repository, including selected option, rejected alternatives, budget, recovery plan, scheduling topology and next-size/next-provider triggers. If external jobs are selected, add the scheduler ADR and update the system design.

### Decision rule after measurement

**Choose OVH VPS-1** if it passes all gates and minimizes implementation/operational overhead under the verified total price. **Choose OCI A1** if provisionable, build/restore passes, $0 is decisive and reclamation downtime is explicitly tolerable. **Choose Cloud Run+Aiven** if SQL/backfill and the **$5 database tier** actually pass and you value less VM administration; if the database requires the **$19** tier, this configuration **fails the current $15 ceiling** unless the budget or DB design changes. Upgrade to an 8 GB VM only for measured pressure or a concrete second workload, not hypothetical AI features.

**Status for ADR:** *Decision pending validation*. This report is sufficient as a **single engineering reference** replacing previous research drafts; it does not assert an unperformed performance test or make the hosting decision by itself.

---

<a id="sources"></a>
## 8. Sources and references

### Project documents reviewed

- **`system-design.md`, draft v2.5, 2026-11-19**, supplied in this conversation: system overview; requirements; multi-user guardrail; technology decisions; hosting/deployment requirements; pre-deployment hardening; three repositories and growth triggers. Intended repository location: `design/system-design.md`.
- **`00-overview.md`, updated 2026-11-18**, supplied in this conversation: project phases and feature dependency map; platform constraints and snapshot/live-data contract; deferred recommendations, notifications, AI writing/analysis and agentic lineup features. Intended repository location: `prds/00-overview.md`.
- The superseded November 20 research/reranking documents supplied earlier in this conversation provide the **inherited 11-option scoring assumptions and matrix**. Their provider and cost claims were rechecked where primary pages could be located; older unverifiable price examples are explicitly marked as estimates.

### Official provider references, linked to their decision use

| Reference | Primary documentation | Relevant evidence |
|---|---|---|
| OVHcloud | [US VPS plans](https://us.ovhcloud.com/vps/) | VPS-1/VPS-2 resources, advertised starting price, short-retention daily backup |
| Oracle Cloud | [Always Free resource/idle policy](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) | A1 2 OCPU/12 GB equivalence, eligible storage, reclaim criteria |
| Google Cloud Run | [Pricing and allowances](https://cloud.google.com/run/pricing), [Cloud Run Jobs](https://docs.cloud.google.com/run/docs/create-jobs), [scheduled jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule) | Separately billed service/job resources and job scheduling topology |
| Cloud Scheduler | [Pricing](https://cloud.google.com/scheduler/pricing), [cron/timezone caveats](https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules) | Three free schedules per billing account, timezone and DST |
| Aiven | [MySQL tiers](https://aiven.io/pricing/mysql), [free MySQL retirement](https://aiven.io/free-mysql-database-retired) | Developer $5, 1 CPU/1 GB/8 GB, no HA SLA; next tier $19; no new free MySQL |
| Cloudflare | [Static Next.js on Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Static export requirement, free build allowance, optional backup-object-storage pricing |
| GitHub | [Scheduled workflow rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | Timezone-aware cron, five-minute minimum, delayed/dropped events, CI minutes |
| Contabo | [Plans](https://contabo.com/en-us/pricing/), [VPS terms](https://contabo.com/en-us/vps/) | 8 GB plan, term-linked promotional prices, setup/renewal cautions |
| IONOS | [VPS plans](https://www.ionos.com/servers/vps) | VPS S+ basic price/size |
| DigitalOcean | [Droplet prices](https://www.digitalocean.com/pricing/droplets) | 2 GiB $12 configuration |
| Railway | [Subscription/resource meters](https://docs.railway.com/pricing/plans), [bill mechanics](https://docs.railway.com/pricing/understanding-your-bill) | $5 floor vs ongoing RAM, CPU, storage and egress charges |
| Render | [Free web](https://render.com/docs/free), [Cron Jobs](https://render.com/docs/cronjobs) | Sleep behavior, UTC cron, $1 minimum and execution limits |
| Koyeb | [Instance types](https://www.koyeb.com/docs/reference/instances), [scale-to-zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero) | Free API resources, 1-hour sleep, paid Eco Small |
| Vercel | [Hobby terms](https://vercel.com/docs/plans/hobby), [fair use](https://vercel.com/docs/limits/fair-use-guidelines) | Noncommercial restriction and why it is not an unchanged Express host |
| Hetzner | [Cost-optimized cloud](https://www.hetzner.com/cloud/cost-optimized/) | Unquoted alternative needing region/IPv4/checkout verification |
| AWS Lightsail | [Instance bundle specifications/prices](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html) | Public IPv4 2 GB / 60 GB / $12 option |
| Fly.io | [October 2026 price change](https://fly.io/pricing-update/), [resource pricing](https://fly.io/docs/about/pricing/) | Replaces older illustrative machine estimate; ongoing volume/network charges |
| Experimental DB | [Enzonic](https://databases.enzonic.com/), [Oracle HeatWave](https://docs.oracle.com/en-us/iaas/mysql-database/doc/features-mysql-heatwave-service.html), [TiDB locking](https://docs.pingcap.com/tidb/stable/locking-functions/) | Candidates requiring actual MySQL 8 and SQL-compatibility evaluation |
| Other VPS | [Vultr](https://www.vultr.com/pricing/), [Akamai/Linode](https://www.akamai.com/cloud/pricing/cpu) | Viable additional unquoted conventional VM providers |

**Source and change-control note:** This document is a **hosting research reference**, not an ADR or operational runbook. Official product pages support **what a provider advertises**, not a claim that the user's workload has been benchmarked. Preserve it in `runpure-ff-planning/research/`; place the eventual decision in `design/decisions/` and update `design/system-design.md` after acceptance. Prior hosting research reports should be marked **superseded**, not retained as parallel ranking authorities.
