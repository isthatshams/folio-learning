# Part 1 — FOLIO Overview

> **Audience:** management and anyone new to FOLIO. No technical background needed.
> **Markers:** **[tested]** = we did or saw it ourselves (demo server, local install, Drupal prototype);
> **[docs]** = from FOLIO documentation or published sources (listed at the end).

## 1.1 FOLIO in one paragraph

**FOLIO** ("the Future Of Libraries Is Open") is an **open-source Library Services Platform (LSP)**:
the back-office system a library uses to run itself. It covers buying material, cataloguing it, lending it,
managing patrons and fines, and handling e-resources. It is built and governed by a community of libraries
and vendors under the **Open Library Foundation**, released under the **Apache 2.0** licence, and is free to
use. Technically, it is not one big program but a set of **~100 small services ("modules") behind one
API gateway**, with a web interface on top. That design is what makes it extensible, and
also what makes it demanding to run. **[docs]** **[tested]**

## 1.2 What it does — the functional areas

FOLIO groups its modules into **applications**. The current platform has **39 applications,
101 backend modules and 76 user-interface modules** (generated list: Appendix A). **[tested]**
In plain language they cover:

| Area | What staff do with it | Main FOLIO apps |
|---|---|---|
| **Users & access** | Patron and staff records, patron groups, roles and permissions, login | Users, Authorization roles, Settings |
| **Inventory / cataloguing** | Describe what the library owns: titles → copies on shelves → barcoded items; MARC records | Inventory, quickMARC, MARC authority, Linked data |
| **Circulation** | Check out, check in, renew, holds/recalls, loan rules, fines and fees, opening hours | Check out, Check in, Requests, Circulation log, Fees/fines, Calendar |
| **Acquisitions** | Order material, receive it, pay invoices, manage budgets, funds and vendors | Orders, Receiving, Invoices, Finance, Organizations |
| **E-resources (ERM)** | Licences, agreements, e-journal packages, usage statistics, open access | Agreements, Licenses, eHoldings, eUsage, Open Access |
| **Data in & out** | Bulk import of MARC records, export, bulk edits, saved lists and queries | Data import, Data export, Bulk edit, Lists |
| **Resource sharing** | Lending between libraries / consortia | INN-Reach, DCB, Consortia, Mediated requests |
| **Integrations** | Connections to vendors and outside systems (book suppliers, self-check machines, discovery) | Edge APIs, GOBI, EBSCONET, Mosaic, OAI-PMH, RTAC, NCIP/SIP2 |
| **Other** | Course reserves, serials, reading rooms, dashboards, notes, tags, reporting | Courses, Serials, Reading room, Dashboard, Reporting |

Only two applications are mandatory (`platform-minimal`, `platform-complete`); everything else is
optional and can be installed per library. **[tested]**

## 1.3 What FOLIO is *not*

These gaps matter when estimating a project. **[docs]** **[tested]**

- **Not a public catalogue (OPAC).** FOLIO's interface is for **staff**. Patrons search through a separate
  **discovery layer**: EBSCO Discovery Service, VuFind, Blacklight, Locate, or a custom site.
  This is exactly where **Drupal** can fit (Part 7). Our prototype already does search, filters and a patron
  "My account" page against FOLIO's API. **[tested]**
- **Not a website/CMS.** No public pages, events, news, etc.
- **Not a full reporting tool out of the box.** Serious reporting uses a separate analytics database
  (LDP / Metadb) or the newer in-app Lists/query features.
- **Not lightweight.** Even a test install runs dozens of services and needs ~24 GB RAM (Part 5). **[tested]**

## 1.4 Who builds and governs it

**[docs]**

- **Open Library Foundation (OLF):** the neutral non-profit that holds FOLIO's code and trademark.
- **Three elected councils** run the project:
  - **Community Council**: overall direction, membership, funding, governance model.
  - **Product Council**: which features get built; owns the product roadmap.
  - **Technical Council**: architecture, technical standards, code quality.
- Decisions are made by **"lazy consensus"** (borrowed from the Apache Foundation), with votes only when needed.
- **Special Interest Groups (SIGs)** of librarians define requirements per area (circulation, acquisitions, …).
- **Development** is funded by member libraries and vendors. **EBSCO** is the largest commercial backer and
  host; **Index Data** is a long-standing core developer and service provider; many libraries contribute
  developers too.

**Why it matters for us:** nobody "owns" FOLIO the way Ex Libris owns Alma. We can influence the roadmap
by joining SIGs or contributing code, but we cannot buy a feature or a deadline from the project itself.

