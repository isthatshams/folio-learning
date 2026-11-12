# Part 7 — Use cases, feature ideas & Drupal integration

## 7.1 What we could use FOLIO for

| Use case | Description | Fit |
|---|---|---|
| **Library platform for a customer** | Implement/host FOLIO for a library (academic, special, public) with a Drupal website on top | Strong where the customer wants open source + custom web |
| **Discovery & patron portal (Drupal)** | Our core skill: the public face FOLIO doesn't have: catalogue, account, holds, opening hours, news | **Strongest**: FOLIO has no public UI; no existing Drupal–FOLIO integration found **[tested]** |
| **Internal collections management** | Company library, archive, equipment lending (laptops, devices) using inventory + circulation | Possible but FOLIO is heavy for small internal needs; Koha or a Drupal-only solution may be cheaper |
| **Integration services** | Connect FOLIO to ERPs, HR systems, payment providers, campus systems | Good: everything is API-driven |
| **Custom FOLIO modules** | Build features libraries need (and maybe contribute them) | Medium: needs Java/React skills, potential business with FOLIO libraries |
| **Hosting/support partner** | Become a FOLIO service provider | Large investment; competitive market (EBSCO, Index Data, others) |

## 7.2 Drupal integration — what we built **[tested]**

Custom module `folio_search` (Drupal 11.4, ~1,300 lines PHP/Twig/YAML):

| Feature | FOLIO API |
|---|---|
| Settings form (`/admin/config/services/folio`): URL, tenant, user; password kept out of exported config | — |
| `FolioClient` service: login, token cache until expiry − 60 s, re-login + retry on 401, timeouts, logging | `POST /authn/login-with-expiry` |
| **Catalogue search** `/library-search`: results with authors, publisher, per-item location/call number/status, pager | `GET /search/instances?query=keyword all "x" and discoverySuppress==false&expandAll=true` |
| **Filters** (language, format, location, material type), counts, multi-select | `GET /search/instances/facets?facet=…` |
| Location names (cached 1 day) | `GET /locations` |
| **Library account** tab `/user/{uid}/library`: loans with Renew, holds with queue position, fines total | `GET /patron/account/{id}?includeLoans…`, `POST …/renew` |
| Patron link: Drupal user field "Library card barcode" | `GET /users?query=barcode=="789"` |
| Errors: FOLIO refusals (422) shown to the patron, failures logged, "catalog not available" page | — |

## 7.3 Integration architecture options

### Option A — Live API (what we built)
Drupal calls FOLIO on each request (search, account), with caching where safe.
- ✅ Always current, simple, no extra infrastructure. ❌ Search speed and features limited to `mod-search`; FOLIO
  load grows with web traffic.

### Option B — Harvest + local index
FOLIO catalogue harvested (OAI-PMH or MARC export) into **Drupal Search API + Solr**; live calls only for
availability (RTAC) and patron account (edge-patron).
- ✅ Fast, fully custom relevance and facets, combine with Drupal content (events, guides) in one search,
  FOLIO protected from traffic peaks. ❌ More moving parts; index lag (minutes–hours).

### Option C — Hybrid (recommended for production)
Search from the local index (B), **record availability + account + holds live** via edge modules.

### Authentication options

| Approach | How | When |
|---|---|---|
| Service user on Kong API (prototype) | Drupal logs in as one FOLIO user with a restricted role | Prototype / internal |
| **Edge modules + API key** | `edge-patron`, `edge-rtac`; patron identified by external system ID | **Production public site** |
| **Shared SSO via Keycloak** | Drupal's OpenID Connect module logs patrons in against the FOLIO tenant's Keycloak realm (or both trust the institution's IdP) | One login for website + library account |

## 7.4 Feature ideas (backlog)

**Patron-facing (Drupal):**
1. Place a hold from search results (title- or item-level) **[next]**
2. Cancel a hold **[researched: needs full hold object]** **[tested]**
3. Live availability via RTAC (lighter than `expandAll`) / JS refresh
4. Online library-card registration → `staging-users` → staff approval
5. Pay fines online (payment provider → `/accounts/{id}/pay`)
6. Opening hours block from `mod-calendar`
7. "New arrivals", "most borrowed" lists (FQM/Lists or reporting)
8. A–Z databases and licence terms (ERM)
9. Purchase suggestions form → acquisitions
10. Course reserves pages (edge-courses)
11. Book covers & enrichment (ISBN-based)
12. Reading history / favourites stored in Drupal (privacy-friendly opt-in)
13. Multilingual catalogue UI (Drupal translation + FOLIO language facets)

**Staff / backend:**
14. SSO for staff (company IdP via Keycloak)
15. Nightly user sync from HR/student systems (`mod-user-import`)
16. Custom FOLIO module for company-specific logic (Part 4) with a Stripes UI
17. Management dashboards (Metadb + BI, or FOLIO Dashboard widgets)
18. ERP integration for invoices/vouchers
19. SMS notices
20. Self-check web kiosk

## 7.5 Effort indicators (qualitative)

| Item | Effort | Basis |
|---|---|---|
| Drupal search + account prototype | Done | Built during evaluation **[tested]** |
| Production-ready Drupal module (edge APIs, tests, theming, hold placement) | Medium | Extend prototype |
| Solr-based discovery (Option B/C) | Medium-High | Harvest pipeline + index design |
| Shared SSO | Low-Medium | Standard Keycloak + Drupal OIDC |
| Custom backend module + UI | Medium per feature | After the `mod-hello` proof (Part 4.8) |
| Full FOLIO implementation for a library | High | Hosting + configuration + migration (Part 6) |

## 7.6 Possible product: a reusable Drupal–FOLIO module

No public Drupal integration for FOLIO exists **[tested]** (search during evaluation). A generalised,
open-sourced version of `folio_search` (search, account, holds, availability, SSO) could:
- serve our own customers,
- make us known in the FOLIO community (FOLIO libraries using Drupal),
- be contributed to drupal.org, with paid implementation/support around it.
