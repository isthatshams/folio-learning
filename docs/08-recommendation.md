# Part 8 — Recommendation & roadmap

> **Draft for discussion.** Recommendations depend on business goals that management still needs to set.
> Assumptions are stated so they can be corrected.

## 8.1 Summary of findings

1. **FOLIO is a mature, actively developed open-source LSP** (Trillium R1 2026 current; 271+ libraries;
   Library of Congress, national and large university libraries), governed by a community, with no licence fee.
2. **It is big:** 39 applications, 101 backend modules, 76 UI modules, ~70 GB default module memory.
   Self-hosting needs serious DevOps capacity. Vendor/partner hosting is the norm.
3. **Everything is reachable through a consistent REST API**, and the platform is **designed for
   extension**: configuration, external integrations, custom UI apps and custom backend modules are all
   supported, with local tooling for module development.
4. **FOLIO has no public-facing website or catalogue.** That gap matches our Drupal expertise, and we found no
   existing Drupal–FOLIO integration. Our prototype shows it is feasible and quick to build.
5. **Main risks:** operational complexity, data migration, yearly upgrades. They are manageable with hosting
   partners and by keeping our work at extension levels 0–4.

## 8.2 Recommendation

**Assumption:** we are a web/Drupal company exploring FOLIO as a business opportunity, not a library replacing its own system.

1. **Do not self-host FOLIO in production** at this stage. For customer projects, partner with a FOLIO
   hosting provider and focus on what we're good at.
2. **Invest in the Drupal–FOLIO integration** as our differentiator: turn the prototype into a production-grade,
   reusable module (edge APIs, SSO, holds, availability, Solr option).
3. **Build one custom FOLIO module + UI app** (`mod-hello` → a real small feature) to prove and document
   our ability to extend FOLIO itself.
4. **Engage with the community:** follow the release notes and relevant SIGs, and consider contributing the Drupal module.

## 8.3 Roadmap

| Phase | Duration (estimate) | Deliverables |
|---|---|---|
| **0. Evaluation** (done) | — | This document; demo/local experience; Drupal prototype |
| **1. Proofs** | 2–4 weeks | `mod-hello` + `ui-hello` on local Eureka; Drupal: hold placement, edge-patron/RTAC, Keycloak SSO |
| **2. Product** | 1–3 months | Production-quality Drupal module (tests, config, theming, docs), optional Solr discovery; demo site |
| **3. Market** | ongoing | Partner talks (hosting providers), first pilot customer, community presence |
| **Decision points** | after 1 and 2 | Continue? Which customers? Build vs. partner for hosting? |

## 8.4 Open questions for management

- Is the goal **customer projects**, an **internal system**, or **becoming a FOLIO partner**?
- Target customer type: academic, public, special libraries?
- Budget/time for Phase 1–2?
- Appetite for open-sourcing the Drupal module?
