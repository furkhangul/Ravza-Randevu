"use client";

import Link from "@/components/safe-link";
import { Check, Minus, Sparkles, Users } from "lucide-react";

import { usePublicPreferences } from "@/components/public-preferences";
import {
  packageAdvantagePercent,
  packageTotalMinor,
  type AppointmentPackageRecord,
} from "@/lib/appointment-packages";

const copy = {
  tr: {
    eyebrow: "Paketler",
    title: "Ziyaretinize uygun bir başlangıç.",
    lead: "Bireysel ziyaretler, aileler ve kafileler için Ravza ziyaret desteği. Kişi sayınıza uygun taleple başlayın; uygunluğu ve kapsamı birlikte değerlendirelim.",
    person: "kişi",
    perPerson: "kişi başı",
    total: "toplam",
    onRequest: "Fiyat WhatsApp’tan teyit edilir",
    advantage: (percent: number) => `Kişi başı %${percent} avantaj`,
    popular: "Öne çıkan paket",
    included: "Dahil olanlar",
    excluded: "Dahil olmayanlar",
    delivery: "Teslim",
    deliveryText: "Randevu tarihinden önce, QR hazır olur olmaz.",
    cancel: "İptal ve değişiklik",
    cancelText: "Randevu oluşturulmadan önce ücretsiz iptal edilir.",
    terms: "Hizmet koşulları",
    order: "Bu paketle talep oluştur",
    approx: "yaklaşık",
    empty: "Paket listesi şu anda görüntülenemiyor.",
    emptyHint: "Bize doğrudan ulaşın, talebinizi birlikte oluşturalım.",
    emptyAction: "Ziyaret asistanını aç",
    note: "Ödeme bu sitede alınmaz",
    noteText:
      "Fiyat ve ödeme şekli görüşme sırasında netleşir; tahsilat elden veya havale ile tamamlanır. Randevunun oluşması havuzdaki uygunluğa, ziyarete giriş ise Harameyn yönetiminin kararına bağlıdır.",
  },
  en: {
    eyebrow: "Packages",
    title: "Rawdah appointment packages by headcount",
    lead: "From a single visit to a full convoy the process is the same: you create the request, we continue on WhatsApp and prepare your QR codes.",
    person: "people",
    perPerson: "per person",
    total: "total",
    onRequest: "Price is confirmed over WhatsApp",
    advantage: (percent: number) => `${percent}% better per person`,
    popular: "Featured package",
    included: "What is included",
    excluded: "Not included",
    delivery: "Delivery",
    deliveryText: "Before the visit date, as soon as the QR is ready.",
    cancel: "Cancellation",
    cancelText: "Free cancellation before the appointment is created.",
    terms: "Terms of service",
    order: "Request this package",
    approx: "approx.",
    empty: "The package list cannot be shown right now.",
    emptyHint: "Reach us directly and we will build the request together.",
    emptyAction: "Open the order assistant",
    note: "Our team confirms the service details with you",
    noteText:
      "Price and payment are agreed during the conversation and settled in cash or by transfer. Appointments depend on pool availability; entry is decided by the Haramain authority.",
  },
  ar: {
    eyebrow: "الباقات",
    title: "باقات مواعيد الروضة حسب عدد الأشخاص",
    lead: "من زيارة فردية إلى قافلة كاملة، العملية واحدة: تنشئ الطلب، ونكمل عبر واتساب ونجهز رموز QR.",
    person: "أشخاص",
    perPerson: "للشخص",
    total: "الإجمالي",
    onRequest: "يتم تأكيد السعر عبر واتساب",
    advantage: (percent: number) => `توفير ${percent}% للشخص`,
    popular: "الأكثر اختيارًا",
    included: "ما يشمله",
    excluded: "غير مشمول",
    delivery: "التسليم",
    deliveryText: "قبل موعد الزيارة، فور جاهزية الرمز.",
    cancel: "الإلغاء والتعديل",
    cancelText: "إلغاء مجاني قبل إنشاء الموعد.",
    terms: "شروط الخدمة",
    order: "اطلب هذه الباقة",
    approx: "تقريبًا",
    empty: "تعذر عرض قائمة الباقات حاليًا.",
    emptyHint: "تواصل معنا مباشرة وسننشئ الطلب معًا.",
    emptyAction: "افتح مساعد الطلب",
    note: "لا يتم الدفع عبر الموقع",
    noteText:
      "يتم الاتفاق على السعر وطريقة الدفع أثناء التواصل ويُسدد نقدًا أو بالحوالة. يعتمد الموعد على التوفر، ويعود قرار الدخول لإدارة الحرمين.",
  },
};

