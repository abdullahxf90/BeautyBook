import type { MetadataRoute } from "next";
import { apiTry, SalonSummary } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://beautybook.pk";
  const staticPages: MetadataRoute.Sitemap = ["", "/explore", "/partner", "/about", "/login", "/signup"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly",
  }));
  const res = await apiTry<{ salons: SalonSummary[] }>("/api/salons?limit=50", 3600);
  const salonPages: MetadataRoute.Sitemap = (res?.salons || []).map((s) => ({
    url: `${base}/salon/${s.slug}`,
    changeFrequency: "daily",
  }));
  return [...staticPages, ...salonPages];
}
