# Learning FOLIO

Notes and small scripts I wrote while learning [FOLIO](https://www.folio.org/), the open-source
Library Services Platform. I'm working toward a Drupal integration.

- `CLAUDE.md`: what I've learned so far, my progress, and gotchas
- `learn/folio.sh`: tiny helper that logs in to the FOLIO API and calls it (`./folio.sh GET '/users?limit=1'`)
- `learn/*.json`: request bodies used in the lessons

The examples target the public FOLIO demo server (tenant `diku`, demo login `diku_admin` / `admin`).
To run FOLIO locally, use [folio-org/eureka-setup](https://github.com/folio-org/eureka-setup).
