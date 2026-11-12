# FOLIO — Evaluation & Technical Guide

Master documentation for the company's FOLIO evaluation. Goes from a management overview
down to module-level technical detail. The slide deck is distilled from this **after** it is done.

**Audience:** Part 1 = management; Parts 2–8 = technical team.
**Basis:** FOLIO snapshot / Eureka platform (2026), hands-on on the public demo + a local install,
plus a Drupal proof of concept. Each claim is marked as **[tested]** (we did it) or **[docs]** (from
FOLIO documentation / community sources), so readers know what is verified.

## Outline & status

| # | Part | File | Status |
|---|------|------|--------|
| 1 | Overview — what FOLIO is, who runs it, apps, hosting, cost | `01-overview.md` | draft ✎ |
| 2 | Platform architecture — Eureka gateway, multi-tenancy, data stores, Stripes UI | `02-architecture.md` | draft ✎ |
| 3 | Applications & modules — deep dive per application (see below) | `03-modules/` | draft ✎ (9 chapters, all 101 modules) |
| 4 | Extending FOLIO — config → UI plugins → custom module → integrations | `04-extending.md` | draft ✎ |
| 5 | Performance & operations — sizing, tuning, scaling, monitoring | `05-performance.md` | draft ✎ |
| 6 | Considerations at every step — migration, upgrades, skills, security, risks | `06-considerations.md` | draft ✎ |
| 7 | Use cases, feature ideas & Drupal integration | `07-use-cases-drupal.md` | draft ✎ |
| 8 | Recommendation & roadmap | `08-recommendation.md` | draft ✎ (needs management input) |
| A | Module inventory (generated) | `reference/module-inventory.md` | ✓ generated |
| B | Glossary | `reference/glossary.md` | draft ✎ |

### Part 3 — one chapter per FOLIO application
FOLIO officially groups its ~100 modules into **applications** (Platform → Applications → Modules).
We follow the same grouping, so "every module" is covered without a chapter per module.
Each module inside a chapter uses [`_module-template.md`](_module-template.md).
The exact list of applications/modules comes from the generated inventory (Appendix A).

## How the inventory is generated
```bash
python3 docs/tools/module_inventory.py            # snapshot (what demo + local run)
python3 docs/tools/module_inventory.py --refresh  # re-download descriptors
```
Source: the FOLIO platform descriptor (`folio-org/platform-lsp`) → each application descriptor
from the FOLIO Application Registry (FAR) → each module's descriptor (APIs, permissions,
dependencies, default memory/env).

## Word document
All parts + a condensed Appendix A are combined into `FOLIO-Evaluation-Guide.docx`:
```bash
# one-time: npm install docx marked@12  (in any folder, then point NODE_PATH at its node_modules)
NODE_PATH=<folder>/node_modules node docs/tools/build_docx.js
```
Edit the Markdown, then rebuild; never edit the .docx by hand. Word asks to update fields on open → Yes (fills the TOC).
Next step after review: slide deck distilled from the document.
