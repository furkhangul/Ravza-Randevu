import { PublicShell } from '@/components/public-shell';
import { QuoteTracker } from '@/components/quote-tracker';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Talep takibi · Ravza Randevu',
  robots: { index: false, follow: false },
};

/**
 * Kod adresin içinde geçse bile hiçbir kişisel veri sunucudan
 * gönderilmez: sayfa yalnız kodu forma yazar, sorgu telefonun son dört
 * hanesiyle birlikte yapılır.
 */
export default async function TrackByCodePage({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;

  return (
    <PublicShell>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Takip
          </p>
          <h1 className="mt-3 font-heading text-4xl leading-tight">
            Talebiniz nerede?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Doğrulama için telefon numaranızın son dört hanesini girin.
          </p>
          <div className="mt-8">
            <QuoteTracker initialCode={decodeURIComponent(kod).toUpperCase()} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
