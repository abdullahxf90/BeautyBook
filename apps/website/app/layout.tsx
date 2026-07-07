import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import OfflineDetector from "@/components/OfflineDetector";

export const metadata: Metadata = {
  title: "BeautyBook — Find Pakistan's Best Beauty Professionals",
  description:
    "Discover salons, compare real reviews, explore every service, and book your appointment in seconds — all in one beautifully simple place.",
  keywords: ["salon booking Pakistan", "beauty services", "bridal makeup", "spa", "BeautyBook"],
  openGraph: {
    title: "BeautyBook — Find. Book. Glow.",
    description: "Pakistan's beauty marketplace. Discover, compare and instantly book beauty professionals.",
    type: "website",
  },
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
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
