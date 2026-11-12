# <module name> (`mod-xxx`)

> One-line purpose in plain language.

| | |
|---|---|
| Application | app-xxx |
| Repo | https://github.com/folio-org/mod-xxx |
| Tech | Spring Way (folio-spring-base) / RMB (Vert.x) / other |
| UI counterpart | `ui-xxx` (`folio_xxx`) |
| Edge API | `edge-xxx` (if any) |

## What it does
Business purpose, which library staff use it, typical workflows.

## Data it owns
Main record types, storage (Postgres schema `<tenant>_mod_xxx`), relationships to other modules' records.

## Key APIs
| Method | Path | Purpose |
|---|---|---|

## Events (Kafka / pubsub)
Publishes: … · Consumes: …

## Dependencies
Requires interfaces: … · Optional: … · Who depends on it: …

## Configuration & extension points
Settings (UI / API), custom fields, circulation rules, templates, hooks, what can be changed without code.

## Performance notes
Default memory, DB pool size, heavy endpoints, indexes, caching, scaling behaviour.

## Gotchas
Things we hit or that docs warn about. **[tested]** / **[docs]**

## Relevance for us / Drupal
Would we use it? Could Drupal call it? Feature ideas.
