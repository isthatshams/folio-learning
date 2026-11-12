# 3.4 Acquisitions — orders, receiving, invoices, finance, vendors

> Applications: **app-acquisitions**, **app-gobi**, **app-ebsconet**, **app-mosaic**.
> Not installed on our local machine (removed to save ~5.4 GB RAM **[tested]**); available on the demo.

## What this area does

The library's **purchasing and money** side: vendors (organizations), budgets (finance), purchase orders,
receiving what arrives, paying invoices, and the yearly **fiscal-year rollover**.

```
Organizations (vendors) ─┐
Finance: Fiscal year → Ledger → Fund → Budget (allocations, encumbrances, expenditures)
                         │
Order (PO) → PO lines (title, cost, fund distribution, location)
   │ open order: encumber funds, create Inventory instance/holdings/items (optional), expected pieces
   ▼
Receiving: check in pieces → items become "In process"/available
   ▼
Invoice → invoice lines linked to PO lines → approve → voucher → pay (expenditure) → export to ERP
```

## Modules

| Module | Purpose | Tech | EP | Mem | Kafka |
|---|---|---|---|---|---|
| `mod-orders` | Business logic: composite orders, PO lines, open/close, **receiving** (pieces), claims, templates, rollover | RMB | 83 | 1024 MB | ✓ |
| `mod-orders-storage` | Stores POs, lines, pieces, titles, templates, receiving history | RMB | 102 | 341 MB | ✓ |
| `mod-finance` | Business logic: funds, budgets, ledgers, fiscal years, transactions, **ledger rollover** | RMB | 79 | 512 MB | |
| `mod-finance-storage` | Stores all finance records and the transaction ledger | RMB | 91 | 341 MB | ✓ |
| `mod-invoice` | Business logic: invoices, lines, approval, vouchers, batch voucher export | RMB | 47 | 800 MB | ✓ |
| `mod-invoice-storage` | Stores invoices, lines, vouchers, batch groups | RMB | 61 | 341 MB | ✓ |
| `mod-organizations` | Business logic for vendors, incl. banking information | RMB | 10 | 341 MB | |
| `mod-organizations-storage` | Stores organizations, contacts, interfaces (vendor portals), categories | RMB | 49 | 341 MB | ✓ |
| `edge-orders` | Edge API for vendor systems to place orders | Vert.x | — | 256 MB | |
| `mod-gobi` | **GOBI** (book vendor) integration: receives orders from GOBI, maps them to FOLIO POs | RMB | 11 | 341 MB | |
| `mod-ebsconet` | **EBSCONET** (subscription vendor) integration: read/update order lines | Spring | 3 | 341 MB | |
| `mod-mosaic` | **Mosaic** (vendor platform) integration: create orders from Mosaic | Spring | 5 | 479 MB | |

UI modules: Orders, Receiving, Invoices, Finance, Organizations, Claims, Acquisition units, Settings, plus
find-organization / find-contact / find-fund / find-po-line plugins, GOBI and Mosaic settings.

## Deep dives

### mod-orders (+ storage)
- **Data:** purchase orders (one-time / ongoing), PO lines (format, cost, quantity, fund distribution,
  locations, vendor reference), pieces (expected issues/copies), titles (for receiving), order templates.
- **Key APIs:** `POST /orders/composite-orders` (PO with lines), `/orders/order-lines`,
  `POST /orders/check-in`, `/orders/receive`, `/orders/pieces`, `/orders/pieces-batch`, `/orders/titles`,
  `/orders/order-templates`.
- **Side effects of opening an order:** encumbrances in Finance, optional creation of Inventory records,
  expected pieces in Receiving. That is why writes must go through `mod-orders`, not storage.
- **Acquisition units** restrict which staff can see/edit which orders, invoices and funds (e.g. per library).

### mod-finance (+ storage)
- **Hierarchy:** Fiscal year → Ledger → Fund (with fund types, groups, expense classes) → Budget per FY.
- **Transactions:** allocation, transfer, encumbrance, pending payment, payment, credit. All are records,
  so budgets are always auditable.
- **Rollover** (`/finance/ledger-rollovers`) closes a fiscal year and carries budgets and encumbrances into
  the next. It is a critical yearly job with a test-run mode.

### mod-invoice (+ storage)
- Invoices with lines tied to PO lines; approval creates **vouchers**; batch voucher export sends payments
  to the institution's ERP/accounting (JSON/XML via FTP/SFTP or API).

### Vendor integrations
- **GOBI, EBSCONET, Mosaic** connect FOLIO to specific vendors. **edge-orders** is the generic door for
  vendors to push orders. HARRASSOWITZ announced FOLIO ordering APIs in 2026 **[docs]**.
- **EDIFACT** ordering/invoicing is handled through data export (orders) and data import (invoices) (3.6).

## Keep in mind
- **Finance setup is accounting work.** Involve the finance department; mistakes show up at rollover.
- **Acquisitions is the heaviest optional app** (9 modules, ~5.4 GB in our setup) and depends on
  Inventory and platform-complete.
- **Integration with the company ERP** (SAP, Oracle, etc.) happens via voucher export, not by real-time API.

## Feature ideas
- **"Suggest a purchase"** form in Drupal → creates a pending PO line (or a request in a review queue).
- Budget dashboards (spent vs. allocated per fund) from finance APIs or reporting.
- ERP connector: pick up batch vouchers and post them into the accounting system.

## Drupal relevance
Low to medium: purchase suggestions, "new arrivals" (from received pieces), transparency pages.
