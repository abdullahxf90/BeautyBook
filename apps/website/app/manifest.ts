import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeautyBook — Pakistan's Beauty Marketplace",
    short_name: "BeautyBook",
    description: "Discover salons, compare real reviews, and book your appointment in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F7",
    theme_color: "#1C1C1C",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
