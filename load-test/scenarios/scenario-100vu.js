import http from "k6/http";
import { group } from "k6";
import {
  buildAnnoncesUrl,
  buildMatchsConfirmesUrl,
  fetchWithCheck,
  sleepRandom,
  pickRandom,
  FILTERS,
  extractAnnonceIds,
  extractClubIds,
  fullUrl,
} from "../common.js";
import { handleSummary } from "../report.js";

export { handleSummary };

export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "4m", target: 100 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(50)<500", "p(95)<2000", "p(99)<5000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(50)", "p(95)", "p(99)"],
  tags: { test: "100-vu" },
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
  group("browse", function () {
    fetchWithCheck(http, "/", "home");
    sleepRandom();
    fetchWithCheck(http, "/annonces", "annonces-list");
    sleepRandom();
  });

  group("search", function () {
    const ligue = pickRandom(FILTERS.ligues);
    const district = pickRandom(FILTERS.districtsByLigue[ligue] || []);
    fetchWithCheck(
      http,
      buildAnnoncesUrl({
        categorie: pickRandom(FILTERS.categories),
        niveau: pickRandom(FILTERS.niveaux),
        ligue: ligue,
        district: district,
        dom: pickRandom(FILTERS.dom),
      }),
      "annonces-search"
    );
    sleepRandom();

    const city = pickRandom(FILTERS.geo.cities);
    fetchWithCheck(
      http,
      buildAnnoncesUrl({
        ville: city.ville,
        latitude: city.lat,
        longitude: city.lng,
        rayon: city.rayon,
      }),
      "annonces-geo-search"
    );
    sleepRandom();
  });

  group("detail", function () {
    refreshIdsIfNeeded();
    if (cachedAnnonceIds.length > 0) {
      fetchWithCheck(http, "/annonces/" + pickRandom(cachedAnnonceIds), "annonce-detail");
    }
    sleepRandom();
  });

  group("confirmes", function () {
    const ligue = pickRandom(FILTERS.ligues);
    const district = pickRandom(FILTERS.districtsByLigue[ligue] || []);
    fetchWithCheck(http, buildMatchsConfirmesUrl(ligue, district), "matchs-confirmes");
    sleepRandom();
  });

  group("club", function () {
    refreshIdsIfNeeded();
    if (cachedClubIds.length > 0) {
      fetchWithCheck(http, "/clubs/" + pickRandom(cachedClubIds), "club-profile");
    }
    sleepRandom();
  });

  group("more-searches", function () {
    fetchWithCheck(http, buildAnnoncesUrl({ categorie: pickRandom(FILTERS.categories) }), "annonces-more-search");
    sleepRandom();
  });
}
