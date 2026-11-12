# 3.9 Shared services — notifications, email, templates, events

> Applications: **app-notification**, plus `mod-pubsub` (platform-complete).

## What this area does

Services that other modules use rather than staff using them directly: **patron notices** (due-date
reminders, hold available, overdue, fines), email delivery, document **templates**, batch printing, in-app
notifications, and the legacy **event bus** (pubsub).

```
mod-circulation ──(notice policy says: send "hold available")──▶ mod-notify /patron-notice
     ──▶ mod-template-engine (fill template with loan/item/user tokens, HTML/text)
     ──▶ mod-sender (choose channel) ──▶ mod-email (SMTP) ──▶ patron's inbox
                                      └▶ mod-batch-print (printed mail for patrons without email)
```

## Modules

| Module | Purpose | Tech | EP | Mem |
|---|---|---|---|---|
| `mod-notify` | Notifications to users + **patron notices** entry point | RMB | 9 | 341 MB |
| `mod-template-engine` | Stores templates; renders them with data tokens (`{{item.title}}`) to HTML/text | RMB | 7 | 341 MB |
| `mod-sender` | Delivers a message through the configured channel | RMB | 1 | 512 MB |
| `mod-email` | Sends email via **SMTP**, delayed/failed queue, SMTP configuration | RMB | 13 | 341 MB |
| `mod-event-config` | Event → template configuration (e.g. password-reset email) | RMB | 5 | 341 MB |
| `mod-batch-print` | Collects notices for **printing** (patrons without email) and emails the PDF batch | Vert.x | 7 | 2048 MB |
| `mod-pubsub` | Legacy event bus: modules declare publishers/subscribers; HTTP in, Kafka underneath | RMB | 15 | 1024 MB |

## Deep dives

### Notices pipeline
- **Configuration (no code):** Settings → Circulation → *Patron notice templates* (HTML with tokens) and
  *Patron notice policies* (which template, when: before/on/after due date, recurring). Settings → Tenant
  for SMTP (`/smtp-configuration`).
- **Gotchas:** without SMTP configured, notices are silently queued/failed. Check `mod-email` logs. Test
  with a real mailbox before go-live.
- **Relevance:** Drupal could take over patron communication (its own mail templates/branding) by reading
  FOLIO data, but then FOLIO notices should be switched off to avoid duplicates.

### mod-pubsub
- Older event mechanism still used by circulation (e.g. loan events → patron blocks, fees). Newer modules
  use Kafka directly. It has its own DB lock/migration quirks (we hit a stale Liquibase lock locally **[tested]**).

## Keep in mind
- Email deliverability (SPF/DKIM for the sending domain) is an infrastructure task.
- Notices are part of the patron experience; branding and wording need library staff input.

## Feature ideas
- SMS notices via a custom `mod-sender` channel or an external service subscribing to events.
- Branded HTML notice templates matching the Drupal site.

## Drupal relevance
Low-medium: consistent branding of notices; optionally Drupal-driven notifications.
