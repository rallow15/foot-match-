# Load tests — Matchs Amicaux

This folder contains realistic [k6](https://k6.io) load tests for the public,
read-only parts of `https://foot-match-theta.vercel.app`.

**Safety rules**

- Only `GET` requests on public pages are exercised.
- No login, no registration, no contact form submission, no writes.
- No RLS bypass, no Supabase Storage abuse, no BAN API hammering.
- IDs for detail pages are extracted dynamically from the live `/annonces` list.

## Files

| File | Purpose |
| --- | --- |
| `common.js` | Shared helpers, realistic filter values, URL builders, ID extractors, metrics. |
| `report.js` | Custom `handleSummary` that writes `load-test-report.json` + `load-test-report.md`. |
| `main-scenario.js` | **First test** — 20 VUs → 50 VUs → 100 VUs → ramp down. |
| `scenarios/scenario-100vu.js` | 100 VUs steady-state (run manually after main test). |
| `scenarios/scenario-250vu.js` | 250 VUs (ready but **not launched automatically**). |
| `scenarios/scenario-500vu.js` | 500 VUs (ready but **not launched automatically**). |
| `scenarios/scenario-1000vu.js` | 1 000 VUs (ready but **not launched automatically**). |

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows (winget)
winget install k6

# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1E69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Smoke test (recommended before the main scenario)

```bash
cd load-test
k6 run --env BASE_URL=https://foot-match-theta.vercel.app smoke-test.js
```

This runs a single iteration and verifies that annonce/club IDs can be extracted
and that all endpoints return 200.

## Run the first test (main scenario)

```bash
cd load-test
k6 run --env BASE_URL=https://foot-match-theta.vercel.app main-scenario.js
```

To run against a local/Preview URL instead:

```bash
k6 run --env BASE_URL=https://foot-match-theta-git-xxx.vercel.app main-scenario.js
```

Optional environment variables:

- `BASE_URL` — target host (default: `https://foot-match-theta.vercel.app`).
- `SLEEP_MIN` — minimum think time between requests in seconds (default `0.5`).
- `SLEEP_MAX` — maximum think time between requests in seconds (default `2`).

Example with faster pacing:

```bash
k6 run --env BASE_URL=https://foot-match-theta.vercel.app --env SLEEP_MIN=0.2 --env SLEEP_MAX=0.8 main-scenario.js
```

## Run higher-load scenarios manually

After the main scenario is green and you have verified Supabase/Vercel metrics,
run the bigger scenarios one by one. They are **not executed automatically**.

```bash
cd load-test

# 100 VUs
k6 run --env BASE_URL=https://foot-match-theta.vercel.app scenarios/scenario-100vu.js

# 250 VUs
k6 run --env BASE_URL=https://foot-match-theta.vercel.app scenarios/scenario-250vu.js

# 500 VUs
k6 run --env BASE_URL=https://foot-match-theta.vercel.app scenarios/scenario-500vu.js

# 1 000 VUs
k6 run --env BASE_URL=https://foot-match-theta.vercel.app scenarios/scenario-1000vu.js
```

## Output

k6 prints a terminal summary. Two report files are also created in the
`load-test/` directory:

- `load-test-report.json` — raw metrics for further analysis.
- `load-test-report.md` — human-readable report with p50/p95/p99 per endpoint.

## What the tests cover

User journey exercised by each virtual user:

1. `GET /` — landing page.
2. `GET /annonces` — match list.
3. `GET /annonces?categorie=...&niveau=...&ligue=...&district=...&dom=...` — filtered search.
4. `GET /annonces?ville=...&latitude=...&longitude=...&rayon=...` — geo search.
5. `GET /annonces/{id}` — match detail.
6. Back to list with another filter.
7. `GET /matchs-confirmees?ligue=...&district=...` — confirmed matches.
8. `GET /clubs/{id}` — club profile.
9. A couple more searches.

## Metrics exposed

- `http_req_duration` — built-in, includes p50/p95/p99.
- `http_req_failed` — built-in error rate.
- `http_reqs` — built-in requests/second.
- `loadtest_endpoint_duration` — custom trend tagged by endpoint name.
- `loadtest_errors` — custom counter tagged by endpoint and status.

## Performance findings from code review

1. **Layout is dynamic everywhere.** `src/app/layout.tsx` calls `getCurrentClub()` on every request, so every public page hits the `Session` + `Club` tables even for anonymous users.
2. **Detail/profile pages are force-dynamic.** `/annonces/{id}` and `/clubs/{id}` bypass ISR (`export const dynamic = "force-dynamic"`), so every hit reaches Supabase.
3. **Geo filter is in-memory.** `/annonces?rayon=...` fetches every open future `Annonce` row with full joins, then computes haversine in JS. As the table grows, this becomes the dominant slow path.
4. **Rate-limit writes on POST.** Not exercised here, but login/register/contact trigger `RateLimit` upserts, which can become a write hotspot under heavy POST load.
5. **Prisma connection limit.** `src/lib/db.ts` adds `connection_limit=9` by default; verify it matches your Supabase compute plan under 1 000 VUs.

## Dashboards to watch during tests

- Vercel → Project → Monitoring → Functions → Errors / Duration.
- Supabase → Database → Connection pool / CPU / Slowest queries.
- Supabase → Storage → Request count (for `/api/uploads/*` traffic, not directly tested here).
