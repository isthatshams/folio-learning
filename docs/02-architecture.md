# Part 2 — Platform Architecture

> **Audience:** technical team. Builds on Part 1.
> **Markers:** **[tested]** = seen on our demo/local install; **[docs]** = FOLIO documentation / source code.

## 2.1 The big picture

FOLIO is a **microservice platform**: about 100 small backend services ("modules") behind one gateway,
plus a web UI assembled from plug-in apps. Every feature is reached through the **same REST API**, whether
it is used by the staff UI, a script, or an external site such as Drupal. **[tested]**

```
            Staff browser                External systems (Drupal, discovery, self-check, vendors)
                 │                                   │
                 ▼                                   ▼
   ┌──────────────────────────┐        ┌──────────────────────────────┐
   │ Stripes UI (React)       │        │ Edge modules (edge-*)         │  API-key auth, limited scope
   │ ui-inventory, ui-users…  │        │ edge-patron, edge-rtac, sip2… │
   └────────────┬─────────────┘        └──────────────┬───────────────┘
                │  REST/JSON + token                  │
                ▼                                     ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │ EUREKA  Kong (gateway) ─ Keycloak (login, tokens, roles)          │
   │         mgr-applications · mgr-tenants · mgr-tenant-entitlements  │
   └────────────┬──────────────────────────────────────────────────────┘
                ▼
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │ sidecar       │   │ sidecar       │   │ sidecar       │  one per module: checks token +
   │ mod-users     │──▶│ mod-circ      │──▶│ mod-inventory │  permissions, routes module→module
   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
           ▼                   ▼                   ▼
   ┌───────────────────────────────────────────────────────────┐
   │ PostgreSQL (schema per tenant per module) · Kafka (events)│
   │ OpenSearch (search index) · S3/MinIO (files) · Vault       │
   └───────────────────────────────────────────────────────────┘
```

## 2.2 The layers

| Layer | Technology | Responsibility |
|---|---|---|
| **UI** | React + FOLIO's **Stripes** framework | Staff interface. Each app (`ui-users`, `ui-inventory`, …) is a separate npm package; a **platform** bundles the chosen ones into one single-page app. |
| **Gateway** | **Kong** | One entry point for every API call; routes by path to the right module. |
| **Identity** | **Keycloak** | Login, tokens, users' roles and capabilities. **One Keycloak realm per tenant.** |
| **Platform managers** | `mgr-applications`, `mgr-tenants`, `mgr-tenant-entitlements` | Register applications, create tenants, install ("entitle") applications per tenant. |
| **Sidecars** | `folio-module-sidecar` (Quarkus), one per module | Check token + permission for each incoming call; sign and route outgoing module-to-module calls. |
| **Backend modules** | Java (Spring Boot / Vert.x RMB / Grails), 1 Node.js, 1 Go | Business logic and data. Each module owns its data and exposes its own REST API. |
| **Database** | **PostgreSQL** | One schema per *tenant × module*, e.g. `diku_mod_users`. Modules never read each other's tables. |
| **Events** | **Kafka** (plus legacy `mod-pubsub`) | Asynchronous notifications between modules (e.g. inventory change → search index). |
| **Search** | **OpenSearch / Elasticsearch** + `mod-search` | Full-text search, facets and browse for Inventory and authorities. |
| **Files** | S3-compatible storage (AWS S3, MinIO, Garage) | Data import/export files, bulk-edit files. |
| **Secrets** | **Vault** (or AWS SSM) | Client secrets, system-user passwords, edge API keys. |

## 2.3 What happens on one API call **[tested]**

Example: `GET /circulation/loans?query=status.name=="Open"` from our `folio.sh` or from Drupal.

1. **Login:** `POST /authn/login-with-expiry` → `mod-login-keycloak` → Keycloak issues a token (JWT) for the
   tenant's realm. Returned as cookies `folioAccessToken` (~10 min) and `folioRefreshToken` (~1 day).
2. **Request:** client sends `x-okapi-tenant: diku` + `x-okapi-token: <JWT>` to Kong (`:8000`).
3. **Kong** matches the path `/circulation/loans` to the route registered for `mod-circulation`, and forwards
   it to that module's **sidecar**.
4. **Sidecar** validates the JWT (signature, tenant, expiry) and asks Keycloak whether this user's
   capabilities include the permission the endpoint requires (`circulation.loans.collection.get`).
   If not → **403**. Expired token → **401** (Drupal re-logs in; Part 7).
5. **mod-circulation** handles the call. To enrich loans with item and user data it calls other modules
   (`/item-storage/items`, `/users`). These go **out through its own sidecar**, which adds a
   module/system token and routes them directly to the other module's sidecar.
6. Each module reads its own schema in PostgreSQL and returns JSON.

What we saw when parts were missing: Kong 502 when the target sidecar was restarting; "System user token
is required" when a module called another without a token; 404 for `/search/instances` locally because
`mod-search` was not installed. **[tested]**

## 2.4 Eureka vs. Okapi — why it changed

