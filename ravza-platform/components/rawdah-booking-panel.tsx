'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, QrCode, RefreshCw } from 'lucide-react';

import {
  ChatAvailability,
  type AvailabilitySelection,
} from '@/components/chat-availability';
import { emptyVisit } from '@/lib/visit-conversation';

type Gender = 'female' | 'male';

type Booking = {
  gender: Gender;
  dateKey: string;
  timeSlot: string;
  quantity: number;
  status: 'purchasing' | 'purchased' | 'unknown' | 'failed' | 'shared';
  shareUrl: string | null;
  balanceAfter: number | null;
  error: string | null;
};

type Snapshot = {
  status: string;
  enabled: boolean;
  purchasable: boolean;
  balance: number | null;
  preference: {
    date: string;
    female: { timeSlot: string; window: string } | null;
    male: { timeSlot: string; window: string } | null;
  } | null;
  needed: Array<{ gender: Gender; count: number }>;
  bookings: Booking[];
  /** RawdahBooking'de QR'ı üretilmiş yolcu sayısı (salt okunur). */
  qr?: Array<{ gender: Gender; total: number; withQr: number }>;
  outcome?: { ok: boolean; error?: string; status?: string };
  error?: string;
};

const genderLabel: Record<Gender, string> = { female: 'Kadın', male: 'Erkek' };

const errorText: Record<string, string> = {
  already_purchased_or_in_progress: 'Bu grup için satın alma zaten yapılmış veya sürüyor.',
  provider_rejected:
    'RawdahBooking satın almayı reddetti (saat dolmuş veya bakiye yetersiz olabilir). Kontör düşülmedi; başka bir saat seçip tekrar deneyin.',
  purchase_not_sent: 'Satın alma isteği gönderilemedi. Kontör düşülmedi; tekrar deneyebilirsiniz.',
  status_not_purchasable: 'Satın alma için talep önce “Onaylandı” durumuna getirilmeli.',
  fulfillment_disabled: 'Canlı satın alma kapalı.',
  invalid_slot: 'Tarih veya saat geçersiz.',
};

/**
 * Talep onaylandıktan sonra RawdahBooking'den randevu satın alır ve müşterinin
 * talep takip sayfasında görünen QR bağlantısını oluşturur.
 */
