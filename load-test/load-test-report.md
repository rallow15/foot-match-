# Load Test Report - 2026-08-24T00:58:52.499Z

## Overall

| Metric | Value |
| --- | --- |
| Total requests | 16127 |
| Failed requests | 0 (0.00%) |
| RPS (avg) | 35.11 |
| p50 duration | 153 ms |
| p95 duration | 350 ms |
| p99 duration | 1672 ms |
| Avg duration | 221 ms |
| Max duration | 3173 ms |

## Slowest endpoints (by p95)

| Endpoint | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| loadtest_endpoint_duration | 221 | 153 | 350 | 1672 | 3173 |

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
