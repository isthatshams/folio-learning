# 3.3 Circulation — loans, requests, fines, patrons

> Applications: **app-platform-complete** (circulation modules), **app-reading-room**,
> **app-requests-mediated**, **app-requests-mediated-ui**.

## What this area does

Everything that happens at the desk and in the patron's account: **check out, renew, check in**, **requests**
(hold, recall, page), **due dates and loan rules**, **fines and fees**, **patron blocks**, notices, opening
hours, course reserves, reading rooms and remote storage.

The central concept is **circulation rules**: a small rule language that picks the policies for every
transaction from **patron group + item material type + loan type + location**. **[tested]**

```
fallback-policy: l one-hour r hold-only n notice-default o overdue-default i lost-default
m book + g undergrad : l two-weeks r allow-all n …
```
Each rule picks a **loan policy** (l), **request policy** (r), **notice policy** (n),
**overdue fine policy** (o) and **lost item policy** (i).

```
Check out:  item barcode + patron barcode + service point
  → mod-circulation: patron blocks? item available? requests in queue? → rules → loan policy → due date
  → loan saved (circulation-storage) → item status "Checked out" (inventory-storage) → notice (template)
Check in:   → loan closed → open request? → "Awaiting pickup" at pickup desk, else "Available" or "In transit"
```
**[tested]** in Lessons 4 and 6.

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-circulation` | Business logic: check out/in, renew, requests, queue, due-date changes, lost/claimed returned, slips, anonymisation | RMB | 59 | 1024 MB | ✓ |
| `mod-circulation-storage` | Stores loans, requests, **circulation rules**, loan/request policies, fixed due-date schedules, staff slips, cancellation reasons, settings | RMB | 98 | 512 MB | ✓ |
| `mod-feesfines` | Fee/fine types, owners, accounts, payments, waives, refunds, transfers, overdue & lost-item fine policies, reports | RMB | 94 | 341 MB | ✓ |
| `mod-patron` | **Patron-facing API**: account summary (loans, holds, charges), renew, place/cancel holds, self-registration | RMB | 20 | 341 MB | |
| `mod-patron-blocks` | Automated blocks (max loans, max fines, overdue limits) per patron group; user summary | RMB | 13 | 341 MB | ✓ |
| `mod-calendar` | Service-point opening hours and exceptions (used for due-date calculation) | Spring | 8 | 490 MB | |
| `mod-courses` | Course reserves: courses, terms, instructors, reserved items | RMB | 60 | 341 MB | |
| `mod-remote-storage` | Integration with automated storage (Dematic, CaiaSoft): accessions, retrievals, returns | Spring | 26 | 679 MB | ✓ |
| `mod-reading-room` | Reading rooms and patron access permissions + access log | Spring | 8 | 341 MB | |
| `mod-requests-mediated` | Requests that staff must approve before they become real requests | Spring | 19 | 1024 MB | ✓ |

UI modules: Check out, Check in, Requests, Circulation log, Calendar, Courses, Service points, Remote storage,
Reading room, Mediated requests, plus Settings → Circulation.

## Deep dives

### mod-circulation
- **Key APIs [tested]:** `POST /circulation/check-out-by-barcode`, `/renew-by-barcode`,
  `/check-in-by-barcode`, `GET /circulation/loans`, `POST /circulation/requests`,
  `GET /circulation/requests/allowed-service-points`. Also `check-out-by-barcode-dry-run`,
  `/circulation/loans/{id}/change-due-date`, `/declare-item-lost`, `/claim-item-returned`, request
  queue reordering, `/circulation/requests/{id}/move`, pick slips, search slips, hold-shelf clearance report.
- **Circulation rules:** `GET/PUT /circulation/rules` (text), plus helpers that tell you which policy
  applies for a given combination (`/circulation/rules/loan-policy?...`).
- **Dependencies:** users, inventory-storage, circulation-storage, feesfines, patron-blocks, calendar,
  template engine/notices, pubsub. A single check-out touches ~10 modules, so it is latency-sensitive.
- **Gotchas [tested]:** every operation needs a service point; renewals count from *now*; renewal is blocked
  when another patron has a hold (policy-dependent); check-in with an open hold → *Awaiting pickup*, not
  *Available*; future `checkInDate` is accepted, so integrations must send the real time.
- **Configuration (no code):** loan policies (period, renewals, grace period, recalls), request policies
  (which request types allowed), notice policies + templates, overdue/lost fine policies, fixed due-date
  schedules (e.g. "end of semester"), hold shelf expiry, staff slips, "request for title" (TLR) on/off.

### mod-patron (the API for public sites)
- **Key APIs [tested]:** `GET /patron/account/{userId}?includeLoans=true&includeHolds=true&includeCharges=true`,
  `POST /patron/account/{id}/item/{itemId}/renew`, `POST /patron/account/{id}/item/{itemId}/hold`,
  `POST /patron/account/{id}/instance/{instanceId}/hold` (title-level), `.../hold/{requestId}/cancel`
  (needs the full hold object), `/patron` (self-registration).
- **Exposed via `edge-patron`** for public sites with an API key.
- **Relevance:** the basis of our Drupal "Library account" tab **[tested]**.

### mod-feesfines
- **Model:** *owners* (who collects money, per service point) → *fee/fine types* → *accounts* (one charge)
  → *actions* (paid, waived, refunded, transferred, cancelled).
- **Automatic charges** come from overdue and lost-item policies (via timers and check-in).
- **Integration:** "bursar export" (`plugin-bursar-export`) sends charges to a finance/student system.
- **Relevance:** Drupal could show and (with a payment provider) let patrons **pay fines online**, posting
  `POST /accounts/{id}/pay`. This needs care with money and audit (Part 6).

### mod-patron-blocks
- Automated blocks from limits per patron group (max items out, max outstanding fees, max overdue items,
  recall overdue days). Manual blocks live in `mod-feesfines` (`/manualblocks`). Check-out, renewals and
  requests consult both.

### Small modules
- **mod-calendar:** opening hours per service point. Due dates falling on closed days move according to the
  loan policy. Useful for a Drupal "opening hours" block.
- **mod-courses:** course reserves (items placed on short loan for a course).
- **mod-remote-storage:** connects locations to robotic storage; retrieval requests sent to the provider.
- **mod-reading-room:** controls who may access special reading rooms, logs access.
- **mod-requests-mediated:** staff-mediated requests (e.g. special collections) with confirm/arrival workflow.

## Keep in mind
- **Model policies before go-live**: rules × policies × patron groups explode quickly. Test them with
  dry-run checkout and the "rule tester" in Settings.
- **Notices** (email) need `mod-email` with SMTP configured (3.9) and templates per notice type.
- **Anonymisation** settings (when loans are anonymised) are a privacy decision.
- **Time zone and opening hours** affect due dates; configure the tenant locale and calendar correctly.

## Feature ideas
- Drupal: patron account (done), **place a hold from the search results**, cancel holds, pay fines online,
  "due soon" emails via Drupal, opening hours block.
- Self-check-out kiosk on SIP2 (`edge-sip2`) or a web kiosk on the circulation API.
- Dashboard of overdue items per library (FQM lists 3.6, or reporting).

## Drupal relevance
Very high for the patron side: `mod-patron` (account, renew, holds), `mod-calendar` (hours),
`mod-feesfines` (charges). **[tested]**
