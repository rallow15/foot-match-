import type { MetadataRoute } from "next";

const BASE_URL = (process.env.APP_URL ?? "https://www.monmatchamical.fr").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
