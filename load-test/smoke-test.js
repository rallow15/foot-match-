import http from "k6/http";
import { check } from "k6";
import {
  fullUrl,
  extractAnnonceIds,
  extractClubIds,
  buildAnnoncesUrl,
  buildMatchsConfirmesUrl,
  pickRandom,
  FILTERS,
} from "./common.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  const home = http.get(fullUrl("/"));
  check(home, { "home 200": function (r) { return r.status === 200; } });

  const list = http.get(fullUrl("/annonces"));
  check(list, { "annonces list 200": function (r) { return r.status === 200; } });

  const annonceIds = extractAnnonceIds(list.body);
  const clubIds = extractClubIds(list.body);

  check(null, {
    "found annonce ids": function () { return annonceIds.length > 0; },
    "found club ids": function () { return clubIds.length > 0; },
  });

  console.log("Found " + annonceIds.length + " annonce ids, " + clubIds.length + " club ids");

  if (annonceIds.length > 0) {
    const detail = http.get(fullUrl("/annonces/" + annonceIds[0]));
    check(detail, { "annonce detail 200": function (r) { return r.status === 200; } });
  }

  if (clubIds.length > 0) {
    const profile = http.get(fullUrl("/clubs/" + clubIds[0]));
    check(profile, { "club profile 200": function (r) { return r.status === 200; } });
  }

  const search = http.get(
    fullUrl(
      buildAnnoncesUrl({
        categorie: pickRandom(FILTERS.categories),
        niveau: pickRandom(FILTERS.niveaux),
        ligue: pickRandom(FILTERS.ligues),
      })
    )
  );
  check(search, { "filtered search 200": function (r) { return r.status === 200; } });

  const geo = http.get(
    fullUrl(
      buildAnnoncesUrl({
        ville: "Lyon",
        latitude: 45.764043,
        longitude: 4.835659,
        rayon: 50,
      })
    )
  );
  check(geo, { "geo search 200": function (r) { return r.status === 200; } });

  const confirmes = http.get(fullUrl(buildMatchsConfirmesUrl(pickRandom(FILTERS.ligues))));
  check(confirmes, { "matchs confirmes 200": function (r) { return r.status === 200; } });
}