## 1.5 Releases and support

**[docs]** Releases are named after flowers, alphabetically.

| Release | Code | Released | Supported until |
|---|---|---|---|
| **Trillium** | R1 2026 | 2026-06-08 | 2027-06-30 |
| Sunflower | R1 2025 | 2025-05-23 | 2026-06-30 (ended) |
| Ramsons, Quesnelia, Poppy, Orchid, … | older | — | out of support |

- Only supported releases get **Critical Service Patches (CSPs)**, including security fixes. After the end date,
  nothing, not even security fixes. All releases before Sunflower are explicitly "not for production".
- **Cadence:** older years had 2–3 releases a year. The last two named releases came one year apart
  (R1 2025 → R1 2026), each supported for about 13 months. Plan for **at least one major upgrade per year**.
  Sources disagree on the exact current cadence, so confirm it before committing.
- **Sunflower was the big architectural change:** the old gateway (**Okapi**) was replaced by **Eureka**
  (Kong + Keycloak + sidecars). Many online tutorials still describe Okapi, so check their date. **[docs]** **[tested]**
- The development version we used (demo + local install) is the **R1 2027 snapshot**, i.e. the release
  after Trillium. **[tested]**

## 1.6 Who uses it

**[docs]** Counts differ by source and definition. They are useful as orders of magnitude:

- **Library Technology Guides** (independent directory): **271 libraries, 467 facilities/branches**.
- **EBSCO** (its own hosted customers only): **300+ libraries in 26 countries**.
- **Notable adopters:** Library of Congress (its new collections platform is FOLIO-based, built with EBSCO),
  National Library of Sweden, Cornell, Stanford, Duke, Chicago, Texas A&M, many German university libraries
  (via the GBV/hebis consortia) and consortia such as Five Colleges.
- **Mostly academic and research libraries.** Public libraries are a newer target: in July 2026 Index Data
  and Spokane Public Library launched **PubLIB for FOLIO**, a consortium to make FOLIO fit public libraries.

## 1.7 How it is run — three options

| Option | Who does what | Fits when |
|---|---|---|
| **Vendor-hosted (SaaS)**, e.g. EBSCO FOLIO | Vendor hosts, upgrades, migrates data, supports; we configure and use it | We want FOLIO without running infrastructure |
| **Partner-supported self-hosting**, e.g. Index Data, BibLibre, PTFS Europe and other implementers | We own the servers; a partner helps with install, upgrades and fixes | We need control (data location, customisation) but lack FOLIO experience |
| **Fully self-hosted** | Everything is ours: Kubernetes, PostgreSQL, Kafka, OpenSearch, Keycloak, upgrades, security patches | We have a strong DevOps team and a reason to own it all |

**From our own install [tested]:** the official `eureka-cli` tool works, but even a reduced setup took
several attempts and local fixes (timeouts, memory, a broken sample-data load). It runs **~60 Java services**,
all built for Intel (amd64), so they are emulated on Apple Silicon. That is fine for learning, not a sign
of production effort. Production installs normally run on **Kubernetes** with managed databases.

### 1.7.1 Which modules are needed for FOLIO to work

FOLIO is delivered as **applications** (`app-*`), each a bundle of backend modules and UI modules that
declares which other applications it depends on. Only one is marked required; everything else is added as
needed. Source: `reference/module-inventory.md` **[docs]**.

| Layer | What it contains | Needed? |
|---|---|---|
| **Infrastructure** (not FOLIO modules) | PostgreSQL, Kafka, Vault, Kong (API gateway), Keycloak (login/roles), the Eureka managers (`mgr-applications`, `mgr-tenants`, `mgr-tenant-entitlements`) and a sidecar next to every module | Always |
| **`app-platform-minimal`** | Users, login, roles, locations and service points, settings, notes, tags, scheduler, plus the Stripes UI core (15 backend, 7 UI modules) | **Required.** On its own it gives a login and an empty system |
| **A usable library system** | `app-platform-complete` adds `app-inventory` (catalog), `app-search` (`mod-search`, needs OpenSearch), `app-marc-storage` (MARC records), `app-notification` (notices) and the circulation, fees/fines and patron modules | Needed for day-to-day circulation and cataloguing |
| **Optional applications** | Acquisitions, data import/export, ERM (agreements, licenses, eHoldings), OAI-PMH, bulk edit, and more | Only when the library needs that function |
| **Edge modules** | `edge-patron`, `edge-oai-pmh`, `edge-rtac`, `edge-users`: restricted APIs for public-facing sites | When an outside system (e.g. Drupal) connects |

