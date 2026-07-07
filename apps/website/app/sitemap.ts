import type { MetadataRoute } from "next";
import { apiTry, SalonSummary } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://beautybook.pk";
  const paths = [
    "", "/explore", "/services", "/offers", "/map", "/smart-search",
    "/partner", "/about", "/careers", "/contact", "/blog", "/tips",
    "/gift-cards", "/memberships", "/loyalty", "/referrals",
    "/login", "/signup", "/faq", "/terms", "/privacy", "/refund-policy",
  ];
  const staticPages: MetadataRoute.Sitemap = paths.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
  const res = await apiTry<{ salons: SalonSummary[] }>("/api/salons?limit=50", 3600);
  const salonPages: MetadataRoute.Sitemap = (res?.salons || []).map((s) => ({
    url: `${base}/salon/${s.slug}`,
    changeFrequency: "daily",
  }));
  return [...staticPages, ...salonPages];
}
