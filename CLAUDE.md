# FOLIO Learning Project

Learning FOLIO (open-source Library Services Platform) by doing, for work.
Company has not adopted FOLIO yet — goal is to understand what it is, how to use it,
what it can do, and whether/how it can integrate with **Drupal**.

## How to work with me (Claude)
- Learn-by-doing: explain each step briefly, then have me run/try things myself.
- Keep this file updated: tick off lessons, add new findings and gotchas.

## Environment

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
- **Architecture:** Java backend modules (`mod-*`) behind an API gateway; React UI (**Stripes**).
  Gateway is **Eureka** (Kong + Keycloak) since Sunflower release (Mar 2026); older docs use **Okapi**.
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
- [x] What FOLIO is, main apps, architecture overview
- [x] Explored demo UI: Inventory, Users, Check out / Check in
- [x] Installed local prerequisites (Go, eureka-cli, hosts, Docker resources)
- [x] Lesson 1 — API login & tokens
- [x] Lesson 2 — Search the catalog (CQL)
- [x] Lesson 3 — Instance → Holdings → Items via API
- [x] Practice: open loans query (worked)
- [x] Lesson 4 — Check out → renew → check in via API
- [x] Lesson 4 exercise — full loan cycle done myself (item `90000`, patron `789`)
- [~] Lesson 5 — Create records. Claude created instance "Learning FOLIO by Doing"
  (id `5de19cec-3d14-47c3-8d77-034317fb088a`, hrid `in00000000001`) on the demo.
  **My exercise:** fill `learn/lesson5-2-holding.json` → POST `/holdings-storage/holdings`,
  then `learn/lesson5-3-item.json` → POST `/item-storage/items`, then check out `SHAMS-0001`.
  (Demo server resets — recreate the instance if it's gone.)

### In progress
- [ ] Local FOLIO: `deployApplication --cleanup` running (after host.docker.internal fix)
- [ ] Practice exercises: user by barcode, search by author

### Up next
- [ ] Lesson 5 — Create records via API (instance → holding → item)
- [ ] Lesson 6 — Requests/holds & renewals (basis for a "My Account" page)
- [ ] Verify local install works; point `folio.sh` at it
- [ ] Settings & configuration tour (locations, loan policies, patron groups, permissions/roles)
- [ ] Data import: loading MARC records
- [ ] Drupal proof of concept: custom module that searches FOLIO catalog + shows availability
- [ ] Drupal POC part 2: patron login → my loans / renew
- [ ] Write up findings for the company (what FOLIO is, effort to adopt, Drupal integration options)

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
- Apple Silicon: some FOLIO images may be amd64-only → rely on Rosetta emulation; watch for failures.
