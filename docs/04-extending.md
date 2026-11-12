# Part 4 — Extending FOLIO

> **Audience:** technical team. **Short answer to "can we build our own module?": yes.** FOLIO is designed
> for it, and the local tooling supports it directly.

## 4.1 The extension ladder — always start at the lowest step

| Level | What | Code? | Upgrade risk | Examples |
|---|---|---|---|---|
| **0. Configuration** | Settings, policies, rules, templates, profiles, roles | None | None | Circulation rules, loan policies, notice templates, user custom fields, data-import profiles, MARC mapping rules, record specifications, Keycloak SSO |
| **1. Queries & lists** | FQM custom entity types, saved Lists, Dashboard widgets | JSON/SQL-ish | Low | "Overdue items per branch" list, management widgets |
| **2. External integration** | Our own app calls FOLIO's REST/edge APIs | Our code, outside FOLIO | Low (API contracts are versioned) | **Drupal module** **[tested]**, sync jobs, ERP export, kiosk |
| **3. New UI app or plugin** | A Stripes app added to the staff UI | React | Medium (Stripes major versions) | Local workflow screen, custom report viewer |
| **4. New backend module** | A `mod-*` with its own API, data and permissions | Java/Spring (or any language) | Medium | Company-specific business logic, new integration, event consumer |
| **5. Replace/override a module** | Our module provides the same interface as a standard one | Java | **High** | Custom search provider, alternative notice sender |
| **6. Fork core** | Change FOLIO's own modules | Java/React | **Very high**: we re-apply our changes at every upgrade | Avoid; contribute upstream instead |

**Rule:** go as low as possible. Levels 0–4 survive upgrades; 5–6 make every yearly upgrade a project.

## 4.2 Level 0–1: configuration that replaces code

- **Circulation:** rules language, loan/request/notice/fine/lost-item policies, fixed due-date schedules,
  patron blocks, staff slips, hold-shelf expiry, title-level requests.
- **Users:** custom fields, patron groups, address types, departments.
- **Inventory/MARC:** reference lists (types, statuses, statistical codes, note types), MARC→Inventory
  **mapping rules**, **record specifications** (validation), number generators.
- **Data import/export:** job/match/action/mapping profiles, field protection.
- **Security:** roles and capability sets, acquisition units, Keycloak realm (SSO, MFA, password policy,
  token lifetimes).
- **Notices:** HTML templates with tokens.
- **FQM:** custom entity types (`/entity-types/custom`) and Lists, i.e. new staff reports without a module.

## 4.3 Level 2: external integrations (where Drupal sits)

- Use the **same API the UI uses** (Kong) with a dedicated service user and minimal role, or
  **edge modules** with API keys for public-facing use.
- Learned patterns from our Drupal module **[tested]**: cache the token until expiry − 60 s, re-login once on
  401, map 422 to user-visible messages, cache reference data (locations) for a day, never cache
  availability in the page cache, timeouts 5 s connect / 15 s total.
- Event-driven integrations can **consume Kafka topics** (e.g. inventory changes) instead of polling.
  This requires network access to Kafka and agreement on topic formats (they are internal, so they can change).

## 4.4 Level 3: a custom UI app (Stripes)

**[docs]**

1. Scaffold: `npx @folio/stripes-cli app create "Hello"` → creates `ui-hello` with `package.json`,
   `index.js`, routes, translations.
2. Declare in `package.json` → `stripes`: `actsAs: ["app"]` (or `plugin`, `settings`, `handler`), `route`,
   the backend interfaces it needs (`okapiInterfaces: { "hello": "1.0" }`) and permission sets.
3. Build UI using `@folio/stripes/components` (Pane, MultiColumnList, forms) and `stripes-connect` /
   `useOkapiKy` + react-query for API calls (the token and tenant headers are added automatically).
4. Run against a backend: `stripes serve --okapi http://localhost:8000 --tenant diku` (via Kong).
5. Add to the platform: in Eureka, generate the UI module descriptor and reference it in
   `frontend-modules` (eureka-cli supports `local-descriptor-path` **[docs]**), then rebuild the UI bundle
   (`eureka-cli buildUi`).

**Keep in mind:** follow FOLIO's UI conventions (accessibility, translations, permissions), or staff will
feel the difference. Stripes has major versions roughly yearly, so budget time to update apps.

## 4.5 Level 4: a custom backend module

### Anatomy of a module **[docs]** **[tested]** (from 101 real descriptors)
- **Code:** recommended stack = **Spring Boot + `folio-spring-base`** (44 of 101 modules use it). It gives:
  OpenAPI-first code generation, `_tenant` handling (create schema, run **Liquibase** migrations, load
  reference data), FOLIO execution context (tenant, user, token), Feign clients for calling other modules,
  Kafka helpers, CQL→JPA queries, standard error format.
- **Module descriptor** (`descriptors/ModuleDescriptor-template.json`): what it provides and requires:

