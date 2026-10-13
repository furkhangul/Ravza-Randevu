'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/safe-link';
import { Coins } from 'lucide-react';

type Summary = {
  purchased: number;
  used: number;
  reserved: number;
  remaining: number;
};

/**
 * Panelin her sayfasında görünen randevu hakkı göstergesi. Veri tek API'den
 * gelir; yüklenemezse `0` değil `—` gösterilir — sıfır bakiye ile
 * okunamayan bakiye aynı şey değildir.
 */
export function CreditPill() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/credits/summary', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<Summary>;
      })
      .then((value) => {
        if (active) setSummary(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

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
        title={failed ? 'Ravza randevu hakkı bilgisi şu anda okunamıyor' : undefined}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium shadow-sm transition ${tone}`}
      >
        <Coins className="size-3.5" />
        Ravza randevu hakkı
        <strong className="tabular-nums">
          {summary ? summary.remaining : failed ? '—' : '…'}
        </strong>
      </button>

      {open ? (
        <div className="absolute end-0 z-50 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-[0_1rem_3rem_rgba(20,38,28,.16)]">
          {summary ? (
            <dl className="space-y-2">
              {[
                ['Toplam alınan', summary.purchased],
                ['Kullanılan', summary.used],
                ['Rezerve (onaylı talepler)', summary.reserved],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="mt-3 flex justify-between gap-3 border-t border-black/5 pt-2 font-medium">
                <dt>Kalan</dt>
                <dd className="tabular-nums">{summary.remaining}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">
              {failed
                ? 'Ravza randevu hakkı bilgisi şu anda okunamıyor.'
                : 'Yükleniyor…'}
            </p>
          )}
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

