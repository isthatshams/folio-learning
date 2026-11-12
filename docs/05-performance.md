# Part 5 — Performance & Operations

> **Audience:** technical team / DevOps. **[tested]** = measured on our local install (M1 Pro, 32 GB, Docker
> Desktop 24 GB/10 CPU, amd64 images under Rosetta); **[docs]** = FOLIO docs / source code.
> We have **not** load-tested FOLIO at production scale. Production numbers below come from documentation and must
> be validated in a pilot.

## 5.1 What we measured locally **[tested]**

| Observation | Value |
|---|---|
| Containers for a reduced setup (no acquisitions, no search) | ~57 modules + ~57 sidecars + infra |
| Idle memory of that stack | **~20.5 GB** |
| Peak during UI build | ~8 GB |
| Full deploy time | **~12 min** (modules need >12 min to become ready under emulation) |
| First failure cause | Out of memory at 22/24 GB → Keycloak killed → install rolled back |
| Default memory of all 101 modules (descriptors) | **~70 GB** (excl. sidecars, Postgres, Kafka, OpenSearch, Keycloak, Kong) |

Lessons: FOLIO is **memory-bound first**, and startup is slow because ~60 JVMs start at once. On real x86
servers without emulation it is faster, but the memory footprint stays.

## 5.2 Sizing a production installation

**[docs]** Rules of thumb; verify with the hosting partner and a pilot.

- **Platform:** Kubernetes (EKS/AKS/on-prem) with FOLIO Helm charts; managed PostgreSQL (e.g. RDS/Aurora),
  managed Kafka (MSK), managed OpenSearch, S3.
- **Compute:** sum of module memory (≈70 GB for everything, less if apps are skipped) + sidecars + headroom,
  **×2 for redundancy** of critical modules. Install only the applications the library uses. Each skipped app saves
  real money (acquisitions ≈ 5.4 GB in our setup **[tested]**).
- **Critical path (run ≥2 replicas):** Kong, Keycloak, mod-users(-keycloak), mod-login-keycloak,
  mod-roles-keycloak, mod-inventory(-storage), mod-circulation(-storage), mod-search, mod-patron,
  mod-feesfines, edge-patron/rtac (public traffic).
- **Database:** one PostgreSQL cluster for all modules is normal. Large sites split heavy modules
  (inventory-storage, SRS, circulation-storage) onto separate DB hosts via each module's `DB_HOST`.
- **Separate environments:** production, staging (upgrade rehearsal), test/training.

## 5.3 Tuning levers, by layer

### JVM / containers
- Modules use `-XX:MaxRAMPercentage` (66–80 %) of the container limit. Raise the **container memory**, not -Xmx.
- Watch for OOM kills (Docker/K8s events). They look like random 502s at the gateway **[tested]**.
- **Native (GraalVM) sidecars** (`combined-native` profile) cut sidecar memory and startup time
  dramatically. Worth it because there is one sidecar per module **[docs]**.
- Use x86 nodes (images are amd64-only) **[tested]**.

### PostgreSQL (the biggest lever)
- **Connection pools:** `DB_MAXPOOLSIZE` defaults to **5 per module instance per tenant** **[tested]** (descriptors).
  Total connections = Σ(modules × replicas × tenants × pool). Size `max_connections` or add **PgBouncer**.
  Raise the pool for busy modules (inventory-storage, circulation-storage, SRS).
- **Read replicas:** RMB modules support `DB_HOST_READER` / `DB_HOST_READER_ASYNC` to send reads to replicas
  (AWS: use async) **[docs]**.
- **Indexes:** RMB modules declare indexes in `schema.json` (b-tree, `ginIndex` for truncation, `fullTextIndex`).
  A CQL query on a **non-indexed field = sequential scan** on millions of rows. Check slow queries with
  `pg_stat_statements` and query exact (`==`) on indexed fields.
- **Paging:** deep `offset` paging gets slower with every page. Use id/streaming endpoints for bulk reads
  (`/source-storage/stream/...`, `/search/resources/jobs` → `/search/resources/jobs/{jobId}/ids`). Add `totalRecords=none` when counts aren't needed
  (RMB returns *estimated* counts by default for large results) **[docs]**.
