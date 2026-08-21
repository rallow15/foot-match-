// Custom k6 summary handler.
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

export function handleSummary(data) {
  const now = new Date().toISOString();
  const jsonSummary = JSON.stringify(data, null, 2);

  const endpointTrends = [];
  for (const [key, value] of Object.entries(data.metrics)) {
    if (key.startsWith("loadtest_endpoint_duration") && value.values) {
      endpointTrends.push({
        key: key,
        p50: value.values["p(50)"] || 0,
        p95: value.values["p(95)"] || 0,
        p99: value.values["p(99)"] || 0,
        avg: value.values.avg || 0,
        max: value.values.max || 0,
      });
    }
  }

  endpointTrends.sort(function (a, b) { return b.p95 - a.p95; });

  const rows = endpointTrends
    .map(function (e) {
      const name = e.key.replace("loadtest_endpoint_duration{endpoint:", "").replace("}", "");
      return "| " + name + " | " + Math.round(e.avg) + " | " + Math.round(e.p50) + " | " + Math.round(e.p95) + " | " + Math.round(e.p99) + " | " + Math.round(e.max) + " |";
    })
    .join("\n");

  const overall = data.metrics.http_req_duration && data.metrics.http_req_duration.values ? data.metrics.http_req_duration.values : {};
  const failed = data.metrics.http_req_failed && data.metrics.http_req_failed.values ? data.metrics.http_req_failed.values : {};
  const totalRequests = data.metrics.http_reqs && data.metrics.http_reqs.values ? data.metrics.http_reqs.values.count : 0;
  const failedRequests = failed.rate ? Math.round(failed.rate * totalRequests) : 0;
  const failedPercent = ((failed.rate || 0) * 100).toFixed(2);
  const rps = data.metrics.http_reqs && data.metrics.http_reqs.values ? data.metrics.http_reqs.values.rate : 0;

  const thresholdEntries = Object.entries(data.thresholds || {});
  const thresholdsText = thresholdEntries.length > 0
    ? thresholdEntries.map(function (entry) {
        const k = entry[0];
        const v = entry[1];
        return "- `" + k + "`: " + (v.ok ? "OK" : "FAILED") + " (" + v.value + ")";
      }).join("\n")
    : "_No thresholds configured._";

  const md = "# Load Test Report - " + now + "\n\n" +
    "## Overall\n\n" +
    "| Metric | Value |\n" +
    "| --- | --- |\n" +
    "| Total requests | " + totalRequests + " |\n" +
    "| Failed requests | " + failedRequests + " (" + failedPercent + "%) |\n" +
    "| RPS (avg) | " + rps.toFixed(2) + " |\n" +
    "| p50 duration | " + Math.round(overall["p(50)"] || 0) + " ms |\n" +
    "| p95 duration | " + Math.round(overall["p(95)"] || 0) + " ms |\n" +
    "| p99 duration | " + Math.round(overall["p(99)"] || 0) + " ms |\n" +
    "| Avg duration | " + Math.round(overall.avg || 0) + " ms |\n" +
    "| Max duration | " + Math.round(overall.max || 0) + " ms |\n\n" +
    "## Slowest endpoints (by p95)\n\n" +
    "| Endpoint | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |\n" +
    "| --- | --- | --- | --- | --- | --- |\n" +
    rows + "\n\n" +
    "## Thresholds\n\n" +
    thresholdsText + "\n\n" +
    "## What to watch for\n\n" +
    "- p95 above 2 s on cached pages (/annonces, /, /matchs-confirmees): suggests the Next.js ISR cache or Supabase connection pool is saturated.\n" +
    "- p95 above 5 s on dynamic pages (/annonces/{id}, /clubs/{id}): each hit is a fresh DB lookup through the layout, possible Prisma/Postgres bottleneck.\n" +
    "- Failed rate above 2%: check Vercel function timeouts, Supabase connection limits, or rate-limiting hits.\n" +
    "- RPS flatlines while VUs increase: indicates queueing / back-pressure.\n" +
    "- Many 500s on /annonces: the geo filter fetches every open row then computes haversine in JS; large result sets may OOM or timeout.\n\n" +
    "## Notes\n\n" +
    "- This test only exercises public GET endpoints to avoid writes, auth, RLS bypass, and email sending.\n" +
    "- Supabase Storage (logos/licences) and BAN API (adresse.data.gouv.fr) are used indirectly by the production pages but not directly hammered here.\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColor: true }),
    "load-test-report.json": jsonSummary,
    "load-test-report.md": md,
  };
}
