# Part 6 — What to keep in mind at every step

> A walk through the adoption lifecycle, with the questions and risks at each step.
> Applies whether we adopt FOLIO ourselves or implement it for a customer.

## 6.1 Step by step

### 1. Decide
- **Why FOLIO?** Open source, open API, extensibility, no licence fee vs. commercial LSPs (Alma, WorldShare,
  Sierra) and the open-source ILS **Koha** (simpler, smaller footprint, strong in public libraries).
- **Fit:** FOLIO is strongest for academic/research libraries and consortia; public-library support is maturing (PubLIB, 2026).
- **Must-have workflows:** list them and test each on the demo before deciding (we did circulation, holds,
  cataloguing **[tested]**).

### 2. Plan
- **Hosting model** (Part 1.7): vendor-hosted vs. partner vs. self-hosted. Decides skills and budget.
- **Release:** go live on a **supported release** (Trillium today, its successor next) and plan the first upgrade.
- **Team:** product owner (librarian), FOLIO configuration expert, data-migration engineer, integration
  developer (Drupal/Java), DevOps (if self-hosted).
- **Timeline:** typical implementations take many months (configuration + several migration rehearsals).

### 3. Set up the platform
- Environments: production, staging, test/training.
- Infrastructure (self-hosted): Kubernetes, PostgreSQL, Kafka, OpenSearch, S3, Vault, Keycloak, Kong,
  backups, monitoring (Part 5).
- **Security baseline:** TLS everywhere, only Kong and edge modules exposed, Keycloak admin not public,
  secrets in Vault, default passwords changed (`diku_admin/admin` is demo-only **[tested]**).

### 4. Configure
- Order: tenant settings → locations & service points → patron groups → material/loan types →
  policies & circulation rules → notice templates → roles → users.
- Document every decision; configuration is the library's "code".
- Test circulation rules with real scenarios (dry-run checkout).

### 5. Migrate data
- **Usually the largest effort and risk.** Bibliographic (MARC), holdings, items, users, open loans, requests,
  fines, orders, vendors, e-resources.
- Map old codes → FOLIO reference data (UUIDs) **[tested]**; clean data before, not after.
- Rehearse at least 2–3 full migrations; measure timing (Part 5: data-import throughput).
- Tools: data import (MARC), batch APIs, community `folio_migration_tools`.
- Freeze period: circulation during cut-over (offline circulation plan).

### 6. Integrate
- Discovery layer / Drupal site (Part 7), SSO (Keycloak), student/HR system user feed, finance/ERP
  (vouchers, bursar), self-check (SIP2), email (SMTP, SPF/DKIM), vendors (EDIFACT, GOBI…).
- Use **edge modules** for anything public; least-privilege roles for service users.

### 7. Train & go live
- Staff training per area (circulation, cataloguing, acquisitions), quick reference for desk staff.
- Go-live checklist: notices tested, printers/slips, barcode scanners, self-check, backups verified, rollback plan.

### 8. Operate
- Monitoring, log review, backups and restore tests, Keycloak and Kong patching, OS/image patching.
- Who handles FOLIO bugs: hosting partner, community Jira, or our own developers?

### 9. Upgrade (every year at least)
- Each flower release: read release notes, upgrade staging with a copy of production, re-test integrations
  and custom modules, reindex search, plan downtime.
- **Custom modules and UI apps must be checked against new interface/Stripes versions.**
- Support ends ~13 months after release (Sunflower ended 2026-06-30) **[docs]**.

## 6.2 Security & privacy checklist

| Area | Keep in mind |
|---|---|
| Authentication | Keycloak realm per tenant; enable MFA for staff; brute-force protection; SSO via SAML/OIDC |
| Authorization | Roles built from capability sets; least privilege; separate roles for integrations |
| Network | Expose only Kong (staff UI/API) and edge modules; internal traffic (Postgres, Kafka, sidecars) private |
| Secrets | Vault/AWS SSM; rotate edge API keys and service-user passwords |
| Personal data (GDPR) | Patron records, loan history: anonymisation settings, retention, access to "restricted" fields, data-processing agreement with host |
| Audit | Circulation log and version history (mod-audit); Keycloak events |
| Patching | Stay on a supported release (CSPs include security fixes) |
| Integrations | Drupal never exposes FOLIO tokens to browsers; server-side calls only **[tested]** |

## 6.3 Skills matrix

| Role | Skills | Needed for |
|---|---|---|
| FOLIO functional expert | Library workflows, FOLIO settings, policies | All options |
| Data migration | MARC, Python, SQL, FOLIO APIs | All options |
| Integration developer | REST, PHP/Drupal, CQL **[tested]** | Drupal/integrations |
| Backend developer | Java 21, Spring Boot, Vert.x/RMB, PostgreSQL, Kafka | Custom modules, bug fixes |
| Frontend developer | React, Stripes | Custom UI apps |
| DevOps | Kubernetes, Helm, PostgreSQL, Kafka, OpenSearch, Keycloak, Kong | Self-hosting |

## 6.4 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Operational complexity (100 services) overwhelms team | High (self-hosted) | High | Vendor/partner hosting; start with few apps |
| Data migration slips or loses data | Medium | High | Early clean-up; multiple rehearsals; partner with experience |
| Yearly upgrades break integrations/custom code | Medium | Medium | Stay at extension levels 0–4; automated integration tests; staging |
| Feature gap for our use case | Medium | Medium | Validate workflows on demo; custom module or community contribution |
| Community roadmap doesn't prioritise our needs | Medium | Low-Med | Join SIGs; fund development; build extensions |
| Performance problems at scale | Low-Med | High | Size from PTF reports; load test; tuning (Part 5) |
| Outdated documentation (Okapi era) misleads team | High | Low | Check doc dates; prefer Eureka docs; our own notes |
| Dependency on Kong/Keycloak licensing or direction | Low | Medium | Both open source; watch community discussions **[docs]** |

## 6.5 Lessons from our own hands-on work **[tested]**

- Reference data must be looked up, not guessed (UUIDs).
- HTTP 504 = unknown result; check before retrying to avoid duplicates.
- Duplicate titles are allowed; integrations need their own de-duplication.
- Local installs need tooling fixes (timeouts, memory, stale DB locks); production needs real DevOps.
- The API is consistent and well-behaved once you know CQL and the record model. Our Drupal integration was quick to build.