**What we run locally [tested]:** the `combined` profile **without acquisitions**, deployed with `-q`
(no OpenSearch, Garage or FTP). Because `mod-search` needs OpenSearch, the local Inventory search does not
work; the demo server has it.

**For the Drupal use case:** the extras that matter are `mod-search` (catalog search), `mod-patron` or
`edge-patron` (patron account), `edge-oai-pmh` (catalog feed) and `edge-rtac` (availability). See Part 7.

## 1.8 What it costs

There is **no licence fee**. The cost is in running, implementing and supporting it. Vendor prices are
not public, so this lists the cost drivers rather than numbers. **[docs]**

| Cost driver | Notes |
|---|---|
| Hosting / infrastructure | Vendor subscription, or own cloud: Kubernetes cluster, PostgreSQL, Kafka, OpenSearch, storage, backups |
| Implementation | Requirements, configuration (locations, loan rules, roles), data migration from the old system |
| Data migration | Usually the largest one-off effort: bibliographic (MARC), items, patrons, open loans, fines, orders |
| Upgrades | At least one major release a year; test, migrate, retrain |
| Staff skills | Java/Spring, React, PostgreSQL, Kafka, Kubernetes, Keycloak (self-hosted); FOLIO configuration (all options) |
| Discovery layer | Separate product or a custom build (e.g. Drupal) |
| Community participation | Optional membership/contribution; buys influence, not features |

## 1.9 Strengths and weaknesses

| Strengths | Weaknesses |
|---|---|
| Open source, no licence fee, no vendor lock-in for the software itself | Complex to run: ~100 services and several infrastructure components |
| **Open, documented REST API for everything**: the UI uses the same API we can use (we built a Drupal integration on it **[tested]**) | Steep learning curve; documentation is spread across docs, wiki and GitHub, and partly outdated (Okapi era) |
| Modular: install only the apps you need; add your own modules | Yearly major upgrades are mandatory to stay supported |
| Multi-tenant: one install can serve several libraries | Strongest for academic libraries; public-library features are still maturing |
| Active community, large institutions behind it (LoC, national libraries, EBSCO) | Roadmap is set by the community, so we can't force priorities |
| Modern stack: Java/Spring, React, PostgreSQL, Kafka, Keycloak | Resource-hungry (RAM, CPU); performance needs tuning (Part 5) |

## 1.10 Where FOLIO fits for us

- **If we run or support libraries:** FOLIO is a serious open-source alternative to commercial platforms
  (Alma, WorldShare, Sierra). Vendor hosting removes most of the operational risk.
- **As a web/Drupal company:** the most direct opportunity is the **public side**: a Drupal-based catalogue,
  patron account and library website on top of FOLIO's API. FOLIO itself does not provide this, and we
  found **no existing Drupal–FOLIO integration**. **[tested]**
- **Custom development:** FOLIO allows custom backend modules and UI apps (Part 4), so features can be added
  without forking the core.

## 1.11 What we have done so far **[tested]**

- Used the staff UI: Inventory, Users, Check out / Check in, Requests.
- Called the API ourselves: login and tokens, catalogue search (CQL), creating titles/holdings/items,
  full loan cycle (check out → renew → check in), holds.
- Installed FOLIO locally (Eureka platform) and documented the problems we hit and how we fixed them.
- Built a **Drupal 11 prototype module**: catalogue search with availability and filters, and a patron
  "Library account" page (loans with renew buttons, holds, fines) through FOLIO's patron API.

## Sources

- FOLIO release & support table: https://docs.folio.org/docs/about-folio/support/
- Sunflower release announcement (Eureka): https://folio.org/?p=3301
- Governance: https://folio.org/?p=28 · https://folio-org.atlassian.net/wiki/spaces/COMMUNITY/pages/4231779
- Okapi → Eureka: https://folio-org.atlassian.net/wiki/spaces/FOLIJET/pages/757792931/Overview+of+Okapi+vs+Eureka
- Adoption: https://librarytechnology.org/product/folio ·
  https://about.ebsco.com/news-center/press-releases/300-libraries-one-vision-ebsco-folio-unites-global-library-community ·
  https://librarytechnology.org/pr/29785
- EBSCO FOLIO services: https://about.ebsco.com/academic-libraries/products/ebsco-folio/services.md
- Module/application counts: Appendix A (`reference/module-inventory.md`), platform `R1-2027-SNAPSHOT`
