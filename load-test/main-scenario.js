import http from "k6/http";
import { group } from "k6";
import {
  SLEEP_MIN,
  SLEEP_MAX,
  FILTERS,
  buildAnnoncesUrl,
  buildMatchsConfirmesUrl,
  fetchWithCheck,
  sleepRandom,
  pickRandom,
  extractAnnonceIds,
  extractClubIds,
  fullUrl,
} from "./common.js";
import { handleSummary } from "./report.js";

export { handleSummary };

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(50)<500", "p(95)<2000", "p(99)<5000"],
    loadtest_endpoint_duration: ["p(95)<2000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(50)", "p(95)", "p(99)"],
  tags: { test: "main-realistic-load" },
};

let cachedAnnonceIds = [];
let cachedClubIds = [];
let lastIdRefresh = 0;
const ID_REFRESH_MS = 30000;

function refreshIdsIfNeeded() {
  const now = Date.now();
  if (now - lastIdRefresh < ID_REFRESH_MS && cachedAnnonceIds.length > 0) return;

  const res = http.get(fullUrl("/annonces"));
  if (res.status === 200) {
    cachedAnnonceIds = extractAnnonceIds(res.body);
    cachedClubIds = extractClubIds(res.body);
  }
  lastIdRefresh = now;
}

export default function () {
  group("home", function () {
    fetchWithCheck(http, "/", "home");
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("annonces-list-plain", function () {
    const res = fetchWithCheck(http, "/annonces", "annonces-list");
    if (res.status === 200) {
      cachedAnnonceIds = extractAnnonceIds(res.body);
      cachedClubIds = extractClubIds(res.body);
      lastIdRefresh = Date.now();
    }
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("annonces-search", function () {
    const ligue = pickRandom(FILTERS.ligues);
    const districts = FILTERS.districtsByLigue[ligue] || [];
    const district = districts.length > 0 ? pickRandom(districts) : "";
    const category = pickRandom(FILTERS.categories);

    const params = {
      categorie: category,
      niveau: Math.random() > 0.5 ? pickRandom(FILTERS.niveaux) : "",
      ligue: ligue,
      district: Math.random() > 0.7 ? district : "",
      dom: Math.random() > 0.6 ? pickRandom(FILTERS.dom) : "",
      stade: Math.random() > 0.8 ? "1" : "",
      arbitre: Math.random() > 0.85 ? "1" : "",
    };

    fetchWithCheck(http, buildAnnoncesUrl(params), "annonces-search");
    sleepRandom(SLEEP_MIN, SLEEP_MAX);

    if (Math.random() > 0.5) {
      const city = pickRandom(FILTERS.geo.cities);
      fetchWithCheck(
        http,
        buildAnnoncesUrl({
          ville: city.ville,
          latitude: city.lat,
          longitude: city.lng,
          rayon: city.rayon,
          categorie: category,
        }),
        "annonces-geo-search"
      );
      sleepRandom(SLEEP_MIN, SLEEP_MAX);
    }
  });

  group("annonce-detail", function () {
    refreshIdsIfNeeded();
    if (cachedAnnonceIds.length > 0) {
      const id = pickRandom(cachedAnnonceIds);
      fetchWithCheck(http, "/annonces/" + id, "annonce-detail");
    }
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("annonces-return", function () {
    fetchWithCheck(
      http,
      buildAnnoncesUrl({
        categorie: pickRandom(FILTERS.categories),
        dateFrom: new Date().toISOString().split("T")[0],
      }),
      "annonces-return"
    );
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("matchs-confirmes", function () {
    const ligue = pickRandom(FILTERS.ligues);
    const districts = FILTERS.districtsByLigue[ligue] || [];
    const district = districts.length > 0 && Math.random() > 0.5 ? pickRandom(districts) : "";
    fetchWithCheck(http, buildMatchsConfirmesUrl(ligue, district), "matchs-confirmes");
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("club-profile", function () {
    refreshIdsIfNeeded();
    if (cachedClubIds.length > 0) {
      const id = pickRandom(cachedClubIds);
      fetchWithCheck(http, "/clubs/" + id, "club-profile");
    }
    sleepRandom(SLEEP_MIN, SLEEP_MAX);
  });

  group("annonces-more-searches", function () {
    for (let i = 0; i < 2; i++) {
      fetchWithCheck(
        http,
        buildAnnoncesUrl({
          categorie: pickRandom(FILTERS.categories),
          niveau: Math.random() > 0.5 ? pickRandom(FILTERS.niveaux) : "",
          ligue: pickRandom(FILTERS.ligues),
        }),
        "annonces-more-search"
      );
      sleepRandom(SLEEP_MIN, SLEEP_MAX);
    }
  });
}