- Autovacuum/analyze tuned for large `jsonb` tables; regular `VACUUM ANALYZE` after big imports.

### OpenSearch / mod-search
- Use `mod-search` for keyword search and browse. Never run broad CQL text search against storage modules.
- Shards/replicas per index sized to catalogue size; **full reindex** after upgrades or mapping changes can
  take hours on millions of records. Schedule it.
- Search is near-real-time via Kafka; indexing lag grows when Kafka consumers fall behind.

### Kafka
- **Partitions** per topic define parallelism of consumers (data import, search indexing). More partitions +
  more module replicas = higher throughput.
- Topic count grows with **tenants × event types**; plan broker resources and retention.
- Monitor consumer lag (Kafka UI in eureka-cli at :9080 **[tested]**).

### Data import
- Split large files (built-in splitting), import off-hours, scale SRM/SRS/inventory consumers horizontally,
  and benchmark with real files before the migration weekend.

### Gateway and sidecars
- Kong and sidecar timeouts must exceed slow operations (exports, large batch calls). eureka-cli sets very
  high timeouts locally **[tested]**. In production keep them deliberate.
- Every call passes Kong → sidecar → module (+ sidecar hops for module-to-module), so latency adds up for
  workflows that touch many modules (check-out touches ~10). Keep sidecars healthy and close to their modules.

### Client side (Drupal and other integrations) **[tested]**
- **Cache** tokens (until expiry − 60 s) and reference data (locations: 1 day).
- **Avoid N+1 calls:** one `mod-search` call with `expandAll=true` per result page instead of item calls per
  record; facets: one call per distinct query; RTAC batch for availability.
- Do **not** page-cache availability; cache the rest of the page.
- For high public traffic, consider **harvesting** (OAI-PMH/export) into Drupal's own Solr index and calling
  FOLIO live only for availability and account data.

## 5.4 Monitoring & observability

| Tool | What | Where |
|---|---|---|
| Logs | Per-container logs | Dozzle :8888 locally **[tested]**; ELK/Loki in production |
| Metrics, traces | OpenTelemetry agent → Prometheus, Tempo, Grafana | eureka-cli "OTel LGTM" profile **[docs]**; Grafana :4000 |
| Kafka | Topics, consumer lag | Kafka UI :9080 locally |
| OpenSearch | Index health | OpenSearch Dashboards :15601 |
| PostgreSQL | Slow queries, connections, locks | `pg_stat_statements`, `pg_stat_activity`; Liquibase locks **[tested]** |
| Health | Module health endpoints (`/admin/health`), Kong status | Alerting in K8s |

## 5.5 Community performance work

FOLIO has a **Performance Task Force (PTF)** that load-tests releases (check-in/out, data import, search) and
publishes reports and recommended settings on the FOLIO wiki. Read the PTF reports for the release we pick
before sizing. **[docs]**

## 5.6 Performance checklist

- [ ] Only needed applications installed
- [ ] Critical modules ≥2 replicas; Kong and Keycloak highly available
- [ ] DB pool sizes and `max_connections`/PgBouncer calculated
- [ ] Read replicas for RMB modules where read-heavy
- [ ] `pg_stat_statements` on; slow queries reviewed after go-live
- [ ] OpenSearch sized; reindex time measured
- [ ] Kafka partitions set for import/search throughput; consumer-lag alerts
- [ ] Native sidecars
- [ ] Load test of check-in/out and search with realistic data before go-live
- [ ] Client integrations cache and batch

## Sources
- RMB docs (pools, read replicas, indexes, estimated totalRecords): https://github.com/folio-org/raml-module-builder
- eureka-cli README (profiles, OTel stack, native sidecars): `eureka-setup/eureka-cli/README.md`
- Helm charts: https://github.com/folio-org/folio-helm-v2
- FOLIO PTF: https://folio-org.atlassian.net/wiki/spaces/PERF
