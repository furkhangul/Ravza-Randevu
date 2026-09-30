'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePublicPreferences } from '@/components/public-preferences';
import { downloadCsv } from '@/lib/csv-export';
import { riyadhToday } from '@/lib/date-validation';

type Slot = {
  timeSlot: string;
  window: string;
  gender: 'female' | 'male';
  available: number | '50+';
};

type Status = 'loading' | 'ready' | 'empty' | 'error';

const labels = {
  tr: {
    date: 'Takvim tarihi',
    download: 'Excel için indir',
    time: 'Saat',
    window: 'Zaman aralığı',
    group: 'Ziyaretçi grubu',
    available: 'Uygun randevu sayısı',
    status: 'Durum',
    women: 'Kadın',
    men: 'Erkek',
    slots: 'uygun saat aralığı',
    full: 'Dolu',
    loading: 'Seçilen günün saatleri yükleniyor…',
    empty: 'Bu tarih için saat kaydı bulunamadı.',
    error: 'Canlı takvim şu anda okunamadı. Lütfen daha sonra tekrar deneyin.',
    ready: 'Uygun',
    title: 'Ravza randevu saatleri',
  },
  en: {
    date: 'Schedule date',
    download: 'Download for Excel',
    time: 'Time',
    window: 'Time window',
    group: 'Visitor group',
    available: 'Available appointments',
    status: 'Status',
    women: 'Women',
    men: 'Men',
    slots: 'available time slots',
    full: 'Full',
    loading: 'Loading times for the selected day…',
    empty: 'No time slots were found for this date.',
    error:
      'The live schedule is unavailable right now. Please try again later.',
    ready: 'Available',
    title: 'Rawdah appointment times',
  },
  ar: {
    date: 'تاريخ الجدول',
    download: 'تنزيل لبرنامج Excel',
    time: 'الوقت',
    window: 'الفترة الزمنية',
    group: 'فئة الزوار',
    available: 'المواعيد المتاحة',
    status: 'الحالة',
    women: 'نساء',
    men: 'رجال',
    slots: 'فترات زمنية متاحة',
    full: 'مكتمل',
    loading: 'جارٍ تحميل أوقات اليوم المحدد…',
    empty: 'لا توجد أوقات مسجلة لهذا التاريخ.',
    error: 'الجدول المباشر غير متاح الآن. يرجى المحاولة لاحقًا.',
    ready: 'متاح',
    title: 'مواعيد الروضة',
  },
} as const;

export function LiveAvailabilitySummary() {
  const { locale } = usePublicPreferences();
  const t = labels[locale];
  const [date, setDate] = useState(riyadhToday);
  const [status, setStatus] = useState<Status>('loading');
  const [slots, setSlots] = useState<Slot[]>([]);
  // Erkek ve kadın saatleri ayrı listelenir: solda erkek, sağda kadın.
  const [gender, setGender] = useState<Slot['gender']>('male');
  const visible = useMemo(
    () => slots.filter((slot) => slot.gender === gender),
    [slots, gender],
  );
  const openCount = (value: Slot['gender']) =>
    slots.filter((slot) => slot.gender === value && slot.available !== 0).length;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/availability?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('availability_failed');
        return response.json() as Promise<{ slots?: Slot[] }>;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        const next = (result.slots ?? []).slice().sort((a, b) => {
          if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1;
          return a.timeSlot.localeCompare(b.timeSlot);
        });
        setSlots(next);
        setStatus(next.length ? 'ready' : 'empty');
      })
      .catch((caught: unknown) => {
        if (
          controller.signal.aborted ||
          (caught instanceof DOMException && caught.name === 'AbortError')
        )
          return;
        setSlots([]);
        setStatus('error');
      });
    return () => controller.abort();
  }, [date]);

  const csvRows = useMemo(
    () =>
      slots.map((slot) => [
        date,
        slot.timeSlot,
        slot.window,
        slot.gender === 'female' ? t.women : t.men,
        slot.available,
        slot.available === 0 ? t.full : t.ready,
      ]),
    [date, slots, t],
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_14px_48px_rgba(20,38,28,.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-white/55 p-4 sm:p-5">
        <div>
          <h3 className="font-heading text-2xl">{t.title}</h3>
          <label
            htmlFor="public-availability-date"
            className="mt-3 block text-xs font-medium text-muted-foreground"
          >
            {t.date}
          </label>
          <input
            id="public-availability-date"
            type="date"
            min={riyadhToday()}
            value={date}
            onChange={(event) => {
              setStatus('loading');
              setDate(event.target.value);
            }}
            className="mt-1 min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={status !== 'ready'}
          onClick={() =>
            downloadCsv(
              `ravza-randevu-saatleri-${date}.csv`,
              [t.date, t.time, t.window, t.group, t.available, t.status],
              csvRows,
            )
          }
        >
          <Download className="size-4" /> {t.download}
        </Button>
      </div>

      <div
        className="grid grid-cols-2 gap-2 border-b border-border bg-white/40 p-3 sm:px-5"
        role="tablist"
        aria-label={t.group}
      >
        {(['male', 'female'] as const).map((value) => {
          const active = gender === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGender(value)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                active
                  ? value === 'female'
                    ? 'border-[#8a3650] bg-[#8a3650] text-white'
                    : 'border-[#28538b] bg-[#28538b] text-white'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {value === 'female' ? t.women : t.men}
              {status === 'ready' ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-muted'}`}
                >
                  {openCount(value)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {status === 'loading' ? (
        <p className="p-6 text-sm text-muted-foreground">{t.loading}</p>
      ) : status === 'empty' ? (
        <p className="p-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : status === 'error' ? (
        <p className="p-6 text-sm text-[#9f432b]">{t.error}</p>
      ) : visible.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[#f3eee5] text-xs uppercase tracking-[.08em] text-muted-foreground">
              <tr>
                {[t.time, t.window, t.available, t.status].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 font-semibold sm:px-5"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((slot) => {
                const full = slot.available === 0;
                return (
                  <tr
                    key={`${slot.gender}-${slot.timeSlot}`}
                    className="border-t border-border/70 hover:bg-secondary/25"
                  >
                    <td className="px-4 py-3 font-semibold tabular-nums sm:px-5">
                      {slot.timeSlot}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {slot.window.replace('-', '–')} ·{' '}
                      {locale === 'tr'
                        ? 'Medine saati'
                        : locale === 'en'
                          ? 'Medina time'
                          : 'توقيت المدينة'}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {slot.available}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${full ? 'bg-muted text-muted-foreground' : 'bg-[#e8f2ed] text-[#19613f]'}`}
                      >
                        {full ? t.full : t.ready}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
        {t.status}:{' '}
        {status === 'ready' || status === 'empty'
          ? openCount(gender)
          : '—'}{' '}
        {t.slots}
      </p>
    </div>
  );
}
