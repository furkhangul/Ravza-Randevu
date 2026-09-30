"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { riyadhToday } from "@/lib/date-validation";
import type { VisitDetails } from "@/lib/visit-conversation";

type Locale = "tr" | "en" | "ar";
type Gender = "female" | "male";
type Count = number | "50+";
type Slot = { timeSlot: string; window: string; gender: Gender; available: Count };
type Status = "loading" | "ready" | "error";

export type SlotPick = { timeSlot: string; window: string; available: Count };
/** Ravza'da kadın ve erkek saatleri ayrıdır; karma grup her biri için ayrı saat seçer. */
export type AvailabilitySelection = { date: string; female: SlotPick | null; male: SlotPick | null };

const DAYS = 10;

const copy = {
  tr: {
    title: "Boş randevu saatleri",
    hint: "Canlı Ravza takvimi · Medine saati",
    loading: "Boş saatler yükleniyor…",
    error: "Canlı takvim şu anda okunamadı. Tarihinizi sohbete yazarak devam edebilirsiniz.",
    none: "Bu gün için uygun boş saat yok. Başka bir gün seçin.",
    women: "Kadın saatleri",
    men: "Erkek saatleri",
    free: "boş",
    noneFor: "Bu gün için boş saat yok.",
    open: "uygun saat",
    other: "Diğer tarih",
    pickFemale: "Kadın ziyaretçiler için bir saat seçin.",
    pickMale: "Erkek ziyaretçiler için bir saat seçin.",
  },
  en: {
    title: "Open appointment times",
    hint: "Live Rawdah calendar · Medina time",
    loading: "Loading open times…",
    error: "The live calendar can’t be read right now. You can continue by typing your dates.",
    none: "No open times on this day. Try another day.",
    women: "Women’s times",
    men: "Men’s times",
    free: "open",
    noneFor: "No open times on this day.",
    open: "open times",
    other: "Other date",
    pickFemale: "Pick a time for the women in your group.",
    pickMale: "Pick a time for the men in your group.",
  },
  ar: {
    title: "مواعيد الروضة المتاحة",
    hint: "تقويم الروضة المباشر · توقيت المدينة",
    loading: "جارٍ تحميل المواعيد المتاحة…",
    error: "تعذرت قراءة التقويم المباشر الآن. يمكنك المتابعة بكتابة التواريخ.",
    none: "لا توجد مواعيد متاحة في هذا اليوم. اختر يومًا آخر.",
    women: "مواعيد النساء",
    men: "مواعيد الرجال",
    free: "متاح",
    noneFor: "لا توجد مواعيد متاحة في هذا اليوم.",
    open: "مواعيد متاحة",
    other: "تاريخ آخر",
    pickFemale: "اختر موعدًا للنساء في مجموعتك.",
    pickMale: "اختر موعدًا للرجال في مجموعتك.",
  },
} as const;

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function maxDate() {
  return addDays(riyadhToday(), 90);
}

/** `need` null: dağılım henüz bilinmiyor, en az bir boş yer yeterli. */
function fits(available: Count, need: number | null) {
  const count = available === "50+" ? 50 : available;
  return count >= Math.max(need ?? 1, 1);
}

