// Common helpers and configuration for k6 load tests.
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

export const BASE_URL = __ENV.BASE_URL || "https://foot-match-theta.vercel.app";
export const SLEEP_MIN = parseFloat(__ENV.SLEEP_MIN || "0.5");
export const SLEEP_MAX = parseFloat(__ENV.SLEEP_MAX || "2");

export const PUBLIC_PAGES = {
  home: "/",
  annonces: "/annonces",
  matchsConfirmes: "/matchs-confirmees",
  commentCaMarche: "/comment-ca-marche",
};

export const FILTERS = {
  categories: ["U6/U7", "U10/U11", "U12/U13", "U14/U15", "U16/U17", "U18/U19", "Seniors", "Vétérans/Loisirs"],
  niveaux: ["Départemental", "Régional", "National"],
  ligues: [
    "Auvergne-Rhône-Alpes",
    "Bretagne",
    "Grand Est",
    "Hauts-de-France",
    "Méditerranée",
    "Normandie",
    "Nouvelle-Aquitaine",
    "Occitanie",
    "Paris Île-de-France",
    "Pays de la Loire",
  ],
  districtsByLigue: {
    "Auvergne-Rhône-Alpes": ["Lyon-Rhône", "Isère", "Loire", "Rhône"],
    "Bretagne": ["Ille-et-Vilaine", "Finistère", "Morbihan"],
    "Grand Est": ["Alsace (Bas-Rhin / Haut-Rhin)", "Moselle", "Marne"],
    "Hauts-de-France": ["Escaut", "Artois", "Somme"],
    "Méditerranée": ["Provence", "Côte d'Azur", "Var"],
    "Normandie": ["Seine-Maritime", "Calvados", "Manche"],
    "Nouvelle-Aquitaine": ["Gironde", "Landes", "Pyrénées-Atlantiques"],
    "Occitanie": ["Haute-Garonne", "Hérault", "Tarn"],
    "Paris Île-de-France": ["Paris", "Hauts-de-Seine", "Seine-Saint-Denis"],
    "Pays de la Loire": ["Loire-Atlantique", "Maine-et-Loire", "Sarthe"],
  },
  dom: ["domicile", "exterieur"],
  geo: {
    cities: [
      { ville: "Lyon", lat: 45.764043, lng: 4.835659, rayon: 50 },
      { ville: "Paris", lat: 48.856613, lng: 2.352222, rayon: 50 },
      { ville: "Marseille", lat: 43.296482, lng: 5.36978, rayon: 50 },
      { ville: "Bordeaux", lat: 44.837789, lng: -0.57918, rayon: 50 },
      { ville: "Lille", lat: 50.62925, lng: 3.057256, rayon: 50 },
      { ville: "Nantes", lat: 47.218371, lng: -1.553621, rayon: 50 },
      { ville: "Rennes", lat: 48.117268, lng: -1.677793, rayon: 50 },
    ],
  },
};

export const errorCounter = new Counter("loadtest_errors");
export const endpointTrend = new Trend("loadtest_endpoint_duration", true);

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function sleepRandom(min, max) {
  min = min !== undefined ? min : SLEEP_MIN;
  max = max !== undefined ? max : SLEEP_MAX;
  sleep(randomBetween(min, max));
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function encodeParam(value) {
  return encodeURIComponent(String(value));
}

export function buildAnnoncesUrl(extraParams) {
  extraParams = extraParams || {};
  const pairs = [];
  for (const [key, value] of Object.entries(extraParams)) {
    if (value !== undefined && value !== null && value !== "") {
      pairs.push(encodeParam(key) + "=" + encodeParam(value));
    }
  }
  return pairs.length > 0 ? "/annonces?" + pairs.join("&") : "/annonces";
}

export function buildMatchsConfirmesUrl(ligue, district) {
  ligue = ligue || "";
  district = district || "";
  const pairs = [];
  if (ligue) pairs.push(encodeParam("ligue") + "=" + encodeParam(ligue));
  if (district) pairs.push(encodeParam("district") + "=" + encodeParam(district));
  return pairs.length > 0 ? "/matchs-confirmees?" + pairs.join("&") : "/matchs-confirmees";
}

export function fullUrl(path) {
  return BASE_URL + path;
}

export function statusCheck(res, name) {
  const ok = check(res, {
    [name + " status is 200"]: function (r) { return r.status === 200; },
    [name + " no server error"]: function (r) { return r.status < 500; },
  });
  if (!ok) {
    errorCounter.add(1, { endpoint: name, status: String(res.status) });
  }
  endpointTrend.add(res.timings.duration, { endpoint: name });
  return ok;
}

export function extractIds(html, pattern) {
  const ids = new Set();
  let match;
  const flags = pattern.flags.indexOf("g") >= 0 ? pattern.flags : pattern.flags + "g";
  const globalPattern = new RegExp(pattern.source, flags);
  while ((match = globalPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

export function extractAnnonceIds(html) {
  return extractIds(html, /href=["']\/annonces\/([a-zA-Z0-9_-]{10,})["']/);
}

export function extractClubIds(html) {
  return extractIds(html, /href=["']\/clubs\/([a-zA-Z0-9_-]{10,})["']/);
}

export function fetchWithCheck(http, path, name, tags) {
  tags = tags || {};
  const url = fullUrl(path);
  const res = http.get(url, { tags: { endpoint: name, ...tags } });
  statusCheck(res, name);
  return res;
}

export function weightedRandom(pages) {
  const total = pages.reduce(function (sum, p) { return sum + p.weight; }, 0);
  let r = Math.random() * total;
  for (const page of pages) {
    r -= page.weight;
    if (r <= 0) return page;
  }
  return pages[pages.length - 1];
}
