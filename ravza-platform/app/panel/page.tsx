import Link from '@/components/safe-link';
import { ArrowRight, CalendarDays, ClipboardClock, QrCode } from 'lucide-react';

import { LiveAvailabilitySummary } from '@/components/live-availability-summary';
import { SectionShell } from '@/components/section-shell';
import { PanelStats } from '@/components/panel-stats';
import { listQuotesForStats, listStatusEventsForStats } from '@/db/quotes';
import {
  computeStats,
  parsePeriod,
  PERIOD_LABEL,
  PERIOD_TITLE,
  periodRange,
  PREVIOUS_LABEL,
  STATS_PERIODS,
  type PeriodStats,
} from '@/lib/quote-stats';

export const dynamic = 'force-dynamic';

const quickActions = [
  {
    href: '/panel/talepler',
    title: 'Talepleri işle',
    description: 'Siteden gelen talepleri görüşmeye ve onaya taşı.',
    icon: ClipboardClock,
  },
  {
    href: '/panel/randevular',
    title: 'Randevu ve QR',
    description: 'Takvimi aç, kayıt oluştur, QR durumlarını ilerlet.',
    icon: CalendarDays,
  },
  {
    href: '/panel/yolcular',
    title: 'Yolcu listesi',
    description: 'Excel yükle, satır hatalarını gör, tekil kayıt ekle.',
    icon: QrCode,
  },
];

/** Seçili dönemin istatistikleri; okunamazsa `null` (sıfırla karıştırılmasın diye). */
async function loadStats(period: ReturnType<typeof parsePeriod>): Promise<PeriodStats | null> {
  const now = Date.now();
  try {
    const since = periodRange(period, now).previousStart;
    const [quotes, events] = await Promise.all([
      listQuotesForStats(since),
      listStatusEventsForStats(since),
    ]);
    return computeStats(period, quotes, events, now);
  } catch {
    return null;
  }
}

export default async function PanelHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = parsePeriod(Array.isArray(params.donem) ? params.donem[0] : params.donem);
  const stats = await loadStats(period);

  return (
    <SectionShell title="Arayüz" eyebrow="Operasyon özeti" activePath="/panel">
      <nav aria-label="Dönem" className="flex flex-wrap items-center gap-2">
        {STATS_PERIODS.map((item) => (
          <Link
            key={item}
            href={item === 'gun' ? '/panel' : `/panel?donem=${item}`}
            aria-current={item === period ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition ${
              item === period
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-black/10 bg-white text-foreground/70 hover:bg-muted'
            }`}
          >
            {PERIOD_LABEL[item]}
          </Link>
        ))}
        <span className="ms-1 text-xs text-muted-foreground">
          {PERIOD_TITLE[period]} · İstanbul saati
        </span>
      </nav>

      <section className="mt-5" aria-label="İstatistikler">
        {stats ? (
          <PanelStats
            stats={stats}
            title={PERIOD_TITLE[period].toLocaleLowerCase('tr-TR')}
            previousLabel={PREVIOUS_LABEL[period]}
          />
        ) : (
          <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
            İstatistikler şu anda okunamıyor. Sıfır ile okunamayan veri aynı şey değildir;
            bağlantı dönünce sayfayı yenileyin.
          </p>
        )}
      </section>

      <section className="mt-8" aria-label="Hızlı işlemler">
        <h2 className="font-serif text-xl">Sıradaki iş</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickActions.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-black/5 bg-white p-5 transition hover:border-primary/30 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 flex items-center gap-2 font-medium">
                {title}
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 rtl:rotate-180" />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-label="Canlı müsaitlik">
        <h2 className="font-serif text-xl">Havuz durumu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          RawdahBooking’den salt okunur gelir. Buradan satın alma yapılmaz.
        </p>
        <div className="mt-4">
          <LiveAvailabilitySummary />
        </div>
      </section>
    </SectionShell>
  );
}