Until Ramsons, everything above was done by one Java program, **Okapi** (gateway + auth + module registry +
tenant install), with `mod-authtoken` and `mod-permissions` handling security. Since **Sunflower (R1 2025)**
FOLIO runs on **Eureka**. **[docs]**

| Concern | Okapi era | Eureka era |
|---|---|---|
| Gateway | Okapi | Kong |
| Login / tokens | mod-login + mod-authtoken | Keycloak (via mod-login-keycloak) |
| Permissions | mod-permissions (permission sets) | Keycloak roles + **capabilities** (mod-roles-keycloak); permissions still exist inside module descriptors |
| Unit of install | Module | **Application** (a versioned bundle of modules) |
| Module registry | Okapi `/_/proxy/modules` | `mgr-applications` + FOLIO Application Registry (FAR) |
| Module-to-module | Through Okapi | Sidecar to sidecar (direct) |
| SSO | Custom (SAML module) | Keycloak features: SAML, OIDC, identity brokering |
| Compatibility | — | `mod-okapi-facade` emulates old Okapi endpoints for tools that still need them |

**Why it matters for us:**
- Docs and tutorials before 2025 describe Okapi. Ports, URLs (`okapi` → `kong`) and permission handling differ.
- Keycloak gives us **SSO** (e.g. Microsoft Entra ID, Google, SAML) through standard configuration, without code.
  This is also how a Drupal site could share login with FOLIO (Part 7).
- More infrastructure to run: Kong, Keycloak and ~1 sidecar per module (≈ doubles container count). **[tested]**

## 2.5 Applications, modules and descriptors

FOLIO describes itself with JSON files. Understanding them explains how the platform is put together. **[tested]**

```
Platform descriptor (platform-lsp)      "FOLIO = these applications at these versions"
  └─ Application descriptor (FAR)       "app-inventory = these modules + UI modules; needs app-platform-minimal"
       └─ Module descriptor (each repo) "mod-inventory provides interface inventory 14.x with these endpoints
                                         and permissions; requires item-storage 10.x, users 16.x …;
                                         run it with this Docker image, memory, env vars"
```

- **Interfaces** are the contract between modules: `provides: inventory 14.0`, `requires: item-storage 10.0`.
  Versions are semantic (major = breaking). The platform refuses to install a module whose required interfaces
  are missing. So **a custom module can replace a standard one if it provides the same interfaces.**
- **Permissions** are declared per endpoint in the descriptor (`permissionsRequired`). In Eureka they become
  Keycloak **capabilities** grouped into **capability sets** and assigned to **roles**.
- **System interfaces** start with `_`: `_tenant` (install/upgrade a tenant: create schema, run migrations,
  load reference/sample data) and `_timer` (scheduled jobs, triggered by `mod-scheduler`).
- Our inventory script reads exactly these files (Appendix A).

## 2.6 Multi-tenancy

One FOLIO installation serves many **tenants** (libraries or library groups). **[tested]** **[docs]**

- Every request names the tenant (`x-okapi-tenant`); the token is only valid for its tenant's Keycloak realm.
- Each module gets its own Postgres schema per tenant: `diku_mod_users`, `diku_mod_inventory_storage`, …
  Data is separated by schema, not by row.
- Applications are **entitled per tenant**: tenant A can have Acquisitions, tenant B not.
- **Consortia** (`app-consortia`, "ECS") add a central tenant plus member tenants that share records
  (shared instances, cross-tenant requests).

## 2.7 Data patterns inside the modules

- **Storage vs. business-logic modules.** Many areas are split in two: `mod-inventory-storage` (CRUD,
  validation, owns the tables) and `mod-inventory` (workflows that combine several records and modules).
  The same pattern exists for orders, invoices, finance, organizations and circulation.
  Rule of thumb: **write through the business-logic API** (it enforces the rules), read from storage when
  you need speed.
- **Records are JSON documents in PostgreSQL** (`jsonb` columns), validated against JSON Schemas (RMB modules)
  or mapped to tables (Spring modules).
- **Queries use CQL** (`title="semantic*" and languages=="eng"`), translated into SQL or OpenSearch.
  Exact (`==`) vs. word (`=`) matching matters for performance (Part 5).
- **References by UUID.** Locations, material types, loan types etc. are records; other records point to
  them by `id`. Never hard-code labels. **[tested]**
- **Events.** After a change, many modules publish a Kafka event (`<env>.<tenant>.inventory.instance`, …).
  Consumers: `mod-search` (indexing), `mod-audit` (history), `mod-patron-blocks` (limits), data import
  pipeline, remote storage, consortia sync. `mod-pubsub` is the older HTTP-to-Kafka bridge still used by
  circulation.

## 2.8 Backend frameworks in use **[tested]** (from each module's build file)

