# 3.1 Platform core — users, login, roles, settings, locations

> Application: **app-platform-minimal** (required). Everything else depends on it.

## What this area does

The foundation every library needs before anything else works: **who** can use the system (users, patrons,
staff), **how they log in** (Keycloak), **what they may do** (roles, capabilities), **where** things happen
(institutions → campuses → libraries → locations, and service points), and shared settings (locale, currency,
base URL), notes and tags.

Typical setup order for a new library: locale & currency → location hierarchy → service points →
patron groups → staff roles → users. **[tested]** (we had to add service points to `diku_admin` locally
before Check out worked).

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-users` | User records (staff + patrons), patron groups, address types, departments, proxies, custom fields, patron PINs | RMB | 55 | 512 MB | ✓ |
| `mod-users-bl` | "Business logic" over users: composite user view, password reset, forgotten username | RMB | 17 | 512 MB | |
| `mod-users-keycloak` | Creates/updates users **in Keycloak and mod-users together**; migration of users to Keycloak | Spring | 19 | 512 MB | |
| `mod-login-keycloak` | Login, logout, token refresh, credentials, password reset | Spring | 24 | 341 MB | |
| `mod-roles-keycloak` | Roles, policies, **capabilities** and capability sets; assign to users | Spring | 51 | 341 MB | |
| `mod-permissions` | Legacy permission store (Okapi era); still needed during transition | RMB | 11 | 682 MB | |
| `mod-password-validator` | Password rules per tenant (length, characters, no username…) | Spring | 6 | 512 MB | |
| `mod-locations` | Institutions, campuses, libraries, locations, **service points** (moved out of inventory-storage) | Spring | 36 | 682 MB | ✓ |
| `mod-settings` | Modern key/value settings store, locale, base URL, tenant addresses | Vert.x | 15 | 2048 MB | |
| `mod-configuration` | **Legacy** key/value configuration store; being replaced by mod-settings | RMB | 6 | 341 MB | |
| `mod-notes` | Notes attachable to any record (user, instance, agreement…) with note types | Spring | 12 | 517 MB | ✓ |
| `mod-tags` | Free tags on records | Spring | 5 | 517 MB | |
| `mod-scheduler` | Runs modules' `_timer` jobs (e.g. overdue checks, anonymisation) on schedules | Spring | 5 | 517 MB | |
| `mod-okapi-facade` | Emulates Okapi's `/_/proxy/...` API for old tools on Eureka | Spring | 54 | 341 MB | |
| `edge-users` | Edge API to look up / create users from outside (e.g. self-registration) | Spring | — | 256 MB | |

UI modules: Users (`ui-users`), Settings → Tenant, Authorization roles, Authorization policies, Notes, Tags,
Developer tools, plus the Stripes core libraries.

## Deep dives

### mod-users
- **Data:** `users` (username, barcode, `patronGroup`, `active`, `personal{}` name/email/addresses,
  `expirationDate`, `customFields`), `groups` (patron groups: drive loan rules and fees), `addresstypes`,
  `proxiesfor`, `departments`, `custom-fields`. Schema `<tenant>_mod_users`.
- **Key APIs:** `GET /users?query=barcode=="789"` **[tested]** · `POST/PUT /users` · `GET /groups` ·
  `POST /patron-pin/verify` · `GET /users/profile-picture/{id}` · `/staging-users` (self-registration queue).
- **Events:** publishes user changes to Kafka (used by consortia, patron blocks, search of users).
- **Configuration/extension:** **custom fields** (text, checkbox, select) without code; patron groups;
  address types; user expiration.
- **Gotchas:** creating a user through `/users` does **not** give them a login in Eureka. Use
  `mod-users-keycloak` (`POST /users-keycloak/users`) so Keycloak gets the user too. Patron barcode must be
  unique **[tested]**.
- **Relevance:** Drupal maps its users to FOLIO patrons by barcode (our prototype field `folio_barcode`) **[tested]**;
  `staging-users` + `edge-users` could power **online library-card registration** from Drupal.

### mod-login-keycloak + Keycloak
- **Key APIs:** `POST /authn/login-with-expiry` **[tested]**, `POST /authn/refresh`, `POST /authn/logout`,
  `POST /authn/credentials`, `POST /authn/update` (change password), password-reset endpoints.
- **Behaviour:** tokens are Keycloak JWTs per tenant realm; access ~10 min, refresh ~1 day **[tested]**.
- **Configuration:** token lifetimes, password policy, brute-force lockout, **SSO** (SAML/OIDC identity
  providers) are Keycloak realm settings. No FOLIO code needed.
- **Gotchas:** passwords cannot be migrated from Okapi installs (users must reset) **[docs]**; Keycloak is a
  critical single point of failure, so run it highly available.

### mod-roles-keycloak (authorization)
- **Model:** module descriptors declare *permissions* → Eureka turns them into **capabilities**
  (resource + action, e.g. `Users Item → view`) → grouped as **capability sets** → bundled into **roles** →
  roles assigned to users. Also **policies** (time-based, user-based).
- **Key APIs:** `/roles`, `/roles/users`, `/roles/capabilities`, `/roles/capability-sets`, `/capabilities`,
  `/users/{id}/capabilities`, `/policies`, `/loadable-roles` (roles shipped with modules).
- **Gotchas:** UI apps need both their own and their dependencies' capabilities; start from the default
  roles and copy them. Grant roles, not individual capabilities.
- **Relevance:** our Drupal integration's service user should get a **minimal custom role** (search,
  patron account, renew) rather than admin rights.

### mod-locations
- **Data:** a 4-level hierarchy **Institution → Campus → Library → Location**, plus **Service points**
  (physical desks where circulation happens) and which users may work at which service points.
- **Key APIs:** `/location-storage/locations`, `/location-storage/libraries|campuses|institutions`,
  `/service-point-storage/service-points`. The classic paths we used (`/locations`, `/service-points`,
  `/service-points-users`) **[tested]** are still declared by `mod-inventory-storage` for compatibility,
  so existing integrations keep working while the data moves to the new module.
- **Gotchas:** every circulation action needs a service point **[tested]**; locations drive circulation
  rules and hold-shelf/pickup options. Design the hierarchy carefully before data migration; renaming
  later is easy, restructuring is not.
- **Relevance:** Drupal shows location names (we cache `/locations` for a day **[tested]**); a "Our
  libraries" page could be generated from this data + `mod-calendar` opening hours.

### mod-settings vs mod-configuration
- `mod-configuration` (`/configurations/entries`) is the old free-form store (module, configName, code,
  value). Many settings still live there. `mod-settings` (`/settings/entries`, `/locale`, `/base-url`) is
  the replacement with scoped permissions. Expect settings to migrate between them across releases. Check
  both when automating configuration.

### mod-scheduler
- Replaces Okapi's built-in timers. Modules declare `_timer` endpoints (e.g. circulation's
  "scheduled age-to-lost", feesfines' "overdue fines", anonymisation). Duplicate timers were reported after
  Okapi→Eureka migrations **[docs]**.

### Small modules
- **mod-notes / mod-tags:** generic notes and tags linked to any record by `domain` + `type` + `id`.
- **mod-password-validator:** tenant password rules (`/tenant/rules`).
- **mod-permissions:** still deployed; holds the old permission definitions used during migration.
- **mod-okapi-facade:** lets older scripts and tools that call `/_/proxy/tenants/...` keep working.
- **edge-users:** API-key access to user lookup/registration for external portals.

## Keep in mind
- **Identity is split across mod-users (profile) and Keycloak (credentials, roles).** Always create and
  disable users through `mod-users-keycloak` or the UI, otherwise the two get out of sync.
- **Patron data is personal data (GDPR).** Configure loan anonymisation, user expiration and who can see
  personal fields (separate capabilities for "basic" vs "restricted" read).
- **Plan the location hierarchy and patron groups first.** Circulation rules, fines and reporting all depend on them.

## Feature ideas
- SSO: staff log in with the company's Microsoft/Google accounts via Keycloak; patrons via the same IdP as the Drupal site.
- Self-service library-card registration in Drupal → `staging-users` → staff approval in FOLIO.
- Patron profile sync: Drupal profile changes (address, email) pushed to FOLIO.
- Custom fields for local data (student ID, faculty, consent flags).

## Drupal relevance
High. Login/token handling (done in our `FolioClient`), patron lookup by barcode, location data. **[tested]**
