# 3.5 E-resources (ERM) — agreements, licences, eHoldings, usage, OA, serials, dashboard

> Applications: **app-agreements**, **app-licenses**, **app-eholdings**, **app-erm-usage**, **app-oa**,
> **app-serials-management**, **app-service-interaction**, **app-dashboard**.

## What this area does

Manages **electronic resources** and contracts: what e-journals/e-books/databases the library subscribes to
(agreements), under what terms (licences), which titles are in which packages (knowledge base, eHoldings),
how much they are used (COUNTER usage statistics) and open-access publishing costs. Also **serials
prediction** (expected issues) and the **Dashboard** with widgets.

Most of these modules come from the **Grails family** (originally by Knowledge Integration). They use a
different stack and default DB pool (50) from the rest of FOLIO. **[tested]** (build files)

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-agreements` | Agreements (subscriptions), e-resources, packages, entitlements, **local knowledge base** (KBART import), export | Grails | 140 | 4096 MB | |
| `mod-licenses` | Licences, amendments, licence terms (custom properties), term comparison | Grails | 56 | 768 MB | |
| `mod-kb-ebsco-java` | **eHoldings**: proxy to EBSCO's knowledge base (packages, titles, resources), proxies, custom labels | RMB | 73 | 512 MB | |
| `mod-erm-usage` | Usage data providers, COUNTER 4/5/5.1 reports, custom reports, files | RMB | 28 | 2048 MB | |
| `mod-erm-usage-harvester` | Harvests COUNTER reports via SUSHI on a schedule | RMB | 12 | 3000 MB | |
| `mod-eusage-reports` | Analytics: use over time, cost per use, requests by publication year | Vert.x | 12 | 512 MB | |
| `mod-oa` | Open-access publication requests, charges (APCs), correspondence | Grails | 48 | 1024 MB | |
| `mod-serials-management` | Serial patterns (rulesets) → predicted pieces → receiving | Grails | 32 | 1024 MB | |
| `mod-service-interaction` | **Dashboards & widgets**, number generators (barcodes, accession numbers), shared settings | Grails | 44 | 1024 MB | |

UI modules: Agreements, Licenses, eHoldings, eUsage, ERM comparisons, Local KB admin, Open Access,
Serials, Dashboard, plus find-agreement/find-license/find-eresource plugins.

## Deep dives

### mod-agreements
- **Data:** agreements (name, status, periods, renewal priority, linked licences, organizations, usage
  providers), agreement lines (packages or single titles from the KB), the local KB (`/erm/packages`,
  `/erm/titles`, `/erm/pci`) populated from **KBART** files or GOKb harvesting.
- **Key APIs:** `/erm/sas` (subscription agreements), `/erm/entitlements`, `/erm/packages`,
  `/erm/resource`, `/erm/sas/publicLookup` (which agreements cover a title), exports.
- **Performance:** biggest default memory in FOLIO (4 GB) and DB pool 50. KB ingests are heavy jobs.
- **Relevance:** `edge-erm` + `publicLookup` lets a public site show **"you have access via agreement X"**
  and licence terms (e.g. "may be used for course packs").

### mod-licenses
- Licence records with **configurable terms** (custom properties: text, select, integer) so each library
  defines the terms it tracks (ILL allowed? walk-in users? text and data mining?). Amendments and term comparison.

### mod-kb-ebsco-java (eHoldings)
- A live proxy to **EBSCO's KB API** (requires EBSCO credentials) to select packages/titles and custom
  coverage. Only useful if the library uses the EBSCO knowledge base. Otherwise use the local KB in Agreements.

### eUsage (mod-erm-usage, harvester, eusage-reports)
- Configure **SUSHI** credentials per provider → harvester fetches COUNTER reports monthly → reports
  module computes **cost per use** by combining with agreement/invoice data. Sunflower added COUNTER 5.1 **[docs]**.

### Small modules
- **mod-oa:** tracks open-access publishing requests and article processing charges.
- **mod-serials-management:** defines publication patterns and generates expected pieces in Receiving.
- **mod-service-interaction:** the **Dashboard** app (widgets showing saved searches/counts from other apps) and
  **number generators** (Sunflower feature: automatic barcodes, accession numbers, call numbers **[docs]**).

## Keep in mind
- ERM only matters if the library manages significant e-resources; small public libraries may skip it.
- The Grails modules use a **different stack**: debugging and tuning differ from the Java/Spring modules.
- eHoldings ties you to EBSCO's KB; the local KB is vendor-neutral but needs data feeds (KBART/GOKb).

## Feature ideas
- Drupal "A–Z databases" page generated from agreements/packages.
- Licence terms shown next to e-resources in the Drupal catalogue ("Interlibrary loan: allowed").
- Cost-per-use dashboard for management from eUsage.

## Drupal relevance
Medium: A–Z lists of databases/e-journals, access/licence information, via `edge-erm` or the ERM APIs.
