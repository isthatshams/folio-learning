# 3.6 Data in & out — import, export, bulk edit, queries, lists, reporting, audit

> Applications: **app-data-import**, **app-data-export**, **app-bulk-edit**, **app-fqm**, **app-lists**,
> **app-reporting**, plus `mod-data-export-spring`, `mod-data-export-worker`, `mod-user-import` and
> `mod-audit` from platform-complete.

## What this area does

Moving data **in bulk**: loading MARC records (from vendors, migration, OCLC), exporting MARC and other data,
changing thousands of records at once, building **queries and saved lists** without SQL, analytical
reporting, and **change history** (who changed what, when).

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-data-import` | Upload files (MARC, EDIFACT), split large files, start import jobs | RMB | 23 | 517 MB | ✓ |
| `mod-source-record-manager` (SRM) | Runs import jobs: parse, apply **job profiles**, track progress/logs; holds MARC mapping rules | RMB | 22 | 1024 MB | ✓ |
| `mod-di-converter-storage` | Stores **import profiles**: job, match, action, mapping profiles; field protection | RMB | 42 | 341 MB | |
| `mod-data-export` | Export instances/holdings/authorities as **MARC** with mapping/job profiles; quick export; export-all | Spring | 28 | 517 MB | |
| `mod-data-export-spring` | Scheduled export jobs: **EDIFACT orders**, claims, bursar (fines) export, circulation log | Spring | 18 | 517 MB | ✓ |
| `mod-data-export-worker` | Worker that executes data-export-spring jobs and bulk-edit file processing (Spring Batch) | Spring | 1 | 2929 MB | ✓ |
| `mod-bulk-operations` | **Bulk edit**: by identifiers (CSV) or query → preview → commit changes to users/items/holdings/instances/MARC | Spring | 20 | 2929 MB | ✓ |
| `mod-fqm-manager` | **FOLIO Query Machine**: entity types (cross-module views) and query engine over them | Spring | 23 | 600 MB | |
| `edge-fqm` | Edge access to FQM queries | Spring | — | 341 MB | |
| `mod-lists` | **Lists** app: saved queries, refresh, export CSV, share | Spring | 16 | 3072 MB | |
| `mod-user-import` | Bulk import/update of users from JSON (e.g. nightly student feed) | RMB | 1 | 341 MB | |
| `mod-reporting` | Bridge from the UI to an **LDP / Metadb** reporting database (run SQL reports) | Go | 10 | 95 MB | |
| `mod-audit` | Circulation log, **version history** of inventory/MARC/acquisitions/users records, audit config | Vert.x/RMB | 22 | 682 MB | ✓ |

UI modules: Data import, Data export, Bulk edit, Lists, Query builder plugin, Export manager, Circulation log,
Reporting (`ui-ldp`).

## Deep dives

### Data import (mod-data-import + SRM + di-converter-storage)
- **How it works:** upload file → choose a **job profile** → for each record: **match profile** (find an
  existing record by e.g. 001/ISBN/HRID) → **action profile** (create/update/modify) → **mapping profile**
  (which MARC fields → which Inventory/Order/Invoice fields). Processing runs through **Kafka**, record by
  record, with a detailed log per record.
- **Supports:** MARC bib/holdings/authority create/update, creating instances+holdings+items in one go,
  **EDIFACT invoices**, orders from MARC (vendor records).
- **Key APIs:** `/data-import/uploadDefinitions` (upload), `/change-manager/jobExecutions` (jobs),
  `/data-import-profiles/jobProfiles|matchProfiles|actionProfiles|mappingProfiles`,
  `/metadata-provider/jobLogEntries` (results).
- **Performance:** the heaviest pipeline in FOLIO. Large files are **split** into chunks (configurable). Throughput depends
  on Kafka partitions, SRS/inventory DB, and number of module instances (Part 5). Run big loads off-hours.
- **Gotchas:** profiles are powerful and easy to get wrong (duplicate creation when matches fail). Test with
  10 records first. Field protection settings stop vendor updates from overwriting local fields.

### Data export (mod-data-export, -spring, -worker)
- MARC export of instances/holdings/authorities with custom mapping profiles (incl. holdings/items in 9XX);
  quick export from Inventory search results; "export all" for discovery feeds; deleted-records export.
- Spring/worker pair: scheduled **EDIFACT** order export to vendors (FTP/SFTP), **claims**, **bursar**
  export of fines to a student-finance system, circulation log export; files stored in S3/MinIO.

### Bulk edit (mod-bulk-operations)
- Upload a CSV of identifiers (barcodes, UUIDs, HRIDs) or build a query → FOLIO shows a **preview**
  (matched records, errors, proposed changes) → **commit**. Supports users, items, holdings, instances and
  MARC fields (Sunflower: all non-control MARC fields **[docs]**). Profiles save common edits.
- Very memory-hungry (2.9 GB default) because it materialises files.

### FQM + Lists
- **FQM** defines **entity types**: virtual joined views (e.g. "Loans" = loan + item + user + location) over
  module databases, with permissions per column. **Lists** lets staff build a query in a UI
  ("items in Main Library, status Missing, updated before 2025"), save it, refresh it and export CSV.
- Custom entity types can be added (`/entity-types/custom`). That is a no-Java way to give staff new reports.
- Some entity types are materialized views refreshed on a schedule.

### Reporting: mod-reporting + LDP/Metadb
- Heavy reporting is done **outside** FOLIO: **Metadb** (or the older LDP) continuously copies FOLIO data
  (via Kafka/DB) into a separate analytics PostgreSQL, where it is flattened into normal tables. Reports are SQL
  (community library `folio-analytics`) or BI tools (Power BI, Metabase, Superset).
- `mod-reporting` lets the FOLIO UI (`ui-ldp`) browse tables and run saved SQL reports against that database.

### mod-audit
- **Circulation log** (who checked what out/in, notices, fee actions); **version history** for
  instances/holdings/items, MARC bib/authority, orders, invoices, organizations, users (Sunflower **[docs]**).
  Configurable retention (`/audit/config/groups`).

### mod-user-import
- `POST /user-import` with a JSON batch of users (match by external system ID), optional deactivation of
  missing users. Typical nightly feed from an HR/student system. Note that in Eureka, Keycloak accounts must
  also exist for users who log in.

## Keep in mind
- **Migration toolchain:** MARC via data import; items/holdings/users/loans via batch APIs or community
  tools (e.g. `folio_migration_tools`, Python). Plan several trial migrations.
- **Async jobs need monitoring:** imports/exports/bulk edits run in the background; failures are per record.
- **Analytics database** (Metadb) is a separate system to host and secure.

## Feature ideas
- Nightly sync job from company HR/LDAP → `mod-user-import` (+ Keycloak).
- Management reports in Power BI on Metadb.
- Drupal admin pages that show FQM list results (e.g. "most borrowed this month") as public widgets.
- Automated vendor MARC loads (SFTP pickup → data import API).

## Drupal relevance
Medium: export feeds for search indexing (alternative to live API search), list-based widgets, reporting.