export function formatVisitDate(date: string, locale: Locale, weekday = true) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale === "en" ? "en-GB" : "ar-SA", {
    day: "numeric",
    month: "long",
    ...(weekday ? { weekday: "long" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Grubun ihtiyaç duyduğu cinsiyetler. Dağılım bilinmiyorsa ikisi de gösterilir. */
export function neededGenders(details: VisitDetails): Gender[] {
  if (details.femaleCount === null || details.maleCount === null) return ["female", "male"];
  return (["female", "male"] as const).filter((gender) =>
    gender === "female" ? details.femaleCount! > 0 : details.maleCount! > 0,
  );
}

/** Talep notuna eklenen satırın başı; not güncellenirken eski satır bununla bulunur. */
const NOTE_PREFIX = {
  tr: "Seçilen randevu saati:",
  en: "Selected appointment time:",
  ar: "الموعد المختار:",
} as const;

/** Seçimi talep notuna yazılacak tek satıra çevirir. */
export function selectionNote(selection: AvailabilitySelection, locale: Locale) {
  const labels = { tr: ["Kadın", "Erkek"], en: ["Women", "Men"], ar: ["نساء", "رجال"] }[locale];
  const zone = { tr: "Medine saati", en: "Medina time", ar: "توقيت المدينة" }[locale];
  const times = (
    [
      [labels[0], selection.female],
      [labels[1], selection.male],
    ] as const
  )
    .filter(([, pick]) => pick)
    .map(([label, pick]) => `${label} ${pick!.window.replace("-", "–")}`)
    .join(" · ");
  return `${NOTE_PREFIX[locale]} ${selection.date} · ${times} (${zone})`;
}

/** Nottaki eski saat satırını yenisiyle değiştirir; kullanıcının yazdıkları korunur. */
export function withSelectionNote(note: string, line: string) {
  const prefixes = Object.values(NOTE_PREFIX);
  const rest = note
    .split("\n")
    .filter((row) => !prefixes.some((prefix) => row.startsWith(prefix)))
    .join("\n")
    .trim();
  return [line, rest].filter(Boolean).join("\n\n");
}

/** Seçim, gereken her cinsiyet için bir saat içeriyorsa tamamdır. */
export function isSelectionComplete(selection: AvailabilitySelection, details: VisitDetails) {
  if (details.femaleCount === null || details.maleCount === null) {
    return Boolean(selection.female || selection.male);
  }
  return neededGenders(details).every((gender) => selection[gender]);
}

export function ChatAvailability({
  details,
  focusDate,
  locale,
  selected,
  onSelect,
  disabled,
}: {
  details: VisitDetails;
  /** Asistanın sohbette andığı gün; talep tarihinden önceliklidir. */
  focusDate?: string;
  locale: Locale;
  selected: AvailabilitySelection | null;
  onSelect: (selection: AvailabilitySelection) => void;
  disabled?: boolean;
}) {
  const t = copy[locale];
  const today = riyadhToday();
  const inRange = (value?: string) => Boolean(value && value >= today && value <= maxDate());
  const requested = inRange(focusDate) ? focusDate! : inRange(details.dateFrom) ? details.dateFrom : "";
  const [date, setDate] = useState(requested || today);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<Status>("loading");
  const [slots, setSlots] = useState<Slot[]>([]);

  // Sohbette yeni bir tarih konuşulursa takvim o güne geçer.
  const [lastRequested, setLastRequested] = useState(requested);
  if (requested !== lastRequested) {
    setLastRequested(requested);
    if (requested && requested !== date) {
      setDate(requested);
      setStatus("loading");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/availability?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("availability_failed");
        return (await response.json()) as { slots?: Slot[] };
      })
      .then((result) => {
        setSlots(
          (result.slots ?? []).slice().sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
        );
        setStatus("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSlots([]);
        setStatus("error");
      });
    return () => controller.abort();
  }, [date]);

  const days = useMemo(() => {
    const list = Array.from({ length: DAYS }, (_, index) => addDays(today, index));
    if (requested && !list.includes(requested)) list.push(requested);
    return list;
  }, [today, requested]);

  const genders = neededGenders(details);
  const need = (gender: Gender) => (gender === "female" ? details.femaleCount : details.maleCount);
  const openSlots = (gender: Gender) =>
    slots.filter((slot) => slot.gender === gender && fits(slot.available, need(gender)));
  const openCount = genders.reduce((sum, gender) => sum + openSlots(gender).length, 0);
  const current = selected?.date === date ? selected : null;

  function pick(slot: Slot) {
    const base: AvailabilitySelection = current ?? { date, female: null, male: null };
    onSelect({
      ...base,
      [slot.gender]: { timeSlot: slot.timeSlot, window: slot.window, available: slot.available },
    });
  }

  const waiting =
    status === "ready" && current && details.femaleCount !== null && details.maleCount !== null
      ? genders.find((gender) => !current[gender])
      : undefined;

  return (
    <section className="chat-availability" aria-label={t.title}>
      <button
        type="button"
        className="chat-availability-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CalendarDays className="size-4 shrink-0" />
        <span>
          <strong>{t.title}</strong>
          <small>
            {status === "ready" ? `${formatVisitDate(date, locale)} · ${openCount} ${t.open}` : t.hint}
          </small>
        </span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <>
          <div className="chat-availability-days">
            {days.map((day) => (
              <button
                type="button"
                key={day}
                aria-pressed={day === date}
                onClick={() => {
                  if (day === date) return;
                  setStatus("loading");
                  setDate(day);
                }}
              >
                {formatVisitDate(day, locale, false)}
              </button>
            ))}
            <label className="chat-availability-other">
              <span className="sr-only">{t.other}</span>
              <input
                type="date"
                min={today}
                max={maxDate()}
                value={date}
                aria-label={t.other}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value || value < today || value > maxDate() || value === date) return;
                  setStatus("loading");
                  setDate(value);
                }}
              />
            </label>
          </div>
          <div className="chat-availability-list">
            {status === "loading" ? (
              <p className="chat-availability-note">{t.loading}</p>
            ) : status === "error" ? (
              <p className="chat-availability-note is-error">{t.error}</p>
            ) : openCount === 0 ? (
              <p className="chat-availability-note">{t.none}</p>
            ) : null}
            {waiting ? (
              <p className="chat-availability-note is-next">
                {waiting === "female" ? t.pickFemale : t.pickMale}
              </p>
            ) : null}
            {status === "ready"
              ? genders.map((gender) => {
                  // Yalnız grubun sığabileceği boş saatler listelenir.
                  const list = openSlots(gender);
                  return (
                    <div key={gender} className={`chat-slot-group is-${gender}`}>
                      <p className="chat-slot-group-title">
                        {gender === "female" ? t.women : t.men}
                        <span>
                          {openSlots(gender).length} {t.open}
                        </span>
                      </p>
                      {list.length || openCount === 0 ? null : <p className="chat-availability-note">{t.noneFor}</p>}
                      <div className="chat-slot-grid">
                        {list.map((slot) => {
                          return (
                            <button
                              type="button"
                              key={slot.timeSlot}
                              className="chat-slot"
                              disabled={disabled}
                              aria-pressed={current?.[gender]?.timeSlot === slot.timeSlot}
                              onClick={() => pick(slot)}
                            >
                              <span className="chat-slot-time">{slot.window.replace("-", "–")}</span>
                              <span className="chat-slot-count is-open">
                                {slot.available} {t.free}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
