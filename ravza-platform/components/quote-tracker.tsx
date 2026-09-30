'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2, QrCode, Search } from 'lucide-react';

import { usePublicPreferences } from '@/components/public-preferences';
import { quotePipeline, type QuoteStatus } from '@/lib/quote-request';

type TrackResult = {
  code: string;
  status: QuoteStatus;
  personCount: number;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  createdAt: number;
  updatedAt: number;
  history: Array<{ status: QuoteStatus; createdAt: number }>;
  qrLinks?: Array<{
    gender: 'female' | 'male';
    date: string;
    time: string;
    count: number;
    url: string;
    /** RawdahBooking QR'ı üretti mi; bilinmiyorsa null. */
    ready?: boolean | null;
  }>;
};

const statusCopy: Record<'tr' | 'en' | 'ar', Record<QuoteStatus, string>> = {
  tr: {
    new: 'Talep alındı',
    contacted: 'Görüşme başladı',
    quoted: 'Fiyat iletildi',
    confirmed: 'Onaylandı',
    scheduled: 'Randevu planlandı',
    qr_ready: 'QR hazır',
    delivered: 'Teslim edildi',
    closed: 'Kapatıldı',
    cancelled: 'İptal edildi',
    expired: 'Süresi doldu',
  },
  en: {
    new: 'Request received',
    contacted: 'Conversation started',
    quoted: 'Price shared',
    confirmed: 'Confirmed',
    scheduled: 'Appointment scheduled',
    qr_ready: 'QR ready',
    delivered: 'Delivered',
    closed: 'Closed',
    cancelled: 'Cancelled',
    expired: 'Expired',
  },
  ar: {
    new: 'تم استلام الطلب',
    contacted: 'بدأ التواصل',
    quoted: 'تم إرسال السعر',
    confirmed: 'تم التأكيد',
    scheduled: 'تم تحديد الموعد',
    qr_ready: 'الرمز جاهز',
    delivered: 'تم التسليم',
    closed: 'مغلق',
    cancelled: 'ملغي',
    expired: 'منتهي',
  },
};

const copy = {
  tr: {
    codeLabel: 'Talep kodu',
    phoneLabel: 'Telefonunuzun son 4 hanesi',
    phoneHint: 'Talebi oluştururken verdiğiniz numaranın son dört hanesi.',
    action: 'Sorgula',
    searching: 'Sorgulanıyor',
    people: 'kişi',
    women: 'kadın',
    men: 'erkek',
    dates: 'Tarih aralığı',
    updated: 'Son güncelleme',
    stopped: 'Bu talep artık işlemde değil.',
    qrTitle: 'Ravza giriş QR kodlarınız hazır',
    qrHint:
      'Aşağıdaki bağlantı resmî QR kodlarınızı açar. Ziyaret günü girişte bu sayfadaki QR kodunu görevliye okutun. Bağlantıyı yalnız grubunuzla paylaşın.',
    qrOpen: 'QR kodlarını aç',
    qrWomen: 'Kadın ziyaretçiler',
    qrMen: 'Erkek ziyaretçiler',
    qrTime: 'Medine saati',
    qrPreparing: 'QR kodunuz randevu saatinden 2 saat önce bu bağlantıda görünür.',
    qrPending:
      'Ravza giriş QR kodlarınız bu sayfada görünmüyorsa ekibimiz size WhatsApp üzerinden iletir. Sorunuz olursa bize yazın.',
  },
  en: {
    codeLabel: 'Request code',
    phoneLabel: 'Last 4 digits of your phone',
    phoneHint: 'The last four digits of the number you gave us.',
    action: 'Check',
    searching: 'Checking',
    people: 'people',
    women: 'women',
    men: 'men',
    dates: 'Date range',
    updated: 'Last update',
    stopped: 'This request is no longer in progress.',
    qrTitle: 'Your Rawdah entry QR codes are ready',
    qrHint:
      'The link below opens your official QR codes. On the visit day, have the QR code on that page scanned at the entrance. Share the link only with your group.',
    qrOpen: 'Open QR codes',
    qrWomen: 'Women',
    qrMen: 'Men',
    qrTime: 'Medina time',
    qrPreparing: 'Your QR code appears at this link 2 hours before your appointment.',
    qrPending:
      'If your Rawdah entry QR codes are not shown here, our team sends them to you on WhatsApp. Contact us if you have questions.',
  },
  ar: {
    codeLabel: 'رمز الطلب',
    phoneLabel: 'آخر ٤ أرقام من هاتفك',
    phoneHint: 'آخر أربعة أرقام من الرقم الذي زودتنا به.',
    action: 'استعلام',
    searching: 'جارٍ الاستعلام',
    people: 'أشخاص',
    women: 'نساء',
    men: 'رجال',
    dates: 'نطاق التواريخ',
    updated: 'آخر تحديث',
    stopped: 'هذا الطلب لم يعد قيد المعالجة.',
    qrTitle: 'رموز QR لدخول الروضة جاهزة',
    qrHint:
      'يفتح الرابط أدناه رموز QR الرسمية. في يوم الزيارة اعرض رمز QR في تلك الصفحة على الموظف عند المدخل. شارك الرابط مع مجموعتك فقط.',
    qrOpen: 'افتح رموز QR',
    qrWomen: 'النساء',
    qrMen: 'الرجال',
    qrTime: 'توقيت المدينة',
    qrPreparing: 'يظهر رمز QR على هذا الرابط قبل موعدك بساعتين.',
    qrPending:
      'إذا لم تظهر رموز QR لدخول الروضة هنا، يرسلها فريقنا إليك عبر واتساب. تواصل معنا إذا كان لديك سؤال.',
  },
};

