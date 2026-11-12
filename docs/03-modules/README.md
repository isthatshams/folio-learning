# Part 3 — Applications & Modules

FOLIO's 101 backend/edge modules and 76 UI modules, grouped into **9 chapters by business area**.
Each FOLIO *application* (installable bundle) is mapped to exactly one chapter, and every backend module
appears in exactly one chapter's module table.

| Ch | Area | FOLIO applications | Backend modules |
|---|---|---|---|
| [3.1](01-platform-core.md) | Platform core: users, login, roles, settings, locations | app-platform-minimal | 15 |
| [3.2](02-inventory-cataloging.md) | Inventory, cataloguing, MARC, search | app-inventory, app-marc-storage, app-quick-marc, app-authority-records, app-linked-data, app-marc-migrations, app-search (+ mod-copycat) | 13 |
| [3.3](03-circulation.md) | Circulation, patrons, fines, requests | app-platform-complete (circulation part), app-reading-room, app-requests-mediated(-ui) | 10 |
| [3.4](04-acquisitions.md) | Acquisitions: orders, receiving, invoices, finance, vendors | app-acquisitions, app-gobi, app-ebsconet, app-mosaic | 12 |
| [3.5](05-erm.md) | E-resources: agreements, licences, eHoldings, usage, OA, serials, dashboard | app-agreements, app-licenses, app-eholdings, app-erm-usage, app-oa, app-serials-management, app-service-interaction, app-dashboard | 9 |
| [3.6](06-data-reporting.md) | Data import/export, bulk edit, queries & lists, reporting, audit | app-data-import, app-data-export, app-bulk-edit, app-fqm, app-lists, app-reporting (+ export/import/audit modules from platform-complete) | 13 |
| [3.7](07-resource-sharing-consortia.md) | Resource sharing & consortia | app-consortia(-manager), app-dcb, app-inn-reach, app-requests-ecs | 8 |
| [3.8](08-integrations-edge.md) | Integrations & edge APIs | app-edge-complete, app-rtac, app-oai-pmh (+ NCIP, GraphQL) | 14 |
| [3.9](09-platform-services.md) | Shared services: notifications, email, templates, events | app-notification (+ mod-pubsub) | 7 |

## How to read a chapter

1. **What the area does**: business view and the main workflow.
2. **Module table**: every module with tech, endpoint count, default memory, Kafka use (from the descriptors,
   platform `R1-2027-SNAPSHOT`; Appendix A has the full interface lists).
3. **Deep dives**: important modules follow the [module template](../_module-template.md) (purpose, data,
   key APIs, events, dependencies, configuration/extension, performance, gotchas, relevance). Small or
   niche modules get a short entry.
4. **Keep in mind / feature ideas / Drupal relevance** for the area.

Abbreviations in tables: **Spring** = Spring Boot + folio-spring-base · **RMB** = RAML Module Builder (Vert.x) ·
**Vert.x** = plain Vert.x · **Grails** = Groovy/Grails · **EP** = number of API endpoints · **Mem** = default
container memory from the module descriptor · **Kafka** = module is configured to use Kafka.
