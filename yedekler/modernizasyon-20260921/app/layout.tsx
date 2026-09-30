import type { Metadata } from 'next';

import { AnalyticsConsent } from '@/components/analytics-consent';
import { getLegalProfile } from '@/lib/legal-config';
import './globals.css';

const siteUrl =
  process.env.APP_URL ?? 'https://ravza-operasyon-hac.gl56frkn.chatgpt.site';

const title = 'Ravza Randevu | Ravza-i Mutahhara ziyaret randevusu';
const description =
  'Ravza-i Mutahhara ziyareti için kişi sayısına göre randevu paketleri. Talebinizi oluşturun, WhatsApp üzerinden konuşalım, QR kodunuz hazır olduğunda size ulaştıralım.';

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description,
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 675,
        alt: 'Ravza Randevu marka zemini',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = getLegalProfile();
  // Yapılandırılmış veride yalnız doğrulanabilir alanlar yayımlanır.
  // Seyahat acentesi işletme belgesi doğrulanmadığı için `TravelAgency`
  // yerine `Organization` kullanılır; olmayan bir yetkiyi ima etmez.
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: profile.brandName,
    url: siteUrl,
    description,
    areaServed: 'TR',
    ...(profile.companyName ? { legalName: profile.companyName } : {}),
    ...(profile.taxNumber ? { taxID: profile.taxNumber } : {}),
    ...(profile.contactPhone || profile.contactEmail
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: ['tr', 'en', 'ar'],
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
        {children}
        <AnalyticsConsent
          measurementId={process.env.GA_MEASUREMENT_ID ?? ''}
        />
      </body>
    </html>
  );
}
