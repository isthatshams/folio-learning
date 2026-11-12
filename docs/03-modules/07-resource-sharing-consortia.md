# 3.7 Resource sharing & consortia

> Applications: **app-consortia**, **app-consortia-manager**, **app-dcb**, **app-inn-reach**,
> **app-requests-ecs**.

## What this area does

Lets **several libraries work together**:

- **Consortia (ECS, "Enhanced Consortial Support")**: one FOLIO installation with a **central tenant** and
  **member tenants**. Shared instances, shared reference data, staff working across tenants,
  **cross-tenant requests**. Example: a university system with several campus libraries.
- **Resource sharing between separate systems:** lending/borrowing with other libraries through
  **INN-Reach** (Innovative's network) or **DCB** (Direct Consortial Borrowing, OpenRS/K-Int).

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-consortia-keycloak` | Consortium setup: tenants, user affiliations, sharing of instances and settings, publish to members | Spring | 40 | 669 MB | ✓ |
| `mod-tlr` | **Title-level requests across tenants** (ECS TLR): primary/secondary requests, slips, loans | Spring | 14 | 1024 MB | ✓ |
| `mod-circulation-bff` | "Backend for frontend" for consortial circulation UI (requests, check in/out across tenants) | Spring | 22 | 341 MB | |
| `mod-dcb` | DCB transactions: borrowing/lending/pickup roles, shadow locations, virtual items | Spring | 17 | 669 MB | ✓ |
| `mod-circulation-item` | "Virtual" circulation items for borrowed material that isn't in local inventory | Spring | 4 | 679 MB | |
| `edge-dcb` | Edge API for the DCB hub | Spring | — | 256 MB | |
| `mod-inn-reach` | INN-Reach central server integration: contributions, patron verification, circulation transactions, paging slips | Spring | 83 | 512 MB | ✓ |
| `edge-inn-reach` | Edge API for the INN-Reach central server | Spring | — | 256 MB | |

UI modules: Consortia settings (consortia manager), INN-Reach settings; ECS behaviour appears inside Inventory,
Requests, Users.

## Deep dives

### mod-consortia-keycloak (ECS)
- **Key APIs:** `/consortia`, `/consortia/{id}/tenants`, `/consortia/{id}/user-tenants`,
  `/consortia/{id}/publications` (push a setting to many tenants), sharing instances/settings.
- **Data model:** instances can be **shared** (owned by central tenant, visible to all) or **local**;
  holdings/items stay with the member. `mod-search` provides consortium-wide search (`/search/consortium/...`).
- **Gotchas:** consortia are set up at the beginning. Converting an existing single-tenant setup is a project.

### DCB / INN-Reach
- Both create **temporary records** (virtual items, transient patrons) in FOLIO so that normal circulation
  (check out, check in, fines) works for borrowed items, then clean up.
- **When relevant:** only if the library joins such a network.

## Keep in mind
- Consortia multiply operational complexity: tenants × applications × roles.
- Cross-tenant permissions (user affiliations) must be managed centrally.

## Feature ideas
- For a multi-branch customer: ECS with one shared catalogue and a single Drupal portal over all branches
  (`/search/consortium/...`).

## Drupal relevance
Low unless we serve a consortium; then a unified Drupal discovery over consortium search is attractive.
