# 3.2 Inventory, cataloguing, MARC & search

> Applications: **app-inventory**, **app-marc-storage**, **app-quick-marc**, **app-authority-records**,
> **app-linked-data**, **app-marc-migrations**, **app-search** (+ `mod-copycat` from platform-complete).

## What this area does

Describes **everything the library holds**, physical and electronic. FOLIO separates two layers:

1. **Inventory (FOLIO's own format)**: a simple, format-neutral model that every other app uses:
   **Instance** (the title/work) → **Holdings** (a library's copy set at a location, with call number) →
   **Item** (one physical, barcoded piece with a status). **[tested]**
2. **Source records (MARC)**: the full MARC21 bibliographic, holdings and **authority** records,
   stored in **SRS** and kept in sync with Inventory. Cataloguers edit MARC in **quickMARC**; Inventory fields
   are derived from it via **mapping rules**.

**Search** (OpenSearch via `mod-search`) indexes Inventory and authorities for the UI and for discovery.
**Linked data** (BIBFRAME) is the newer alternative to MARC.

```
         MARC file / Z39.50 (copycat)          quickMARC editor          Linked-data editor
                   │                                 │                          │
                   ▼                                 ▼                          ▼
   data-import ─▶ SRS (MARC bib/holdings/auth) ◀──▶ mapping rules ──▶ Inventory (instance/holdings/item)
                                                                          │  Kafka events
                                                                          ▼
                                                           mod-search → OpenSearch  ─▶ UI search, Drupal
```

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-inventory-storage` | **Owns** instances, holdings, items and ~30 reference types (instance types, material types, loan types, statuses, identifiers…) | RMB | 245 | 682 MB | ✓ |
| `mod-inventory` | Business logic: create/update with MARC sync, move items/holdings, batch, ISBN tools, ownership changes | Vert.x | 38 | 682 MB | ✓ |
| `mod-inventory-update` | Upsert by HRID or **match key** (shared/union catalogues), import channels for harvested data | Vert.x | 51 | 341 MB | |
| `mod-source-record-storage` (SRS) | Stores MARC records (bib, holdings, authority) + snapshots, streams, matching | RMB | 27 | 1024 MB | ✓ |
| `mod-record-specifications` | MARC field/indicator/subfield **validation rules** (what quickMARC enforces) | Spring | 20 | 517 MB | ✓ |
| `mod-quick-marc` | Back end of the quickMARC editor: load, validate, save MARC + link suggestions | Spring | 6 | 512 MB | ✓ |
| `mod-entities-links` | **Authority records** storage and **links** between bib headings and authorities (auto-update) | Spring | 34 | 1024 MB | ✓ |
| `mod-linked-data` | BIBFRAME resources graph, profiles, vocabularies, sync to Inventory | Spring | 35 | 1024 MB | ✓ |
| `mod-linked-data-import` | Bulk import of linked-data (RDF) files | Spring | 5 | 1024 MB | ✓ |
| `mod-marc-migrations` | Re-maps existing MARC → Inventory after mapping-rule changes (bulk remap jobs) | Spring | 9 | 512 MB | |
| `mod-search` | Indexing to OpenSearch; search, facets, browse (call numbers, subjects, contributors, classification) | Spring | 44 | 1024 MB | ✓ |
| `mod-copycat` | Copy cataloguing: import a record from an external Z39.50 target (e.g. OCLC) by identifier | RMB | 6 | 512 MB | |
| `edge-inventory` | Edge API for outside read access to inventory | Spring | — | 256 MB | |

UI modules: Inventory, quickMARC, MARC authority, Linked data editor (`ld-folio-wrapper`), Inventory import,
plugins (find-instance, create-inventory-records, find-authority).

## Deep dives

### mod-inventory-storage
- **Data:** `instance` (title, contributors, identifiers, subjects, languages, `instanceTypeId`, `source`
  FOLIO/MARC, `discoverySuppress`, `staffSuppress`), `holdings_record` (`instanceId`,
  `permanentLocationId`, `callNumber`, `sourceId`), `item` (`holdingsRecordId`, `barcode`, `status`,
  `materialTypeId`, `permanentLoanTypeId`, `effectiveLocation`, `effectiveCallNumberComponents`), plus
  reference tables. Also bound-with parts, instance relationships, preceding/succeeding titles.
- **Key APIs (all [tested] in Lessons 3 & 5):** `POST /instance-storage/instances` →
  `/holdings-storage/holdings` → `/item-storage/items`; CQL `GET` on each; reference data `/instance-types`,
  `/material-types`, `/loan-types`, `/holdings-sources`, `/contributor-name-types`. Batch:
  `/item-storage/batch/synchronous`, `/holdings-storage/batch/synchronous`, `/instance-storage/batch/synchronous`.
- **Events:** every create/update/delete → Kafka (`inventory.instance`, `inventory.holdings-record`,
  `inventory.item`), consumed by mod-search, mod-audit (version history), remote storage, consortia.
- **Computed fields:** `effectiveLocation`, `effectiveCallNumberComponents`, `effectiveShelvingOrder` are
  derived on save (item overrides holdings). Query these, not the raw fields.
- **Performance:** biggest module (245 endpoints, largest tables). CQL on non-indexed fields → full table
  scans. Use `/search/instances` (OpenSearch) for keyword search and storage only for exact/id lookups.
  Batch endpoints for migration (thousands per call; the `-unsafe` variants skip optimistic locking).
- **Gotchas [tested]:** duplicates allowed (re-POST = second instance); holdings `sourceId` must be FOLIO for
  API-created records; a holding cannot be deleted while it has items; locally, sample holdings failed
  during tenant init (system-user token issue).
- **Extension:** reference data (types, statuses, notes types, statistical codes) are configurable lists in
  Settings → Inventory. Custom fields are **not** available for inventory records, so local data goes in notes,
  statistical codes or administrative notes.

### mod-inventory (business logic)
- Use it when a change must stay consistent with MARC/SRS (e.g. updating a MARC-sourced instance),
  for **moving** items between holdings (`/inventory/items/move`) or holdings between instances,
  and for ownership changes in consortia.
- `blocked-fields` config: fields that may not be edited on MARC-sourced records (edit them in MARC).

### SRS + mapping rules + quickMARC
- **SRS** keeps the raw and parsed MARC (`/source-storage/records`, `/source-storage/source-records`,
  streaming endpoints for bulk export). Each import creates a **snapshot** (job).
- **Mapping rules** (`/mapping-rules/{recordType}` e.g. `marc-bib`, in source-record-manager) define MARC → Inventory field mapping and
  are **editable per tenant**. After changing them, use `mod-marc-migrations` to remap existing records.
- **quickMARC** validates against `mod-record-specifications` (tenant can add local fields 9XX, make
  fields required, etc.).
- **Gotcha:** a MARC-sourced instance must be edited in quickMARC, not in the Inventory form.

### mod-entities-links (authorities)
- Stores authority records and links bib headings (100, 600, 700…) to authorities. When an authority
  heading changes, linked bibs are updated automatically. Linking rules are configurable.

### mod-search
- **Indexes** instances (with holdings/items), authorities, linked-data works; **search** with CQL over
  OpenSearch (`/search/instances?query=keyword all "x"` **[tested]**), **facets**
  (`/search/instances/facets?facet=languages:10` **[tested]**), **browse** (call numbers, subjects,
  contributors, classification numbers), id streaming for exports.
- **Configurable:** index settings, language analysers, browse config (call-number types), feature flags.
- **Reindex** (`/search/index/instance-records/reindex/full`) is a long job on big catalogues; plan for it
  after upgrades.
- **Gotchas [tested]:** without OpenSearch the whole Inventory UI search fails (our local install);
  `items.status.name` facet filtering didn't work as expected on the demo.
- **Relevance:** **this is the API the Drupal catalogue uses** (search, facets, availability via
  `expandAll=true`) **[tested]**.

### Small modules
- **mod-inventory-update:** "upsert" API (insert or update matched by HRID or a match key) used for
  shared/union catalogues and harvested data; also "inventory import" channels (XML/XSLT pipelines).
- **mod-linked-data(-import):** BIBFRAME 2 graph editor back end (Library of Congress-driven); syncs a
  derived Inventory instance. Early adoption stage.
- **mod-copycat:** imports single records from Z39.50 targets (OCLC WorldCat etc.) into Inventory/SRS.
- **edge-inventory:** read-only inventory access for systems with an API key.

## Keep in mind
- **Decide the source of truth per record type:** MARC (SRS) or FOLIO-native. It decides where edits happen.
- **Search is eventually consistent:** changes reach OpenSearch via Kafka, so indexing lags writes slightly.
- **Data migration** of bibs/holdings/items is the largest implementation task (Part 6). Use data import
  for MARC and batch storage APIs for items.
- **Suppression flags:** `discoverySuppress` hides from public discovery (we filter on it in Drupal
  **[tested]**), `staffSuppress` hides from staff.

## Feature ideas
- Drupal "new acquisitions" lists from `metadata.createdDate` + facets.
- Cover images and enriched records (Open Library / Google Books by ISBN) in the Drupal catalogue.
- Local MARC field rules (record-specifications) for company-specific metadata.
- Custom "inventory health" checks (items without barcodes, missing call numbers) via FQM lists (3.6).

## Drupal relevance
Very high. Search (`mod-search`), record display (instances/holdings/items), availability and
reference-data lookups are the core of a Drupal discovery layer. **[tested]**
