# FOLIO Architecture (as of Sunflower / Eureka, 2026)

Short version: **React frontend → Eureka gateway (Kong + Keycloak + sidecars) → Java backend modules → PostgreSQL / Kafka.**

Correction to keep in mind: **Eureka is not the API.** It's the gateway/security layer in front of it.
The API itself is defined by each Java module.

## The layers

```
Browser
  │
  ▼
Frontend: Stripes (React)            → localhost:3000
  │  REST + JSON
  ▼
Eureka (gateway + security):
  Kong        → single entry point  → localhost:8000
  Keycloak    → login, tokens, roles
  mgr-*       → which apps/modules each tenant has
  │
  ▼
Sidecar (*-sc) next to every module  → checks token/permissions, routes calls
  │
  ▼
Backend: Java modules (mod-*)        → mod-users, mod-inventory, mod-circulation…
  │                                    each one defines its own REST API
  ▼
PostgreSQL (one schema per module per tenant, e.g. diku_mod_users)
Kafka (events between modules)
```

## What each part does

| Layer | Technology | Role |
|---|---|---|
| Frontend | React on FOLIO's **Stripes** framework | Staff UI. Each app (Inventory, Users, Requests…) is a separate UI module, e.g. `@folio/requests`. |
| Gateway | **Kong** | Single entry point for every API call. |
| Auth | **Keycloak** | Login, tokens (`folioAccessToken`), roles/capabilities. |
| Platform managers | `mgr-applications`, `mgr-tenants`, `mgr-tenant-entitlements` | Register apps, create tenants, install ("entitle") modules per tenant. |
| Sidecars | `mod-*-sc` (one per module) | Check the token + permissions, route module-to-module calls. |
| Backend | ~60 Java microservices (`mod-*`) | Business logic + REST API. Each module owns its data. |
| Database | **PostgreSQL** | One schema per module per tenant (`diku_mod_users`, `diku_mod_circulation`…). |
| Events | **Kafka** | Modules notify each other (e.g. inventory changes → mod-search). |
| Search (optional) | **OpenSearch** + `mod-search` | Powers the Inventory app's search. Not in our local `combined` profile. |

**Before Eureka:** older FOLIO releases (and most docs) use **Okapi** as the gateway instead of Kong + Keycloak + sidecars.

## Multi-tenancy

One FOLIO installation serves many libraries ("tenants"). Every request names its tenant
(`x-okapi-tenant: diku`), and every tenant gets its own database schemas.

## Seen in practice (lesson notes)

- `ERROR: in module @folio/requests ...` came from the **React** UI module.
- `An invalid response was received from the upstream server` (502) came from **Kong**, because the
  `mod-circulation-sc` **sidecar** was restarting.
- `learn/folio.sh` calls go: Kong → sidecar → **Java module**, the same path the React UI uses.
- "System user token is required…" came from a **sidecar** rejecting a module-to-module call.

## What this means for Drupal

Drupal would replace (or sit beside) the **frontend** for patron-facing pages. It would call the
**same REST API through Kong** that the React UI uses: log in (`/authn/login-with-expiry`), send the
token + tenant headers, call endpoints like `/instance-storage/instances` or `/circulation/loans`.
**No backend changes needed.**
