import type { Metadata } from "next";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { getLegalProfile } from "@/lib/legal-config";
import "./globals.css";
import "./modern.css";

const siteUrl = process.env.APP_URL ?? "https://ravzarandevu.com.tr";

const title = "Ravza Randevu | Ravza-i Mutahhara ziyaret randevusu";
const description =
  "Ravza ziyaret talebi, umre ve ziyaret rehberi ile kadın ve erkek randevu saatleri.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  // Site simgesi: marka logosu (public/favicon.svg ve ondan üretilen PNG'ler).
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  openGraph: {
    title,
    description,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 675,
        alt: "Ravza Randevu marka zemini",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = getLegalProfile();
  // Yapılandırılmış veride yalnız doğrulanabilir alanlar yayımlanır.
  // Seyahat acentesi işletme belgesi doğrulanmadığı için `TravelAgency`
  // yerine `Organization` kullanılır; olmayan bir yetkiyi ima etmez.
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: profile.brandName,
    url: siteUrl,
    description,
    areaServed: "TR",
    ...(profile.companyName ? { legalName: profile.companyName } : {}),
    ...(profile.taxNumber ? { taxID: profile.taxNumber } : {}),
    ...(profile.contactPhone || profile.contactEmail
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            availableLanguage: ["tr", "en", "ar"],
            ...(profile.contactPhone ? { telephone: profile.contactPhone } : {}),
            ...(profile.contactEmail ? { email: profile.contactEmail } : {}),
          },
        }
      : {}),
  };

  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
        {children}
        <AnalyticsConsent measurementId={process.env.GA_MEASUREMENT_ID ?? ""} />
      </body>
    </html>
  );
}

