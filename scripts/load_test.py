"""Test de charge modéré pour Matchs Amicaux (Next.js + Vercel)."""
import asyncio
import random
import statistics
import time
from dataclasses import dataclass
import aiohttp

BASE_URL = "https://foot-match-git-main-rallow15s-projects.vercel.app"
# Token SSO temporaire pour les tests sur les déploisements protégés Vercel.
# Laisser vide pour tester un site public non protégé.
SHARE_TOKEN = ""
ENDPOINTS = [
    "/",
    "/annonces",
    "/matchs-confirmees",
    "/login",
    "/comment-ca-marche",
    "/inscription",
]


def make_url(endpoint: str) -> str:
    if not SHARE_TOKEN:
        return f"{BASE_URL}{endpoint}"
    sep = "&" if "?" in endpoint else "?"
    return f"{BASE_URL}{endpoint}{sep}_vercel_share={SHARE_TOKEN}"

CONCURRENT_USERS = 50
TOTAL_REQUESTS = 200  # réparties entre les endpoints
TIMEOUT_SECONDS = 15


@dataclass
class Result:
    endpoint: str
    status: int
    latency_ms: float
    error: str | None = None


async def fetch(session: aiohttp.ClientSession, endpoint: str, sem: asyncio.Semaphore) -> Result:
    url = make_url(endpoint)
    async with sem:
        start = time.perf_counter()
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT_SECONDS)) as resp:
                await resp.read()
                latency_ms = (time.perf_counter() - start) * 1000
                # Suivre les redirections Vercel SSO comme succès pour les pages protégées par auth
                return Result(endpoint=endpoint, status=resp.status, latency_ms=latency_ms)
        except asyncio.TimeoutError:
            return Result(endpoint=endpoint, status=0, latency_ms=(time.perf_counter() - start) * 1000, error="TIMEOUT")
        except Exception as exc:
            return Result(endpoint=endpoint, status=0, latency_ms=(time.perf_counter() - start) * 1000, error=type(exc).__name__)
        finally:
            # Petit délai aléatoire pour ne pas marteler le serveur
            await asyncio.sleep(random.uniform(0.05, 0.25))


async def main():
    sem = asyncio.Semaphore(CONCURRENT_USERS)
    connector = aiohttp.TCPConnector(limit=100, limit_per_host=50, enable_cleanup_closed=True)
    headers = {"Accept": "text/html", "User-Agent": "MatchsAmicaux-LoadTest/1.0"}

    tasks = []
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        for _ in range(TOTAL_REQUESTS):
            endpoint = random.choice(ENDPOINTS)
            tasks.append(fetch(session, endpoint, sem))
        results = await asyncio.gather(*tasks)

    # Statistiques globales
    total = len(results)
    errors = [r for r in results if r.error]
    successes = [r for r in results if not r.error and r.status < 400]
    redirects = [r for r in results if not r.error and 300 <= r.status < 400]
    server_errors = [r for r in results if not r.error and r.status >= 500]

    print(f"=== Résultats du test de charge ===")
    print(f"URL de base : {BASE_URL}")
    print(f"Utilisateurs concurrents max : {CONCURRENT_USERS}")
    print(f"Requêtes totales : {total}")
    print(f"Succès (2xx/3xx) : {len(successes) + len(redirects)} ({(len(successes) + len(redirects)) / total * 100:.1f}%)")
    print(f"Erreurs réseau/timeout : {len(errors)} ({len(errors) / total * 100:.1f}%)")
    print(f"Erreurs serveur (5xx) : {len(server_errors)} ({len(server_errors) / total * 100:.1f}%)")

    if successes:
        latencies = sorted(r.latency_ms for r in successes)
        print(f"\nLatences (succès) :")
        print(f"  min  : {latencies[0]:.1f} ms")
        print(f"  p50  : {statistics.median(latencies):.1f} ms")
        print(f"  p95  : {latencies[int(len(latencies) * 0.95)]:.1f} ms")
        print(f"  p99  : {latencies[int(len(latencies) * 0.99)]:.1f} ms")
        print(f"  max  : {latencies[-1]:.1f} ms")
        print(f"  moy  : {statistics.mean(latencies):.1f} ms")

    print("\n=== Détail par endpoint ===")
    for endpoint in ENDPOINTS:
        subset = [r for r in results if r.endpoint == endpoint]
        ok = [r for r in subset if not r.error and r.status < 400]
        redir = [r for r in subset if not r.error and 300 <= r.status < 400]
        errs = [r for r in subset if r.error or r.status >= 400]
        if ok:
            lats = [r.latency_ms for r in ok]
            print(f"{endpoint:25} | {len(ok)+len(redir):>3}/{len(subset):>3} ok | p95 {statistics.median(sorted(lats)[int(len(lats)*0.95):]) if len(lats) >= 20 else max(lats):>7.1f} ms | erreurs: {len(errs)}")
        else:
            statuses = {}
            for r in subset:
                statuses[r.status] = statuses.get(r.status, 0) + 1
            print(f"{endpoint:25} | {len(subset):>3} req | statuses: {statuses} | erreurs: {len(errs)}")

    if errors:
        print("\n=== Exemples d'erreurs ===")
        for r in errors[:10]:
            print(f"  {r.endpoint} -> {r.error} ({r.latency_ms:.1f} ms)")


if __name__ == "__main__":
    asyncio.run(main())
