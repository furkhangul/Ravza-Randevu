'use client';

import { useState } from 'react';
import Link from '@/components/safe-link';
import { Coins } from 'lucide-react';
import { useCreditSummary } from '@/components/panel-providers';

/**
 * Panelin her sayfasında görünen randevu hakkı göstergesi. Veri tek API'den
 * gelir; yüklenemezse `0` değil `—` gösterilir — sıfır bakiye ile
 * okunamayan bakiye aynı şey değildir.
 */
export function CreditPill() {
  const { summary, failed, loading, refresh } = useCreditSummary();
  const [open, setOpen] = useState(false);

  const remaining = summary?.remaining ?? null;
  const tone =
    remaining === null
      ? 'border-black/10 bg-white/70 text-foreground/70'
      : remaining <= 0
        ? 'border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)]'
        : remaining < 20
          ? 'border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--warning)]'
          : 'border-emerald-900/10 bg-white/70 text-[#19613f]';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title={
          failed ? 'Ravza randevu hakkı bilgisi şu anda okunamıyor' : undefined
        }
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium shadow-sm transition ${tone}`}
      >
        <Coins className="size-3.5" />
        Ravza randevu hakkı
        <strong className="tabular-nums">
          {summary
            ? summary.remaining.toLocaleString('tr-TR')
            : failed
              ? '—'
              : '…'}
        </strong>
      </button>

      {open ? (
        <div className="absolute end-0 z-50 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-[0_1rem_3rem_rgba(20,38,28,.16)]">
          {summary ? (
            <dl className="space-y-2">
              <div className="text-muted-foreground">
                <dt>Kaynak</dt>
                <dd>RawdahBooking hesabı</dd>
              </div>
              <div className="mt-3 flex justify-between gap-3 border-t border-black/5 pt-2 font-medium">
                <dt>Kalan</dt>
                <dd className="tabular-nums">
                  {summary.remaining.toLocaleString('tr-TR')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">
              {failed
                ? 'Ravza randevu hakkı bilgisi şu anda okunamıyor.'
                : 'Yükleniyor…'}
            </p>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={refresh}
            className="mt-3 block font-medium text-primary disabled:opacity-50"
          >
            {loading ? 'Yükleniyor…' : 'Bakiyeyi yenile'}
          </button>
          <Link
            href="/panel/kontor"
            className="mt-3 inline-flex text-xs font-medium text-primary underline underline-offset-4"
          >
            Defteri aç
          </Link>
        </div>
      ) : null}
    </div>
  );
}
