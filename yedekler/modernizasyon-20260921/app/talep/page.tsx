import { PublicShell } from '@/components/public-shell';
import { QuoteTracker } from '@/components/quote-tracker';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Talep takibi · Ravza Randevu',
  description: 'Talep kodunuz ve telefon numaranızla talebinizin durumunu görün.',
  robots: { index: false, follow: false },
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.kod;
  const code = (Array.isArray(raw) ? raw[0] : raw) ?? '';

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
            Güvenlik için yalnız talep kodu yeterli değildir; talebi
            oluştururken verdiğiniz telefon numarasının son dört hanesini de
            isteriz.
          </p>
          <div className="mt-8">
            <QuoteTracker initialCode={code.toUpperCase()} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
