import type { MetadataRoute } from "next";

const BASE_URL = "https://www.monmatchamical.fr";

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
