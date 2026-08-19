"""Test de stress pour trouver le plafond d'utilisateurs simultanés."""
import asyncio
import random
import statistics
import time
from dataclasses import dataclass, field
from typing import Dict, List

import aiohttp

BASE_URL = "https://foot-match-git-main-rallow15s-projects.vercel.app"
SHARE_TOKEN = "Iuzdm7Y8PW4hLhNJcKndwxoObzMUP2dO"
ENDPOINTS = ["/", "/annonces", "/matchs-confirmees", "/login", "/comment-ca-marche", "/inscription"]
TIMEOUT_SECONDS = 15


@dataclass
class RunResult:
    concurrent: int
    total_requests: int
    successes: int = 0
    redirects: int = 0
    errors: int = 0
    timeouts: int = 0
    server_errors: int = 0
    latencies: List[float] = field(default_factory=list)
    endpoint_stats: Dict[str, Dict[str, int]] = field(default_factory=dict)

    @property
    def ok_rate(self) -> float:
        total = self.successes + self.redirects + self.errors
        if total == 0:
            return 0.0
        return (self.successes + self.redirects) / total * 100

    @property
    def p50(self) -> float:
        if not self.latencies:
            return 0.0
        return statistics.median(self.latencies)

    @property
    def p95(self) -> float:
        if not self.latencies:
            return 0.0
        return sorted(self.latencies)[int(len(self.latencies) * 0.95)]

    @property
    def p99(self) -> float:
        if not self.latencies:
            return 0.0
        return sorted(self.latencies)[int(len(self.latencies) * 0.99)]

    @property
    def avg(self) -> float:
        if not self.latencies:
            return 0.0
        return statistics.mean(self.latencies)


def make_url(endpoint: str) -> str:
    if not SHARE_TOKEN:
        return f"{BASE_URL}{endpoint}"
    sep = "&" if "?" in endpoint else "?"
    return f"{BASE_URL}{endpoint}{sep}_vercel_share={SHARE_TOKEN}"


async def fetch(session: aiohttp.ClientSession, endpoint: str, sem: asyncio.Semaphore) -> dict:
    url = make_url(endpoint)
    async with sem:
        start = time.perf_counter()
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT_SECONDS)) as resp:
                await resp.read()
                latency_ms = (time.perf_counter() - start) * 1000
                return {
                    "endpoint": endpoint,
                    "status": resp.status,
                    "latency_ms": latency_ms,
                    "error": None,
                }
        except asyncio.TimeoutError:
            return {
                "endpoint": endpoint,
                "status": 0,
                "latency_ms": (time.perf_counter() - start) * 1000,
                "error": "TIMEOUT",
            }
        except Exception as exc:
            return {
                "endpoint": endpoint,
                "status": 0,
                "latency_ms": (time.perf_counter() - start) * 1000,
                "error": type(exc).__name__,
            }


async def run_once(concurrent: int, total_requests: int) -> RunResult:
    sem = asyncio.Semaphore(concurrent)
    connector = aiohttp.TCPConnector(limit=concurrent * 2, limit_per_host=concurrent, enable_cleanup_closed=True)
    headers = {"Accept": "text/html", "User-Agent": "MatchsAmicaux-StressTest/1.0"}

    result = RunResult(concurrent=concurrent, total_requests=total_requests)
    for endpoint in ENDPOINTS:
        result.endpoint_stats[endpoint] = {"ok": 0, "error": 0, "timeout": 0}

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        tasks = []
        for _ in range(total_requests):
            endpoint = random.choice(ENDPOINTS)
            tasks.append(fetch(session, endpoint, sem))
        raw_results = await asyncio.gather(*tasks)

    for r in raw_results:
        status = r["status"]
        error = r["error"]
        endpoint = r["endpoint"]

        if error == "TIMEOUT":
            result.timeouts += 1
            result.errors += 1
            result.endpoint_stats[endpoint]["timeout"] += 1
        elif error:
            result.errors += 1
            result.endpoint_stats[endpoint]["error"] += 1
        elif 200 <= status < 300:
            result.successes += 1
            result.latencies.append(r["latency_ms"])
            result.endpoint_stats[endpoint]["ok"] += 1
        elif 300 <= status < 400:
            result.redirects += 1
        else:
            if status >= 500:
                result.server_errors += 1
            result.errors += 1
            result.endpoint_stats[endpoint]["error"] += 1

    return result


async def main():
    print("=== Test de stress : recherche du plafond d'utilisateurs simultanés ===\n")

    # Warm-up : petite charge pour amorcer le cache
    print("Warm-up du cache (20 requêtes)...")
    await run_once(concurrent=10, total_requests=20)
    print("Cache chaud.\n")

    levels = [50, 100, 200, 300, 500, 750, 1000]
    for level in levels:
        requests = max(level * 2, 100)
        print(f"--- Niveau {level} utilisateurs concurrents ({requests} requêtes) ---")
        start_run = time.perf_counter()
        result = await run_once(concurrent=level, total_requests=requests)
        duration = time.perf_counter() - start_run

        print(f"  Taux de succès : {result.ok_rate:.1f}%")
        print(f"  Erreurs/Timeouts/5xx : {result.errors} ({result.timeouts} timeout, {result.server_errors} 5xx)")
        print(f"  Durée totale : {duration:.1f}s")
        if result.latencies:
            print(f"  Latences : min={min(result.latencies):.0f}ms p50={result.p50:.0f}ms p95={result.p95:.0f}ms p99={result.p99:.0f}ms max={max(result.latencies):.0f}ms avg={result.avg:.0f}ms")
        else:
            print("  Latences : aucune requête OK")
        print()

        # Arrêt si le site commence à sérieusement dégrader
        if result.ok_rate < 95:
            print(f"!!! SEUIL DE RUPTURE APPROCHE à {level} concurrents (taux de succès < 95%) !!!")
            print("Arrêt des tests pour ne pas surcharger inutilement le service.\n")
            break
        if result.p95 > 10000:
            print(f"!!! SEUIL DE RUPTURE APPROCHE à {level} concurrents (p95 > 10s) !!!")
            print("Arrêt des tests pour ne pas surcharger inutilement le service.\n")
            break

    print("=== Test terminé ===")


if __name__ == "__main__":
    asyncio.run(main())
