# FOLIO Learning Project

Learning FOLIO (open-source Library Services Platform) by doing, for work.
Company has not adopted FOLIO yet — goal is to understand what it is, how to use it,
what it can do, and whether/how it can integrate with **Drupal**.

## How to work with me (Claude)
- Learn-by-doing: explain each step briefly, then have me run/try things myself.
- Keep this file updated: tick off lessons, add new findings and gotchas.

## Environment

### Git repo
- Public on **personal** account: https://github.com/isthatshams/folio-learning
- Remote uses SSH alias `github.com-personal`; repo-local git identity = personal noreply email
  (global identity is the work account, so never change these).
- `CLAUDE.md` is globally gitignored, so it was force-added here: `git add -f CLAUDE.md` if it ever drops out.
- `eureka-setup/` and `*.log` are ignored.

### Public demo server (resets regularly — changes don't persist)
- UI: https://folio-etesting-snapshot-diku.ci.folio.org
- API gateway: https://folio-etesting-snapshot-kong.ci.folio.org
- Tenant: `diku` · Login: `diku_admin` / `admin`
- Old URL `folio-snapshot.dev.folio.org` no longer exists (NXDOMAIN) — many docs still mention it.
- Test barcodes: patrons `456`, `789`, `123` · items `90000`, `10101`, `A1429864347`

### Local FOLIO (Eureka platform)
- Machine: MacBook M1 Pro (arm64), 32 GB RAM, ~71 GB free disk
- Docker Desktop (not Rancher — brew cask conflicts): 24 GB RAM, 10 CPUs, Rosetta on
- Setup tool: `~/Projects/folio/eureka-setup/eureka-cli` → binary `~/go/bin/eureka-cli`
- `/etc/hosts` has `127.0.0.1 postgres|kafka|vault|keycloak|kong.eureka`
- Commands:
  - `eureka-cli buildUi` (run first; UI build peaks ~8 GB RAM)
  - `eureka-cli deployApplication` (add `-q` to skip optional containers if low on resources)
  - `eureka-cli undeployApplication` (add `-k` to keep data)
- Logs: `~/Projects/folio/build-ui.log`, `~/Projects/folio/deploy.log`
- Once running: UI http://localhost:3000 · API http://localhost:8000 · `diku_admin` / `admin`
  · Keycloak http://keycloak.eureka:8080 (`admin`/`admin`) · container logs (Dozzle) http://localhost:8888

### Learning toolkit
- `learn/folio.sh METHOD PATH [JSON]` — logs in and calls the API.
  Demo by default; `FOLIO=local ./folio.sh ...` for the local install.

## Key concepts learned
- **Architecture write-up:** `architecture.md` (layers diagram, what each part does, Drupal angle).
- **Architecture:** Java backend modules (`mod-*`) behind an API gateway; React UI (**Stripes**).
  Gateway is **Eureka** (Kong + Keycloak) since Sunflower (R1 2025); older docs use **Okapi**. Current release = **Trillium (R1 2026, 2026-06-08, supported to 2027-06-30)**; our demo/local = R1-2027 snapshot.
- **Multi-tenant:** one server hosts many libraries; every request sends `x-okapi-tenant`.
- **Auth:** `POST /authn/login-with-expiry` → `folioAccessToken` (~10 min) + `folioRefreshToken` (~1 day)
  as cookies; send token as `x-okapi-token` header.
- **Inventory model:** Instance (title) → Holdings (call number/location) → Item (physical copy, barcode, status).
- **CQL queries:** `title=semantic` (contains), `barcode==456` (exact); URL-encode `=` as `%3D`.
- **Circulation API** (all need a service point = the desk; demo "Circ Desk 1" = `3a40852d-49fd-4df2-a1f9-6e2641a6e91f`):
  - `POST /circulation/check-out-by-barcode` `{itemBarcode, userBarcode, servicePointId}`
  - `POST /circulation/renew-by-barcode` `{itemBarcode, userBarcode}`
  - `POST /circulation/check-in-by-barcode` `{itemBarcode, servicePointId, checkInDate}`
  - Find service points: `GET /service-points`
- **Loan policies:** FOLIO picks due date/renewal rules automatically via circulation rules
  (patron group + item type + location). Demo uses "One Hour"; renewals count from *now*.
- **Reference data:** types/locations/statuses are records with IDs — look them up, never guess:
  `/instance-types`, `/locations`, `/holdings-sources`, `/material-types`, `/loan-types`,
  `/contributor-name-types`. (Demo IDs are stable reference data.)
- **Creating records:** `POST /instance-storage/instances` → `/holdings-storage/holdings`
  (needs `instanceId`) → `/item-storage/items` (needs `holdingsRecordId`). 201 = Created, returns `id`.
