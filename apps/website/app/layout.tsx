import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import OfflineDetector from "@/components/OfflineDetector";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://beautybook.pk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BeautyBook — Find Pakistan's Best Beauty Professionals",
    template: "%s · BeautyBook",
  },
  description:
    "Discover salons, compare real reviews, explore every service, and book your appointment in seconds — all in one calm, simple place.",
  keywords: ["salon booking Pakistan", "beauty services", "bridal makeup", "spa", "hair salon", "BeautyBook"],
  applicationName: "BeautyBook",
  authors: [{ name: "BeautyBook" }],
  alternates: { canonical: "/" },
  openGraph: {
    title: "BeautyBook — Find. Book. Glow.",
    description: "Pakistan's beauty marketplace. Discover, compare and instantly book beauty professionals.",
    type: "website",
    siteName: "BeautyBook",
    locale: "en_PK",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "BeautyBook — Find. Book. Glow.",
    description: "Pakistan's beauty marketplace. Discover, compare and instantly book beauty professionals.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash of light. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('bb_theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org structured data for rich search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "BeautyBook",
                  url: siteUrl,
                  description: "Pakistan's beauty marketplace to find, book, and glow.",
                  areaServed: "PK",
                },
                {
                  "@type": "WebSite",
                  name: "BeautyBook",
                  url: siteUrl,
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/explore?q={search_term_string}` },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <OfflineDetector />
          <div className="bb-theme-root">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