| Framework | Modules | Notes |
|---|---|---|
| **Spring Boot** + `folio-spring-base` ("Spring Way") | **44**, incl. most edge modules, mod-search, mod-roles-keycloak, mod-notes, mod-locations, mod-fqm-manager, mod-lists, mod-bulk-operations, mod-dcb | **Recommended for new modules.** Generated APIs from OpenAPI, Liquibase migrations, standard Spring. |
| **RAML Module Builder (RMB)** on Vert.x | **~39**, incl. mod-users, mod-inventory-storage, mod-circulation(-storage), mod-orders, mod-finance, mod-invoice, mod-feesfines, SRS/SRM | Older FOLIO framework: RAML + JSON Schema → generated code, reactive Vert.x. Still maintained. |
| **Plain Vert.x** | **~11**: mod-inventory, mod-settings, mod-eusage-reports, mod-batch-print, mod-inventory-update, edge-sip2, and the older edge modules on `edge-common` (patron, orders, ncip, connexion) | Index Data / older modules. |
| **Grails (Groovy)** | **5**: mod-agreements, mod-licenses, mod-oa, mod-serials-management, mod-service-interaction | The "ERM" family (originally by Knowledge Integration). Different stack, different tuning (DB pool 50). |
| **Node.js** | mod-graphql | GraphQL layer over the REST APIs. |
| **Go** | mod-reporting | Bridge to the LDP/Metadb reporting database. |

Takeaway: a team supporting FOLIO needs **Java/Spring** first, Vert.x knowledge for core RMB modules, and
React for the UI.

## 2.9 The UI: Stripes

**[docs]** **[tested]**

- **Stripes** = FOLIO's UI framework (React, React Router, Redux, final-form) plus a component library
  (`stripes-components`: tables, forms, panes, accessibility built in) and `stripes-connect`/`react-query` for data.
- Every UI app is an npm package (`@folio/inventory`) with a `package.json` `stripes` section: its name,
  route, permissions it needs, and which backend interfaces it requires. If the interface is missing, the
  app is hidden.
- **Plugins** let apps reuse each other's UI (e.g. `plugin-find-user` opens the user search inside Check out).
- The **platform build** (`stripes build`, our `eureka-cli buildUi`) bundles the chosen apps into one static
  site. Adding or removing an app = rebuild the bundle. **[tested]**
- Settings pages, translations (via Lokalise), and keyboard shortcuts are part of the framework.

## 2.10 Edge modules — the "outside door"

**[docs]** **[tested]**

Edge modules (`edge-*`) expose a **small, safe subset** of the API to outside systems that cannot log in as a
user: self-check machines (SIP2), discovery systems (RTAC, patron), vendors (orders, Connexion), resource
sharing (NCIP, INN-Reach, DCB).

- Auth is by **API key** (`?apikey=…`): the key encodes tenant + a dedicated system user whose password
  is stored in Vault/AWS SSM. The caller never sees a FOLIO token.
- They are thin proxies (0 own endpoints in the descriptors): they translate and forward to `mod-*` APIs.
- For a **public Drupal site**, `edge-patron` + `edge-rtac` are the textbook route. Our prototype used the
  normal API with a service account instead, which is simpler for a prototype but gives broader access (Part 7).

## 2.11 Deployment building blocks

**[docs]** **[tested]**

- Every module is a **Docker image**: `folioci/*` = snapshot builds, `folioorg/*` = releases. All amd64; we
  run them under Rosetta on Apple Silicon. **[tested]**
- **Local / test:** `eureka-cli` with Docker Compose-like orchestration (what we used).
- **Production:** **Kubernetes** with FOLIO's Helm charts (`folio-helm-v2`), managed PostgreSQL, Kafka
  (e.g. AWS MSK), OpenSearch, S3. EBSCO and others run on AWS.
- Default memory from the descriptors adds up to **~70 GB for all 101 modules** (not counting sidecars,
  Postgres, Kafka, OpenSearch, Keycloak, Kong). A realistic production cluster is therefore well above that
  (Part 5). **[tested]**

## 2.12 What to keep in mind

- **Never bypass the API** (no direct SQL writes): modules cache, publish events and run validations
  that SQL writes skip, which leaves the search index and other modules out of sync.
- **Interface versions are the compatibility contract.** Pin them in custom modules; read release notes for
  major bumps before upgrading.
- **Each tenant = new schemas, realm, Kafka topics.** Plan tenants deliberately; they are not cheap to add or remove.
- **Two security models during transition:** permissions (descriptor) → capabilities (Keycloak). Grant roles,
  not individual permissions.
- **Asynchronous parts are eventually consistent.** Search results lag writes by seconds; imports run as jobs.

## Sources
- Eureka overview: https://folio-org.atlassian.net/wiki/spaces/FOLIJET/pages/757792931/Overview+of+Okapi+vs+Eureka
- Module descriptors: https://github.com/folio-org/okapi/blob/master/doc/guide.md#module-descriptor (concept unchanged)
- Spring Way: https://github.com/folio-org/folio-spring-support · RMB: https://github.com/folio-org/raml-module-builder
- Stripes: https://github.com/folio-org/stripes · Edge modules: https://github.com/folio-org/edge-common
- Platform descriptor: https://github.com/folio-org/platform-lsp · FAR: https://far.ci.folio.org
