# 3.8 Integrations & edge APIs

> Applications: **app-edge-complete**, **app-rtac**, **app-oai-pmh**, plus `mod-ncip` and `mod-graphql`
> (platform-complete).

## What this area does

The **doors to the outside world**: standard library protocols (SIP2, NCIP, OAI-PMH, Z39.50 via Connexion),
discovery integrations (real-time availability, patron services), automated storage machines, and alternative
API styles (GraphQL).

**Edge modules** share a pattern (see Part 2.10): no FOLIO login for the caller, an **API key** that encodes
tenant + a system user, secrets in Vault/AWS SSM, a narrow set of endpoints. **[docs]**

## Modules

| Module | Purpose | Tech | Mem |
|---|---|---|---|
| `edge-patron` | **Patron services for discovery/portals**: account, loans, holds, renew, fines, registration | Vert.x | 256 MB |
| `edge-rtac` + `mod-rtac` | **Real-time availability check**: holdings/items status for one or many instances | Spring / RMB | 256 + 341 MB |
| `edge-oai-pmh` + `mod-oai-pmh` | **OAI-PMH** harvesting endpoint: discovery services (EDS, Primo, VuFind, WorldCat) harvest the catalogue | RMB | 256 + 575 MB |
| `edge-sip2` | **SIP2** server for self-check machines and security gates (TCP socket protocol) | Vert.x | 256 MB |
| `edge-ncip` + `mod-ncip` | **NCIP** protocol for interlibrary loan systems (e.g. ReShare, ILLiad) | Vert.x / Vert.x | 341 + 341 MB |
| `edge-connexion` | Receives records from OCLC **Connexion** client directly into FOLIO | Vert.x | 34 MB |
| `edge-courses` | Public course-reserve information (e.g. for course websites) | Spring | 256 MB |
| `edge-erm` | Licence terms for e-resources (for discovery/link resolvers) | Spring | 256 MB |
| `edge-dematic` | Dematic automated storage/retrieval system | Spring | 256 MB |
| `edge-caiasoft` | CaiaSoft automated storage system | Spring | 256 MB |
| `mod-graphql` | GraphQL layer over FOLIO REST APIs (Node.js) | Node.js | 384 MB |

(Other edge modules are listed with their area: `edge-users` 3.1, `edge-inventory` 3.2, `edge-orders` 3.4,
`edge-fqm` 3.6, `edge-dcb` / `edge-inn-reach` 3.7.) In total FOLIO has **16 edge modules**. **[tested]**

## Deep dives

### edge-patron
- Wraps `mod-patron` (3.3) for public sites: `GET /patron/account/{externalSystemId}?apikey=…`, renew,
  place/cancel hold, patron registration. Patrons are identified by **external system ID**, which the portal
  must know.
- **The recommended production path for Drupal's "My account"**, instead of a service account on the full API.

### RTAC
- `GET /rtac/{instanceId}` or `POST /rtac-batch` → per item: location, call number, status, due date,
  volume. Built for discovery result lists, so it is cheaper than loading full holdings/items. **[docs]**
- **Relevance:** live availability badges in Drupal search results (our prototype currently uses
  `expandAll=true` on mod-search **[tested]**; RTAC is the lighter alternative).

### OAI-PMH
- Standard harvesting protocol (`/oai/records?verb=ListRecords&metadataPrefix=marc21_withholdings`).
  Sets, suppression filtering, deleted-record support. Lets a **separate discovery index** (including a
  Drupal Search API/Solr index) **harvest the whole catalogue** instead of querying live.

### SIP2 / NCIP
- SIP2 = self-check kiosks, RFID gates, sorting machines. NCIP = ILL and resource-sharing systems. Both are
  mature standards that vendors' hardware/software already speak.

### mod-graphql
- Lets clients query several REST resources in one GraphQL request (schema generated from RAML/JSON
  schemas). Not widely used by the core UI; can simplify portal front ends. Check coverage before
  relying on it.

## Keep in mind
- **API keys are credentials.** Rotate them, keep them out of front-end code, and restrict which tenant/user they map to.
- **Edge modules must be reachable from outside;** the rest of FOLIO should not be. Put edge modules behind
  their own ingress/WAF.
- **Live API vs. harvesting:** for big catalogues, harvesting (OAI-PMH or export) into a search index
  scales better than live queries per page view (Part 5).

## Feature ideas
- Drupal: switch prototype calls to **edge-patron + edge-rtac** for production security.
- Drupal Search API + Solr index fed by OAI-PMH for fast, fully custom discovery.
- Self-check web kiosk using the circulation API.

## Drupal relevance
Very high. Edge APIs are designed exactly for portals like Drupal.