- **Drupal:** no existing FOLIO integration found → would be a custom Drupal module calling FOLIO REST APIs.
  Libraries usually use VuFind / Blacklight / EBSCO EDS as discovery layers.

## Progress

### Done
- [x] Part 1 (overview) drafted in `docs/01-overview.md` — needs my review
- [x] What FOLIO is, main apps, architecture overview
- [x] Explored demo UI: Inventory, Users, Check out / Check in
- [x] Installed local prerequisites (Go, eureka-cli, hosts, Docker resources)
- [x] Lesson 1 — API login & tokens
- [x] Lesson 2 — Search the catalog (CQL)
- [x] Lesson 3 — Instance → Holdings → Items via API
- [x] Practice: open loans query (worked)
- [x] Lesson 4 — Check out → renew → check in via API
- [x] Lesson 4 exercise — full loan cycle done myself (item `90000`, patron `789`)
- [x] Lesson 5 — Create records via API, all done myself on the demo:
  instance `5de19cec-3d14-47c3-8d77-034317fb088a` ("Learning FOLIO by Doing") →
  holding `d4e792eb-8e72-4b6a-a3e9-381b73868c43` (Main Library, source FOLIO) →
  item `SHAMS-0001` (`3f6015f4-d253-4077-9f22-ec6612f171d5`) → checked out to patron `789`.
  (Demo resets: recreate with `./folio.sh POST /instance-storage/instances "$(cat lesson5-1-instance.json)"`,
  and the new instance gets a new id.)

### In progress
- [x] **Local FOLIO running** (2026-11-05, 3rd attempt, deploy took 12 min) without acquisitions, `-q`.
  UI http://localhost:3000 ✓, `FOLIO=local ./folio.sh ...` ✓, sample users (456 = morty) ✓,
  36 instances ✓, but **0 holdings/items**: the sample load failed (see gotchas). Create items via Lesson 5 JSON.
  Local records: instance `ef90b3c7-2ea7-4f40-a754-42eafc1c8455` → holding `ea21f4cd-1b6f-4808-a4e7-998e82313d31`
  → item `SHAMS-0001` (`862070e2-99ab-4878-8b57-c978b3e58d7e`). `lesson5-2/3` JSON files now hold the
  **local** ids. Reference data ids (locations, material/loan types, sources, Circ Desk 1) = same as demo.
  Manual holdings POST works (has a user token), unlike the sample-data load.
- [~] Lesson 6 — Requests/holds: patron `456` placed a Hold on `SHAMS-0001` while 789 had it
  (request `6775bf77-9f47-49fa-a98e-bb09e40b4571`, body in `lesson6-1-request.json`).
  Check-in → loan Closed, item **Awaiting pickup**, request **Open - Awaiting pickup**,
  hold shelf expires in 3 weeks. Checked out to 456 (`checkout-456.json`) → item Checked out,
  request **Closed - Filled** (drops out of the queue, no position). Next: try a Recall.
- [ ] Practice exercises: user by barcode, search by author