export function QuoteTracker({ initialCode = '' }: { initialCode?: string }) {
  const { locale } = usePublicPreferences();
  const t = copy[locale];
  const statuses = statusCopy[locale];
  const [code, setCode] = useState(initialCode);
  const [last4, setLast4] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function lookup() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/quote-requests/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, phoneLast4: last4 }),
      });
      const payload = (await response.json()) as TrackResult & {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? 'Talep bulunamadı.');
        return;
      }
      setResult(payload);
    } catch {
      setError('Sorgu şu anda yapılamıyor.');
    } finally {
      setPending(false);
    }
  }

  const activeIndex = result ? quotePipeline.indexOf(result.status) : -1;
  const sideTrack =
    result && (result.status === 'cancelled' || result.status === 'expired');

  return (
    <div className="space-y-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
        className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
      >
        <div>
          <label htmlFor="quote-code" className="text-xs text-muted-foreground">
            {t.codeLabel}
          </label>
          <input
            id="quote-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="TALEP-…"
            className="mt-1 min-h-12 w-full rounded-xl border border-input bg-transparent px-3 font-mono text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="quote-last4" className="text-xs text-muted-foreground">
            {t.phoneLabel}
          </label>
          <input
            id="quote-last4"
            value={last4}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) =>
              setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))
            }
            placeholder="1234"
            className="mt-1 min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {pending ? t.searching : t.action}
        </button>
        <p className="text-[0.7rem] text-muted-foreground sm:col-span-3">
          {t.phoneHint}
        </p>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-4 text-sm text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-lg font-semibold">{result.code}</p>
            <p className="text-xs text-muted-foreground">
              {t.updated}: {new Date(result.updatedAt).toLocaleString(locale)}
            </p>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {result.personCount} {t.people} · {result.femaleCount} {t.women},{' '}
            {result.maleCount} {t.men} · {t.dates}: {result.dateFrom} –{' '}
            {result.dateTo}
          </p>

          {result.qrLinks?.length ? (
            <div className="mt-5 rounded-2xl border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-4">
              <p className="flex items-center gap-2 font-medium">
                <QrCode className="size-5 text-[color:var(--success)]" />
                {t.qrTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.qrHint}</p>
              <div className="mt-3 grid gap-2">
                {result.qrLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#0a2e1f] px-4 py-3 text-white transition hover:bg-[#154632]"
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        {link.gender === 'female' ? t.qrWomen : t.qrMen} · {link.count} {t.people}
                      </span>
                      <span className="block text-xs text-white/75">
                        {link.date} · {link.time} ({t.qrTime})
                      </span>
                      {link.ready === false ? (
                        <span className="mt-0.5 block text-xs text-[#f1d9a0]">{t.qrPreparing}</span>
                      ) : null}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
                      {t.qrOpen}
                      <ExternalLink className="size-4" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : ['qr_ready', 'delivered', 'closed'].includes(result.status) ? (
            <p className="mt-5 rounded-xl bg-muted p-4 text-sm">{t.qrPending}</p>
          ) : null}

          <div className="rule-mashrabiya my-5" />

          {sideTrack ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              {statuses[result.status]} — {t.stopped}
            </p>
          ) : (
            <ol className="space-y-3">
              {quotePipeline.map((status, index) => {
                const done = index < activeIndex;
                const active = index === activeIndex;
                return (
                  <li key={status} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs ${
                        done
                          ? 'border-[color:var(--success)] bg-[color:var(--success)] text-white'
                          : active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        active
                          ? 'font-medium'
                          : done
                            ? 'text-foreground/70'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {statuses[status]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