export function AppointmentPackagesContent({ packages }: { packages: AppointmentPackageRecord[] }) {
  const { locale, currency, formatUsd } = usePublicPreferences();
  const t = copy[locale];
  const soloPrice = packages.find((item) => item.code === "solo")?.pricePerPersonMinor ?? null;

  return (
    <>
      <section className="relative overflow-hidden px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div aria-hidden="true" className="pattern-girih pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{t.eyebrow}</p>
          <h1 className="mt-3 font-heading text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.05]">
            {t.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {t.lead}
          </p>
        </div>
      </section>

      {/* Üst boşluk zorunlu: globals.css içindeki `content-visibility: auto`
          kuralı bölüme boyama sınırlaması getiriyor ve karttan taşan
          "En çok tercih edilen" rozetini kırpıyordu. */}
      <section className="px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[80rem]">
          {packages.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-heading text-xl">{t.empty}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.emptyHint}</p>
              <Link
                href="/siparis"
                className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                {t.emptyAction}
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => {
                const advantage = packageAdvantagePercent(pkg.pricePerPersonMinor, soloPrice);
                const total = packageTotalMinor(pkg);
                return (
                  <article
                    key={pkg.code}
                    className={`relative flex flex-col rounded-3xl border bg-card p-6 transition ${
                      pkg.highlight
                        ? "border-gold shadow-[0_1rem_3rem_rgba(20,38,28,.12)]"
                        : "border-border"
                    }`}
                  >
                    {pkg.highlight ? (
                      <span className="absolute -top-3 start-6 inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)] px-3 py-1 text-[0.7rem] font-medium text-[#14261d]">
                        <Sparkles className="size-3" />
                        {t.popular}
                      </span>
                    ) : null}

                    <header>
                      <h2 className="font-heading text-2xl">{pkg.name[locale] || pkg.name.tr}</h2>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-4" />
                        {pkg.code === "custom" ? `${pkg.personCount}+` : pkg.personCount} {t.person}
                      </p>
                    </header>

                    <div className="mt-5 min-h-[4.5rem] border-y border-border py-4">
                      {pkg.pricePerPersonMinor === null ? (
                        <p className="text-sm text-muted-foreground">{t.onRequest}</p>
                      ) : (
                        <>
                          <p className="font-heading text-3xl leading-none">
                            {formatUsd(pkg.pricePerPersonMinor / 100)}
                            <span className="ms-2 align-middle text-sm font-sans text-muted-foreground">
                              {t.perPerson}
                            </span>
                          </p>
                          {total !== null ? (
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {currency === "USD" ? "" : `${t.approx} `}
                              {formatUsd(total / 100)} {t.total}
                            </p>
                          ) : null}
                          {advantage !== null ? (
                            <p className="mt-2 inline-flex rounded-full bg-[color:var(--gold-soft)] px-2.5 py-0.5 text-[0.7rem] font-medium text-[#6b5320]">
                              {t.advantage(advantage)}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="mt-5 flex-1 space-y-4 text-sm">
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {t.included}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {pkg.included.map((item) => (
                            <li key={item.tr} className="flex gap-2">
                              <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                              <span>{item[locale] || item.tr}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {pkg.excluded.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t.excluded}
                          </p>
                          <ul className="mt-2 space-y-1.5 text-muted-foreground">
                            {pkg.excluded.map((item) => (
                              <li key={item.tr} className="flex gap-2">
                                <Minus className="mt-0.5 size-4 shrink-0" />
                                <span>{item[locale] || item.tr}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <dl className="rounded-xl bg-muted/60 p-3 text-xs leading-5">
                        <dt className="font-medium">{t.delivery}</dt>
                        <dd className="text-muted-foreground">{t.deliveryText}</dd>
                        <dt className="mt-2 font-medium">{t.cancel}</dt>
                        <dd className="text-muted-foreground">
                          {t.cancelText}{" "}
                          <Link
                            href="/sozlesme"
                            className="text-primary underline underline-offset-2"
                          >
                            {t.terms}
                          </Link>
                        </dd>
                      </dl>
                    </div>

                    <Link
                      href={`/siparis?paket=${pkg.code}`}
                      className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      {t.order}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          <aside className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gold/40 bg-gold-soft/25 p-5 text-sm leading-6">
            <p className="font-medium">{t.note}</p>
            <p className="mt-1 text-muted-foreground">{t.noteText}</p>
          </aside>
        </div>
      </section>
    </>
  );
}