### Up next
- [ ] Settings & configuration tour (locations, loan policies, patron groups, permissions/roles)
- [ ] Data import: loading MARC records
- [~] Drupal proof of concept: module `folio_search` in `~/Projects/drupal/my-project/public_html/modules/custom/`
  (site http://my-project.local, native PHP/MySQL, docroot `public_html/`, Drupal 11.4).
  Done: `/library-search` search box (POST → redirect to `?q=`), results via Twig template with authors,
  publisher and per-item location / call number / status badge, pager (10/page). Data from mod-search
  `GET /search/instances?query=keyword all "x" and discoverySuppress==false&expandAll=true&offset=`;
  location names from `/locations` (cached 1 day in Drupal cache). Anonymous page cache disabled for
  this page (kill switch), since availability changes and the page cache ignores max-age.
  settings form `/admin/config/services/folio` (config `folio_search.settings`; password = config override
  in `sites/default/local.settings.inc`, so `drush cex` never exports it), `FolioClient` service.
  Step 4 done: token cached in Drupal cache until FOLIO's `accessTokenExpiration` − 60 s (on 401: re-login
  + retry once); all failures → `FolioException`, logged to channel `folio_search`
  (`drush watchdog:show --type=folio_search`), page shows "catalog not available", uncached.
  Cache entries + result pages carry tag `config:folio_search.settings` → saving settings clears them.
  Timeouts 5 s connect / 15 s total. Wrong tenant → login 400; bad host → cURL error 6.
  Filters (2026-11-10): Language / Format / Location / Material type in a sidebar, multi-select, in the URL as
  `?q=..&f[language][]=eng`. CQL: `and languages==("eng" or "ger")` (OR within a filter, AND between filters).
  Counts from `GET /search/instances/facets?query=..&facet=languages:10&facet=instanceTypeId:10` (repeated
  `facet` param → built with `GuzzleHttp\Psr7\Query::build`, since Guzzle's array syntax sends `facet[0]`).
  Each filter's counts exclude its own selection (one facets call per distinct query; 1 call with no filters).
  Language codes are ISO 639-2 (`eng`, `ger`) → names via PHP intl `Locale::getDisplayLanguage`.
  `items.status.name` doesn't work as a filter on the demo (0 hits for "Available"), so no "available now" filter.
  Next: optional extras (cancel a hold, place a hold from search results, availability via JS), then write-up.
- [x] Drupal POC part 2 (2026-11-10): user base field `folio_barcode` (Library card barcode; only
  `administer users` can edit it; unique), added on the existing site via `folio_search_update_10001` (`drush updb`).
  Tab **Library account** at `/user/{uid}/library` (own account or user admins only): loans with Renew
  buttons, holds (status, place in line, pickup desk), fines total. Uses **mod-patron**, FOLIO's API for
  public sites: `GET /patron/account/{userId}?includeLoans=true&includeHolds=true&includeCharges=true`,
  `POST /patron/account/{userId}/item/{itemId}/renew`. Patron lookup: `GET /users?query=barcode=="789"`.
  FOLIO 422 → `FolioRefusedException`, FOLIO's message shown to the patron (e.g. renewal blocked by a hold).
  Local Drupal test users: `patron789` (uid 2) / `patron456` (uid 3), log in with `drush uli --name=patron789`.
  mod-search works on the **demo** only (not local).
- [~] **Boss deliverable (started 2026-11-10): full documentation first, then a slide deck from it.**
  Lives in `docs/` (Markdown in this repo). Outline + status table: `docs/README.md`
  (8 parts: overview → architecture → per-application module chapters → extending/custom module →
  performance → considerations → use cases/Drupal → recommendation). Per-module template `docs/_module-template.md`.
  Module inventory generated by `python3 docs/tools/module_inventory.py` (platform-lsp descriptor → FAR app
  descriptors) → `docs/reference/module-inventory.md`: 39 apps · 101 backend/edge · 76 UI modules (snapshot).
  pyenv Python here has no SSL → script falls back to curl. Mark claims **[tested]** vs **[docs]**.
  Plan includes building our own `mod-hello` + `ui-hello` and deploying it locally (Part 4).
  **2026-11-10: all parts drafted** (01–08, 03-modules/01–09 covering all 101 modules, glossary) and built into
  `docs/FOLIO-Evaluation-Guide.docx` via `docs/tools/build_docx.js` (no pandoc here; uses npm `docx` + `marked@12`).
  Waiting for my review → then PowerPoint. eureka-cli has `runLocalModule` (new module → `app-local`) and
  `interceptModule` (debug in IntelliJ) for the custom-module proof.

## Gotchas / notes
- **Reading API errors:** `folio.sh` prints `HTTP <status>` first. 2xx = ok; 422 = valid JSON but a
  field is missing/wrong (message names the field); 500 "Failed to decode" = broken JSON (quotes).
- JSON field names are case-sensitive (`servicePointId`, not `servicePointID`).
- Copying long wrapped commands from the terminal can corrupt them → put the body in a file:
  `./folio.sh POST /path "$(cat body.json)"`.
- FOLIO accepts a future `checkInDate` without complaint → real apps should send the current time.
- `add-hosts.sh` isn't executable after clone → run with `sudo bash <path>`.
- New terminal needed (or `source ~/.zshrc`) after adding `~/go/bin` to PATH.
- Some demo items have no barcode — search Inventory with the **Item** segment + Barcode option.
- **Docker Desktop on Mac:** deploy failed with `failed to ping http://172.17.0.1:8001/status`.
  eureka-cli looks for `host.docker.internal` on the Mac, else falls back to Linux-only `172.17.0.1`.
  Fix: `127.0.0.1 host.docker.internal` in `/etc/hosts` (Rancher Desktop adds this automatically).
  After a failed deploy, re-run with `eureka-cli deployApplication --cleanup`.
- **Deploy timed out at "CREATING TENANT ENTITLEMENTS"** (`timeout awaiting response headers`):
  installing modules + sample data takes >5 min on M1/Rosetta, but eureka-cli waits only 5 min.
  Fix (local patch): `eureka-cli/constant/constant.go` → `HTTPClientTimeout` and
  `HTTPClientResponseHeaderTimeout` = `45 * time.Minute`, then `go install .` in `eureka-cli/`.
  Also `ModuleReadinessMaxRetries` 70 → 200 (~10 s per check; modules need >12 min to start).
  Re-apply if `git pull` overwrites it.
- **Module stuck on `Waiting for changelog lock....`** (Liquibase): it was killed mid-migration during a
  slow-start restart and left a stale DB lock behind, so it waits forever. Check the lock, then release it:
  `docker exec postgres psql -U postgres -d folio -c "select * from pubsub_config.databasechangeloglock"`
  → `update <schema>.databasechangeloglock set locked=false, lockgranted=null, lockedby=null where id=1`
  (only when no migration is actually running). Hit `mod-pubsub` on 2026-11-05.
- **Deploy failed at entitlements with `status 400`** (2026-11-05): Docker ran out of RAM (22/24 GB),
  Keycloak's JVM was `Killed`, mgr-tenant-entitlements got 502 and rolled everything back.
  Fix: removed acquisitions (orders/invoice/finance/organizations backend + UI, ~5.4 GB) from
  `~/.eureka/config.combined.yaml` (backup `config.combined.yaml.bak-20261105-1637`), then
  `eureka-cli buildUi` + `deployApplication -q --cleanup` (`-q` skips OpenSearch/Garage/FTP, unused here).
- **Local sample data has no holdings/items:** during tenant init, inventory-storage's
  `POST /holdings-storage/holdings` calls `/user-tenants` without a token → 400 "System user token is
  required ... mod-inventory-storage" → 500, so holdings (and therefore items) are skipped. Deploy still
  reports success. Not fixed; possible fix to try: `sidecar-environment:
  HANDLER_EGRESS_IGNORE_SYSTEM_USER_TOKEN_ERROR: "true"` on mod-inventory-storage (untested).
- **Local Inventory UI search fails** ("Search could not be processed"): the Inventory app searches via
  `mod-search` (`/search/instances` → 404 locally), which needs OpenSearch and isn't in `combined`.
  API CQL search on `/instance-storage/instances` still works. To add it: the `search` profile
  (`~/.eureka/config.search.yaml`, mod-search + OpenSearch, ~2 GB more RAM; idle stack already ~20.5 GB).
- **Local "Access Denied … select a service point"** (Requests/Check in/out): fresh install gives
  `diku_admin` no service points. Fixed via `POST /service-points-users`
  `{userId, servicePointsIds:[...], defaultServicePointId}` (Circ Desk 1 default, + Circ Desk 2, Online).
  UI equivalent: Users → diku_admin → Edit → Service points. Log out/in afterwards.
- **Why local deploy is slow:** all FOLIO module + sidecar images are **amd64-only** → Rosetta;
  ~60 JVMs start at once on 10 CPUs. Ideas if still too slow: `-p combined-native` (native sidecars),
  or remove acquisitions modules (finance/invoice/orders/organizations) from the profile config. After that failure, only the 57 module containers were left
  (no postgres/kong/keycloak/UI), so it needs a full `--cleanup` redeploy, not just a restart.
- **Holdings `sourceId`:** use **FOLIO** for API-made records, not MARC. The API accepts any valid
  source id without complaint, but MARC-source holdings expect a MARC record behind them.
- **HTTP 504** = gateway timed out waiting for the module, so the result is unknown. Always GET to check
  whether the record was created before retrying, to avoid duplicates.
- **DELETE** returns `204` (no body) on success; a holding can only be deleted when it has no items.
- FOLIO allows duplicate instance titles, so re-POSTing an instance creates a second copy.
- Lookup tip: `./folio.sh GET /loan-types | grep -E '"(id|name)"'`, then take the id **above** the name.
- **Requests:** `POST /circulation/requests` needs `requesterId` (user UUID, not barcode). Which types
  (Hold/Recall/Page) are allowed comes from circulation rules; check first with
  `GET /circulation/requests/allowed-service-points?operation=create&requesterId=..&itemId=..`.
- **mod-patron hold cancel** (`POST /patron/account/{id}/hold/{requestId}/cancel`) needs the *whole* hold object
  (requestDate, pickupLocationId, …), not just the reason. Easier: `GET /circulation/requests/{id}`, set
  `status: "Closed - Cancelled"`, `cancellationReasonId`, `cancelledByUserId`, `cancelledDate`, then `PUT` it back (204).
- Demo loan policy blocks renewing when another patron has a hold: 422 "Items with this loan policy cannot be
  renewed when there is an active, pending hold request".
- Checking in an item with an open hold does **not** make it Available: it goes to *Awaiting pickup*
  at the pickup desk, and the request moves to *Open - Awaiting pickup*.
- **Heredocs:** the closing `EOF` must be at the very start of its line (no spaces); otherwise the
  shell keeps waiting (`∙` prompt) → Ctrl+C. Keep JSON lines short so pasting never splits a key.
- Apple Silicon: some FOLIO images may be amd64-only → rely on Rosetta emulation; watch for failures.