```json
{
  "id": "mod-hello-1.0.0",
  "name": "Hello (company custom module)",
  "provides": [
    { "id": "hello", "version": "1.0",
      "handlers": [
        { "methods": ["GET"], "pathPattern": "/hello", "permissionsRequired": ["hello.item.get"] },
        { "methods": ["POST"], "pathPattern": "/hello", "permissionsRequired": ["hello.item.post"],
          "modulePermissions": ["users.item.get"] }
      ] },
    { "id": "_tenant", "version": "2.0", "interfaceType": "system",
      "handlers": [ { "methods": ["POST"], "pathPattern": "/_/tenant" },
                    { "methods": ["GET", "DELETE"], "pathPattern": "/_/tenant/{id}" } ] }
  ],
  "requires": [ { "id": "users", "version": "16.0" } ],
  "permissionSets": [
    { "permissionName": "hello.item.get",  "displayName": "Hello - read greeting" },
    { "permissionName": "hello.item.post", "displayName": "Hello - create greeting" }
  ],
  "launchDescriptor": {
    "dockerImage": "mod-hello:1.0.0",
    "dockerArgs": { "HostConfig": { "Memory": 402653184, "PortBindings": { "8081/tcp": [ { "HostPort": "%p" } ] } } },
    "env": [ { "name": "JAVA_OPTIONS", "value": "-XX:MaxRAMPercentage=66.0" },
             { "name": "DB_HOST", "value": "postgres" } ]
  }
}
```

- `permissionsRequired` → become Keycloak **capabilities** that roles can grant.
- `modulePermissions` → what **our module** may call on other modules on the user's behalf.
- `requires` → the platform refuses to enable the module if `users 16.x` is missing.
- **Application descriptor:** in Eureka a module must belong to an **application**. Ours would be a small
  `app-<company>` that depends on `app-platform-minimal`/`complete` and lists our modules (and UI modules).

### Local development loop with eureka-cli **[docs]** (built into the tool we already use)

| Need | Command |
|---|---|
| Build and run a **brand-new** module from a local folder | `eureka-cli runLocalModule --modulePath ~/repos/mod-hello` → builds image `foliolocal/mod-hello`, deploys module + sidecar, creates child application `app-local`, registers Kong routes, entitles tenant |
| Rebuild after changes | Re-run the same command (bumps `app-local` patch version, upgrades entitlement) |
| **Debug** with breakpoints in IntelliJ against the running platform | `eureka-cli interceptModule -n mod-hello -g --moduleUrl 36002 --sidecarUrl 37002` (restore with `-r`) |
| Change an existing standard module | `eureka-cli upgradeModule -n mod-orders --modulePath …` |
| Ship as a "third-party application" | Own application descriptor + Docker registry (`namespaces.backend-modules`) |

### Production path
1. Build Docker image in CI, push to our registry.
2. Register application descriptor with `mgr-applications` (or a FAR we control).
3. Deploy module + sidecar (Helm chart, same pattern as standard modules).
4. Entitle the application for the tenant(s) (`mgr-tenant-entitlements`) → runs `_tenant` → schema created.
5. Assign the new capabilities to roles.

### Design rules for a good custom module
- **Own your data:** own schema, never write into other modules' tables. Read others via their APIs.
- **Version the interface** (`hello 1.0`); breaking change → `2.0`.
- **Idempotent `_tenant`** (install, upgrade, disable) and Liquibase migrations.
- **Stateless and horizontally scalable;** configuration from env/settings, secrets from Vault.
- **Emit/consume Kafka events** for asynchronous work instead of calling back synchronously.
- **Follow FOLIO conventions** (CQL search, `totalRecords`, error JSON, `metadata` block) so the UI and tools work with it.
- Not in Java? Any language works if it speaks HTTP and the descriptor contract (`mod-reporting` is Go,
  `mod-graphql` Node.js **[tested]**), but you lose `folio-spring-base`'s plumbing.

## 4.6 Level 5–6: overriding or forking

- Because modules are matched by **interface**, a custom module can replace a standard one if it provides
  the identical interfaces. Useful for experiments, but you must track every upstream change of that interface.
- Forking a core module means merging upstream changes at every release. Instead: open an issue on FOLIO's
  Jira, discuss it in the relevant SIG, contribute a pull request. Upstreamed code is maintained by the community.

## 4.7 Getting a module into official FOLIO

The Technical Council has **acceptance criteria for new modules** (license, code quality, tests, security,
documentation, i18n, accessibility, use of approved technologies). A module that passes can join the
official release and FAR. Worth it only if the feature helps other libraries too. **[docs]**

## 4.8 Proposed hands-on proof (next step)

Build `mod-hello` (Spring Way) + `ui-hello` (Stripes) and run them on our local install with `runLocalModule`:
- `GET /hello` returns a greeting stored per tenant; `POST /hello` stores one, enriched with the calling
  user's name (calls `mod-users` through the sidecar → proves module-to-module auth).
- A capability "Hello - read" assigned to a role → proves permission handling.
- UI page listing greetings → proves Stripes integration.
- Drupal block calling `/hello` → proves the whole chain.

Status: **planned, not yet done**. It will turn this chapter's **[docs]** claims into **[tested]** ones.

## Sources
- eureka-cli module development guide: `eureka-setup/eureka-cli/docs/MODULE_DEVELOPMENT_GUIDE.md`, README "Run a local module"
- Spring Way: https://github.com/folio-org/folio-spring-support
- Stripes CLI: https://github.com/folio-org/stripes-cli · Stripes guides: https://github.com/folio-org/stripes
- Module acceptance criteria: https://github.com/folio-org/tech-council/blob/master/MODULE_ACCEPTANCE_CRITERIA.MD
- Developer docs: https://dev.folio.org
