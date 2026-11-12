# Appendix B — Glossary

| Term | Meaning |
|---|---|
| **Application** | Versioned bundle of FOLIO modules installed together (e.g. `app-inventory`). Unit of install in Eureka. |
| **Application descriptor** | JSON listing an application's backend and UI modules and dependencies. |
| **Authority record** | MARC record for a controlled name/subject heading; bib records link to it. |
| **BIBFRAME** | Linked-data model for bibliographic description (Library of Congress); FOLIO's "Linked data" app. |
| **Capability / capability set** | Eureka's permission units in Keycloak, derived from module permissions; grouped into sets and roles. |
| **CQL** | Contextual Query Language used by FOLIO APIs: `title="x"`, `barcode=="123"`. |
| **Circulation rules** | Rule text choosing loan/request/notice/fine/lost policies from patron group, material type, loan type, location. |
| **COUNTER / SUSHI** | Standard for e-resource usage reports / protocol to harvest them. |
| **CSP** | Critical Service Patch: fixes released for supported releases. |
| **ECS** | Enhanced Consortial Support: FOLIO's multi-tenant consortium mode. |
| **Edge module** | `edge-*` module exposing a narrow API to external systems using API keys. |
| **Entitlement** | Installing (enabling) an application for a tenant. |
| **Eureka** | Current FOLIO platform: Kong + Keycloak + sidecars + managers. Replaced Okapi in Sunflower. |
| **FAR** | FOLIO Application Registry: stores application descriptors. |
| **FQM** | FOLIO Query Machine: query engine behind the Lists app. |
| **Holdings** | Record of a library's copies of an instance at a location (call number). |
| **HRID** | Human-readable ID (e.g. `in00000000001`) in addition to UUIDs. |
| **Instance** | The title/work-level record in Inventory. |
| **Interface** | Versioned API contract a module provides/requires (`users 16.6`). |
| **Item** | One physical piece with barcode and status. |
| **KBART** | Standard file format for e-resource package title lists. |
| **Keycloak** | Open-source identity server: login, tokens, roles, SSO. One realm per tenant. |
| **Kong** | Open-source API gateway: FOLIO's single entry point in Eureka. |
| **LDP / Metadb** | Separate analytics databases fed from FOLIO for reporting. |
| **LSP** | Library Services Platform: modern successor of the ILS (integrated library system). |
| **MARC21** | Standard bibliographic record format. |
| **Module descriptor** | JSON describing a module's interfaces, endpoints, permissions, dependencies, Docker launch settings. |
| **NCIP** | Protocol for interlibrary loan / resource sharing circulation. |
| **OAI-PMH** | Protocol to harvest metadata (whole catalogue) by other systems. |
| **Okapi** | FOLIO's former gateway (until Ramsons). Still appears in header names (`x-okapi-tenant`). |
| **OLF** | Open Library Foundation: non-profit home of FOLIO. |
| **Patron group** | Category of patron (staff, student, …) driving policies. |
| **Platform descriptor** | JSON listing all applications of a FOLIO release (`platform-lsp`). |
| **RMB** | RAML Module Builder: older FOLIO backend framework on Vert.x. |
| **RTAC** | Real-Time Availability Check for discovery systems. |
| **Service point** | A desk where circulation happens; required for every circulation action. |
| **Sidecar** | Small proxy next to each module that checks auth and routes module-to-module calls. |
| **SIG** | Special Interest Group: community working group per functional area. |
| **SIP2** | Protocol for self-check machines and gates. |
| **Spring Way** | FOLIO's Spring Boot framework (`folio-spring-base`): recommended for new modules. |
| **SRS / SRM** | Source Record Storage / Manager: MARC storage and the import job engine. |
| **Stripes** | FOLIO's React UI framework. |
| **Tenant** | One library (or library group) on a shared FOLIO installation; own schemas and Keycloak realm. |
| **TLR** | Title-level request: request "any copy" of a title instead of a specific item. |
