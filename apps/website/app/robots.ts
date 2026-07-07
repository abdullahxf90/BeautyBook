import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://beautybook.pk";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private / authenticated areas out of the index.
      disallow: ["/dashboard", "/salon-dashboard", "/admin", "/wallet", "/settings", "/checkout", "/checkin", "/reception", "/ops", "/support-tickets"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