export function RawdahBookingPanel({
  code,
  femaleCount,
  maleCount,
  dateFrom,
  status,
  onChanged,
}: {
  code: string;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  /** Talep durumu değişince (ör. “Onaylandı”) satın alma kapısı yeniden okunur. */
  status?: string;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [selection, setSelection] = useState<AvailabilitySelection | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Tarayıcı onay pencereleri engellenebildiği için onay sayfa içinde istenir.
  const [confirming, setConfirming] = useState<string | null>(null);

  const apply = useCallback((payload: Snapshot) => {
    setData(payload);
    setSelection((current) => {
      if (current || !payload.preference) return current;
      const pref = payload.preference;
      return {
        date: pref.date,
        female: pref.female ? { ...pref.female, available: 0 } : null,
        male: pref.male ? { ...pref.male, available: 0 } : null,
      };
    });
  }, []);

  const load = useCallback(() => {
    fetch(`/api/admin/quote-requests/rawdah?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<Snapshot>;
      })
      .then((payload) => {
        apply(payload);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));
  }, [code, apply]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load, status]);

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/quote-requests/rawdah', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, ...body }),
      });
      const payload = (await response.json()) as Snapshot;
      if (payload.bookings) apply(payload);
      return { response, payload };
    } catch {
      setMessage({ tone: 'warn', text: 'Bağlantı kurulamadı. “Durumu kontrol et” ile sonucu doğrulayın; satın almayı tekrarlamayın.' });
      return null;
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  async function purchase(gender: Gender) {
    const pick = selection?.[gender];
    if (!selection || !pick) return;
    setConfirming(null);
    const result = await post(
      { action: 'purchase', gender, dateKey: selection.date, timeSlot: pick.timeSlot },
      `purchase-${gender}`,
    );
    if (!result) return;
    const outcome = result.payload.outcome;
    if (outcome?.ok && outcome.status === 'shared') {
      setMessage({ tone: 'ok', text: `${genderLabel[gender]} grubu satın alındı, QR bağlantısı müşterinin talep sayfasına eklendi.` });
    } else if (outcome?.ok) {
      setMessage({
        tone: 'warn',
        text:
          outcome.status === 'unknown'
            ? 'RawdahBooking yanıtı belirsiz. Satın almayı TEKRARLAMAYIN; “Durumu kontrol et” ile doğrulayın.'
            : 'Satın alındı; QR bağlantısı henüz oluşmadı. Biraz sonra “Durumu kontrol et”e basın.',
      });
    } else {
      const key = outcome?.error ?? result.payload.error ?? '';
      setMessage({ tone: 'warn', text: errorText[key] ?? 'İşlem tamamlanamadı.' });
    }
  }

  async function release(gender: Gender) {
    setConfirming(null);
    await post({ action: 'release', gender }, `release-${gender}`);
  }

  if (loadFailed) {
    return (
      <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Ravza randevu bilgisi okunamadı.{' '}
        <button type="button" className="underline" onClick={load}>
          Tekrar dene
        </button>
      </p>
    );
  }
  if (!data) {
    return <div className="h-24 animate-pulse rounded-xl bg-black/5" />;
  }

  const booked = (gender: Gender) =>
    data.bookings.find((booking) => booking.gender === gender && booking.status !== 'failed');
  const needsPicker = data.needed.some(({ gender }) => !booked(gender));
  const hasOpen = data.bookings.some((booking) =>
    ['purchasing', 'purchased', 'unknown'].includes(booking.status),
  ) || Boolean(data.qr?.some((item) => item.withQr < item.total));

  return (
    <section className="rounded-2xl border border-border bg-[#f8faf5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="size-4" /> Ravza randevusu ve QR
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            RawdahBooking kontörü:{' '}
            <strong className="tabular-nums text-foreground">{data.balance ?? '—'}</strong>
          </p>
        </div>
        {hasOpen ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => post({ action: 'sync' }, 'sync')}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium disabled:opacity-60"
          >
            {busy === 'sync' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Durumu kontrol et
          </button>
        ) : null}
      </div>

      {!data.enabled ? (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Canlı satın alma kapalı. Açmak için RAWDAH_WRITE_ENABLED ve RAWDAH_SHARE_LINK_ENABLED
          ayarları “true” olmalı.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {data.needed.map(({ gender, count }) => {
          const booking = booked(gender);
          const pick = selection?.[gender];
          return (
            <li key={gender} className="rounded-xl border border-border bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {genderLabel[gender]} · {count} kişi
                </span>
                {booking?.status === 'shared' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--success)]">
                    <Check className="size-3.5" /> QR hazır
                  </span>
                ) : null}
              </div>

              {booking && (booking.status === 'shared' || booking.status === 'purchased')
                ? (() => {
                    const ready = data.qr?.find((item) => item.gender === gender);
                    if (!ready) return null;
                    const done = ready.total > 0 && ready.withQr >= ready.total;
                    return (
                      <p
                        className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${done ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}
                      >
                        {done
                          ? `RawdahBooking QR: ${ready.withQr}/${ready.total} hazır — kapıda okutulabilir.`
                          : `RawdahBooking QR: ${ready.withQr}/${ready.total} hazır. RawdahBooking QR kodlarını randevudan 2 saat önce üretir; o saatte aynı bağlantıda yeşil olarak görünür. Bağlantıyı müşteriye şimdiden gönderebilirsiniz.`}
                      </p>
                    );
                  })()
                : null}
              {booking?.status === 'shared' && booking.shareUrl ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {booking.dateKey} · {booking.timeSlot} (Medine) · müşterinin talep sayfasında görünüyor
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={booking.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0a2e1f] px-3 text-xs font-medium text-white"
                    >
                      QR sayfasını aç <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(booking.shareUrl ?? '')
                          .then(() => setCopied(gender))
                          .catch(() => setCopied(null));
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium"
                    >
                      <Copy className="size-3.5" /> {copied === gender ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
                    </button>
                  </div>
                </div>
              ) : booking?.status === 'purchased' ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Satın alındı ({booking.dateKey} · {booking.timeSlot}). QR bağlantısı bekleniyor —
                  “Durumu kontrol et”e basın.
                </p>
              ) : booking ? (
                <div className="mt-2 space-y-2">
                  <p className="flex items-start gap-1.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    Satın alma sonucu belirsiz ({booking.dateKey} · {booking.timeSlot}). Tekrar
                    satın almayın; önce “Durumu kontrol et”e basın.
                  </p>
                  {confirming === `release-${gender}` ? (
                    <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                      <p>
                        RawdahBooking panelinde {code} koduyla satın alma OLMADIĞINI doğruladınız mı?
                        Satın alma aslında yapıldıysa kontör iki kez harcanır.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" disabled={Boolean(busy)} onClick={() => release(gender)} className="min-h-8 rounded-lg bg-amber-800 px-3 font-medium text-white">
                          Evet, serbest bırak
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="min-h-8 rounded-lg border border-amber-300 px-3">
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => setConfirming(`release-${gender}`)}
                      className="min-h-8 rounded-lg border border-border px-3 text-xs"
                    >
                      Satın alma olmadı, serbest bırak
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <span className="block text-xs text-muted-foreground">
                    {pick && selection
                      ? `${selection.date} · ${pick.timeSlot} (Medine)`
                      : 'Aşağıdan saat seçin'}
                  </span>
                  {confirming === `purchase-${gender}` && pick && selection ? (
                    <div className="rounded-lg border border-[#0a2e1f]/20 bg-[#eef4ee] p-2.5 text-xs">
                      <p>
                        <strong>
                          {genderLabel[gender]} · {count} kişi · {selection.date} {pick.timeSlot}
                        </strong>{' '}
                        (Medine saati) için RawdahBooking&apos;den <strong>{count} kontör</strong>{' '}
                        harcanacak. Bu işlem geri alınamaz.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => purchase(gender)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0a2e1f] px-3 font-medium text-white disabled:opacity-50"
                        >
                          <Check className="size-3.5" /> Evet, {count} kontör harcayarak satın al
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="min-h-9 rounded-lg border border-border bg-white px-3">
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!data.enabled || !data.purchasable || !pick || Boolean(busy)}
                      onClick={() => setConfirming(`purchase-${gender}`)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0a2e1f] px-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {busy === `purchase-${gender}` ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                      Satın al ve QR oluştur ({count} kontör)
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!data.purchasable && needsPicker ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Satın alma, talep “Onaylandı” durumuna getirildiğinde açılır (fiyat ve ödeme netleştikten sonra).
        </p>
      ) : null}

      {message ? (
        <p
          className={`mt-3 rounded-xl p-3 text-xs ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}
        >
          {message.text}
        </p>
      ) : null}

      {needsPicker ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
          <ChatAvailability
            details={{
              ...emptyVisit,
              personCount: femaleCount + maleCount,
              femaleCount,
              maleCount,
              dateFrom: selection?.date ?? dateFrom,
              dateTo: selection?.date ?? dateFrom,
            }}
            locale="tr"
            selected={selection}
            onSelect={setSelection}
            disabled={Boolean(busy)}
          />
        </div>
      ) : null}
    </section>
  );
}
