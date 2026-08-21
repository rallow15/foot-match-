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
    { duration: "1m", target: 50 },
    { duration: "1m", target: 125 },
    { duration: "5m", target: 250 },
    { duration: "1m", target: 125 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(50)<600", "p(95)<3000", "p(99)<7000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(50)", "p(95)", "p(99)"],
  tags: { test: "250-vu" },
};

let cachedAnnonceIds = [];
let cachedClubIds = [];
let lastIdRefresh = 0;
const ID_REFRESH_MS = 45000;

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
      }),
      "annonces-search"
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
    fetchWithCheck(http, buildMatchsConfirmesUrl(ligue), "matchs-confirmes");
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
    fetchWithCheck(
      http,
      buildAnnoncesUrl({
        categorie: pickRandom(FILTERS.categories),
        stade: "1",
      }),
      "annonces-more-search"
    );
    sleepRandom();
  });
}
