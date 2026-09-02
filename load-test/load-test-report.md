# Load Test Report - 2026-08-25T09:47:59.354Z

## Overall

| Metric | Value |
| --- | --- |
| Total requests | 346899 |
| Failed requests | 0 (0.00%) |
| RPS (avg) | 381.06 |
| p50 duration | 156 ms |
| p95 duration | 662 ms |
| p99 duration | 1030 ms |
| Avg duration | 239 ms |
| Max duration | 3795 ms |

## Slowest endpoints (by p95)

| Endpoint | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| loadtest_endpoint_duration | 241 | 157 | 664 | 1032 | 3795 |

## Thresholds

_No thresholds configured._

## What to watch for

- p95 above 2 s on cached pages (/annonces, /, /matchs-confirmees): suggests the Next.js ISR cache or Supabase connection pool is saturated.
- p95 above 5 s on dynamic pages (/annonces/{id}, /clubs/{id}): each hit is a fresh DB lookup through the layout, possible Prisma/Postgres bottleneck.
- Failed rate above 2%: check Vercel function timeouts, Supabase connection limits, or rate-limiting hits.
- RPS flatlines while VUs increase: indicates queueing / back-pressure.
- Many 500s on /annonces: the geo filter fetches every open row then computes haversine in JS; large result sets may OOM or timeout.

## Notes

- This test only exercises public GET endpoints to avoid writes, auth, RLS bypass, and email sending.
- Supabase Storage (logos/licences) and BAN API (adresse.data.gouv.fr) are used indirectly by the production pages but not directly hammered here.
