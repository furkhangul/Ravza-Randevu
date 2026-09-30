'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';

import { usePublicPreferences } from '@/components/public-preferences';
import { LiveAvailabilitySummary } from '@/components/live-availability-summary';
import {
  packageAdvantagePercent,
  type AppointmentPackageRecord,
} from '@/lib/appointment-packages';
import type { FeedbackRecord } from '@/lib/feedback';

const copy = {
  tr: {
    heroEyebrow: 'Ravza-i Mutahhara',
    heroTitle: 'Ravza ziyareti için randevunuzu biz ayarlayalım.',
    heroLead:
      'Kaç kişi olduğunuzu ve hangi tarihleri düşündüğünüzü söyleyin; uygun saati arar, QR kodlarınızı hazırlar ve size ulaştırırız.',
    heroPrimary: 'Sipariş ver',
    heroSecondary: 'Paketleri gör',
    heroNote: 'Tahsilat site üzerinden yapılmaz.',
    howTitle: 'Üç adımda nasıl çalışır?',
    steps: [
      [
        'Talep oluşturun',
        'Altı kısa soru. Talebiniz anında kaydedilir ve size bir takip kodu verilir.',
      ],
      [
        'WhatsApp’tan konuşalım',
        'Uygunluğu birlikte bakarız; fiyat ve ödeme şekli görüşmede netleşir.',
      ],
      [
        'QR kodunuz hazır',
        'Randevu oluştuğunda kişiye özel QR kodunuz WhatsApp veya e-posta ile gelir.',
      ],
    ] as Array<[string, string]>,
    packagesTitle: 'Kişi sayısına göre paketler',
    packagesLead:
      'Tek kişilik ziyaretten kafile organizasyonuna kadar aynı özenli süreç.',
    packagesAll: 'Tüm paketleri gör',
    person: 'kişi',
    perPerson: 'kişi başı',
    onRequest: 'Fiyat WhatsApp’tan teyit edilir',
    advantage: (percent: number) => `Kişi başı %${percent} avantaj`,
    poolTitle: 'Havuz durumu',
    poolLead:
      'Önümüzdeki günlerde kadın ve erkek için görünen uygunluk. Salt okunur bilgidir.',
    whyTitle: 'Neden bu platform?',
    why: [
      [
        'Kurumsal muhatap',
        'Ticari unvan, vergi bilgisi ve adres sayfanın altında açıkça yazar.',
      ],
      [
        'Tek kanaldan takip',
        'Her talebe bir kod verilir; süreci bu kodla adım adım izlersiniz.',
      ],
      [
        'Kadın ve erkek saatleri ayrı yönetilir',
        'Ravza ziyaret saatleri ayrı olduğu için dağılımı baştan sorarız.',
      ],
      [
        'Toplu gruplarda tek liste',
        'Kafile ve acente taleplerinde yolcular tek listede, tek muhatapla yürür.',
      ],
    ] as Array<[string, string]>,
    guideTitle: 'Ziyaret öncesi bilmeniz gerekenler',
    guideLead:
      'Kadın ve erkek saatlerinin farkı, QR kodunun nasıl kullanıldığı ve en sık yapılan hatalar.',
    guideAction: 'Ziyaret rehberini aç',
    feedbackTitle: 'Ziyaretçilerimiz ne dedi?',
    feedbackNote: 'Yalnız teslim edilen taleplerden gelen, onaylanmış yorumlar.',
    businessReply: 'İşletme yanıtı',
    verified: 'Doğrulanmış talep',
    faqTitle: 'Sık sorulanlar',
    faqAll: 'Tüm soruları gör',
    faq: [
      [
        'Randevu garantisi veriyor musunuz?',
        'Hayır. Havuzda uygun yer bulunduğunda randevunuz oluşturulur; ziyarete giriş kararı Harameyn yönetimine aittir.',
      ],
      [
        'Ödemeyi nasıl yapacağım?',
        'Site üzerinden tahsilat yapılmaz. Fiyat ve ödeme şekli görüşmede konuşulur, elden veya havale ile tamamlanır.',
      ],
      [
        'Kadın ve erkek aynı saatte ziyaret edebilir mi?',
        'Hayır, Ravza ziyaret saatleri ayrıdır. Bu yüzden talep sırasında kadın ve erkek sayısını ayrı sorarız.',
      ],
      [
        'Talebimden vazgeçersem ne olur?',
        'Randevu oluşturulmadan önce ücretsiz iptal edilir. Oluşmuş bir randevu için koşullar hizmet koşullarında yazar.',
      ],
      [
        'Bilgilerim WhatsApp’a nasıl gidiyor?',
        'Yalnız sizin onayınızla. Asistanın son adımında ayrı bir onay kutusu vardır ve onay kaydı tutulur.',
      ],
    ] as Array<[string, string]>,
    ctaTitle: 'Hazırsanız başlayalım',
    ctaLead: 'Altı soru sürüyor. Sonrasını biz takip ederiz.',
  },
  en: {
    heroEyebrow: 'Rawdah al-Mutahharah',
    heroTitle: 'Let us arrange your appointment to visit Rawdah.',
    heroLead:
      'Tell us how many of you there are and which dates you have in mind; we look for a slot, prepare the QR codes and send them to you.',
    heroPrimary: 'Order',
    heroSecondary: 'See packages',
    heroNote: 'No payment is collected on this site.',
    howTitle: 'How it works, in three steps',
    steps: [
      [
        'Create a request',
        'Six short questions. Your request is saved instantly and you get a tracking code.',
      ],
      [
        'We talk on WhatsApp',
        'We check availability together; price and payment are agreed in the conversation.',
      ],
      [
        'Your QR is ready',
        'Once the appointment exists, your personal QR arrives by WhatsApp or e-mail.',
      ],
    ] as Array<[string, string]>,
    packagesTitle: 'Packages by headcount',
    packagesLead:
      'From a single visit to a full convoy, the same careful process.',
    packagesAll: 'See all packages',
    person: 'people',
    perPerson: 'per person',
    onRequest: 'Price is confirmed over WhatsApp',
    advantage: (percent: number) => `${percent}% better per person`,
    poolTitle: 'Pool availability',
    poolLead:
      'Availability visible for women and men in the coming days. Read-only.',
    whyTitle: 'Why this platform?',
    why: [
      [
        'A real company to talk to',
        'Legal name, tax details and address are printed at the bottom of every page.',
      ],
      [
        'One place to follow',
        'Every request gets a code; you follow each step with it.',
      ],
      [
        'Women and men handled separately',
        'Rawdah visiting hours differ, so we ask for the split up front.',
      ],
      [
        'One list for groups',
        'Convoys and agencies run through a single list and a single contact.',
      ],
    ] as Array<[string, string]>,
    guideTitle: 'What to know before the visit',
    guideLead:
      'The difference between women’s and men’s hours, how the QR is used, and the most common mistakes.',
    guideAction: 'Open the visit guide',
    feedbackTitle: 'What visitors said',
    feedbackNote: 'Only approved reviews from delivered requests.',
    businessReply: 'Business reply',
    verified: 'Verified request',
    faqTitle: 'Frequently asked',
    faqAll: 'See all questions',
    faq: [
      [
        'Do you guarantee an appointment?',
        'No. An appointment is created when the pool has availability; entry is decided by the Haramain authority.',
      ],
      [
        'How do I pay?',
        'No payment is collected on this site. Price and method are agreed in the conversation and settled in cash or by transfer.',
      ],
      [
        'Can women and men visit at the same time?',
        'No, Rawdah visiting hours are separate. That is why we ask for the split during the request.',
      ],
      [
        'What if I change my mind?',
        'Free cancellation before the appointment is created. Terms for a created appointment are in the terms of service.',
      ],
      [
        'How does my data reach WhatsApp?',
        'Only with your consent. The last step of the assistant has a separate checkbox and the consent is recorded.',
      ],
    ] as Array<[string, string]>,
    ctaTitle: 'Ready when you are',
    ctaLead: 'It takes six questions. We handle the rest.',
  },
  ar: {
    heroEyebrow: 'الروضة المطهرة',
    heroTitle: 'دعنا نرتب لك موعد زيارة الروضة.',
    heroLead:
      'أخبرنا بعدد الأشخاص والتواريخ المناسبة؛ نبحث عن وقت متاح ونجهز رموز QR ونرسلها إليك.',
    heroPrimary: 'اطلب الآن',
    heroSecondary: 'شاهد الباقات',
    heroNote: 'لا يتم تحصيل أي مبالغ عبر الموقع.',
    howTitle: 'كيف يعمل؟ ثلاث خطوات',
    steps: [
      [
        'أنشئ الطلب',
        'ستة أسئلة قصيرة. يُحفظ طلبك فورًا وتحصل على رمز تتبع.',
      ],
      [
        'نتواصل عبر واتساب',
        'نتحقق من التوفر معًا، ويُتفق على السعر وطريقة الدفع أثناء التواصل.',
      ],
      [
        'رمزك جاهز',
        'عند إنشاء الموعد يصلك رمز QR الخاص بك عبر واتساب أو البريد.',
      ],
    ] as Array<[string, string]>,
    packagesTitle: 'باقات حسب عدد الأشخاص',
    packagesLead: 'من زيارة فردية إلى قافلة كاملة، بالعناية نفسها.',
    packagesAll: 'شاهد كل الباقات',
    person: 'أشخاص',
    perPerson: 'للشخص',
    onRequest: 'يتم تأكيد السعر عبر واتساب',
    advantage: (percent: number) => `توفير ${percent}% للشخص`,
    poolTitle: 'حالة التوفر',
    poolLead: 'التوفر الظاهر للنساء والرجال في الأيام القادمة. للاطلاع فقط.',
    whyTitle: 'لماذا هذه المنصة؟',
    why: [
      ['جهة رسمية واضحة', 'الاسم التجاري والبيانات الضريبية والعنوان في أسفل كل صفحة.'],
      ['متابعة من مكان واحد', 'لكل طلب رمز، تتابع به كل خطوة.'],
      ['فصل أوقات النساء والرجال', 'أوقات زيارة الروضة مختلفة، لذلك نسأل عن التوزيع مسبقًا.'],
      ['قائمة واحدة للمجموعات', 'القوافل والوكالات تُدار بقائمة واحدة وجهة اتصال واحدة.'],
    ] as Array<[string, string]>,
    guideTitle: 'ما يجب معرفته قبل الزيارة',
    guideLead:
      'الفرق بين أوقات النساء والرجال، وكيفية استخدام الرمز، وأكثر الأخطاء شيوعًا.',
    guideAction: 'افتح دليل الزيارة',
    feedbackTitle: 'ماذا قال الزوار؟',
    feedbackNote: 'تقييمات معتمدة فقط من طلبات تم تسليمها.',
    businessReply: 'رد الجهة',
    verified: 'طلب موثق',
    faqTitle: 'الأسئلة الشائعة',
    faqAll: 'كل الأسئلة',
    faq: [
      ['هل تضمنون الموعد؟', 'لا. يُنشأ الموعد عند توفر مكان، وقرار الدخول لإدارة الحرمين.'],
      ['كيف أدفع؟', 'لا دفع عبر الموقع. يُتفق على السعر والطريقة أثناء التواصل نقدًا أو بالحوالة.'],
      ['هل يزور الرجال والنساء في الوقت نفسه؟', 'لا، الأوقات منفصلة، لذلك نسأل عن التوزيع.'],
      ['ماذا لو غيرت رأيي؟', 'الإلغاء مجاني قبل إنشاء الموعد. الشروط الأخرى في شروط الخدمة.'],
      ['كيف تصل بياناتي إلى واتساب؟', 'بموافقتك فقط، عبر خانة موافقة منفصلة يتم تسجيلها.'],
    ] as Array<[string, string]>,
    ctaTitle: 'لنبدأ متى شئت',
    ctaLead: 'ستة أسئلة فقط، والباقي علينا.',
  },
};

const stepIcons = [ClipboardList, MessageCircle, QrCode];

export function LandingContent({
  packages,
  feedback,
}: {
  packages: AppointmentPackageRecord[];
  feedback: FeedbackRecord[];
}) {
  const { locale, formatUsd } = usePublicPreferences();
  const t = copy[locale];
  const soloPrice =
    packages.find((item) => item.code === 'solo')?.pricePerPersonMinor ?? null;
  const featured = packages
    .filter((item) => item.code !== 'solo' && item.code !== 'custom')
    .slice(0, 3);

  return (
    <>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-20">
        <div
          aria-hidden="true"
          className="pattern-girih pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto grid max-w-[80rem] items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              {t.heroEyebrow}
            </p>
            <h1 className="mt-4 font-heading text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.02]">
              {t.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {t.heroLead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/siparis"
                className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {t.heroPrimary}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
              <Link
                href="/paketler"
                className="inline-flex min-h-13 items-center rounded-xl border border-border px-6 text-sm font-medium transition hover:bg-muted"
              >
                {t.heroSecondary}
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t.heroNote}</p>
          </div>

          <div className="arch-top relative aspect-[4/5] w-full max-w-md justify-self-center border border-gold/30 bg-secondary lg:justify-self-end">
            {/* Görsel zaten webp ve tek boyutta sunuluyor; vinext'in
                görüntü iyileştiricisi bu kurulumda boş yanıt döndürdüğü
                için doğrudan etiket kullanılır. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/medina-nabawi-evening.webp"
              alt={
                locale === 'ar'
                  ? 'المسجد النبوي في المدينة المنورة عند المساء'
                  : locale === 'en'
                    ? 'The Prophet’s Mosque in Medina at evening'
                    : 'Akşam saatlerinde Medine’de Mescid-i Nebevî'
              }
              width={800}
              height={1000}
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 2 — Nasıl çalışır */}
      <section
        id="nasil-calisir"
        className="scroll-mt-24 bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[80rem]">
          <h2 className="text-center font-heading text-[clamp(2rem,4vw,3rem)]">
            {t.howTitle}
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {t.steps.map(([title, text], index) => {
              const Icon = stepIcons[index];
              return (
                <article
                  key={title}
                  className="rounded-3xl border border-border bg-card p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-5 flex items-baseline gap-2">
                    <span className="font-heading text-2xl">{title}</span>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 — Paketler */}
      {featured.length > 0 ? (
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[80rem]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-[clamp(2rem,4vw,3rem)]">
                  {t.packagesTitle}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {t.packagesLead}
                </p>
              </div>
              <Link
                href="/paketler"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.packagesAll}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featured.map((pkg) => {
                const advantage = packageAdvantagePercent(
                  pkg.pricePerPersonMinor,
                  soloPrice,
                );
                return (
                  <article
                    key={pkg.code}
                    className={`flex flex-col rounded-3xl border bg-card p-6 ${
                      pkg.highlight ? 'border-gold' : 'border-border'
                    }`}
                  >
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      {pkg.personCount} {t.person}
                    </p>
                    <h3 className="mt-1 font-heading text-2xl">
                      {pkg.name[locale] || pkg.name.tr}
                    </h3>
                    <p className="mt-4 text-sm">
                      {pkg.pricePerPersonMinor === null ? (
                        <span className="text-muted-foreground">
                          {t.onRequest}
                        </span>
                      ) : (
                        <>
                          <span className="font-heading text-2xl">
                            {formatUsd(pkg.pricePerPersonMinor / 100)}
                          </span>
                          <span className="ms-2 text-muted-foreground">
                            {t.perPerson}
                          </span>
                        </>
                      )}
                    </p>
                    {advantage !== null ? (
                      <p className="mt-2 inline-flex self-start rounded-full bg-[color:var(--gold-soft)] px-2.5 py-0.5 text-[0.7rem] font-medium text-[#6b5320]">
                        {t.advantage(advantage)}
                      </p>
                    ) : null}
                    <Link
                      href={`/siparis?paket=${pkg.code}`}
                      className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      {t.heroPrimary}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4 — Havuz durumu */}
      <section className="bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[80rem]">
          <h2 className="font-heading text-[clamp(1.8rem,3.5vw,2.5rem)]">
            {t.poolTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t.poolLead}
          </p>
          <div className="mt-6">
            <LiveAvailabilitySummary />
          </div>
        </div>
      </section>

      {/* 5 — Neden biz */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[80rem]">
          <h2 className="font-heading text-[clamp(2rem,4vw,3rem)]">
            {t.whyTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {t.why.map(([title, text]) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-border bg-card p-6"
              >
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[color:var(--gold)]" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — Rehber */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[80rem]">
          <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1fr_auto] lg:p-12">
            <div>
              <h2 className="font-heading text-[clamp(1.8rem,3.5vw,2.5rem)]">
                {t.guideTitle}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {t.guideLead}
              </p>
            </div>
            <Link
              href="/rehber"
              className="inline-flex min-h-13 items-center gap-2 rounded-xl border border-border px-6 text-sm font-medium transition hover:bg-muted"
            >
              {t.guideAction}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7 — Geri bildirimler (onaylı yorum yoksa bölüm gizlenir) */}
      {feedback.length > 0 ? (
        <section className="bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[80rem]">
            <h2 className="font-heading text-[clamp(2rem,4vw,3rem)]">
              {t.feedbackTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.feedbackNote}
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {feedback.map((item) => (
                <figure
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (unused, index) => (
                      <Star
                        key={index}
                        aria-hidden="true"
                        className={`size-4 ${
                          index < item.rating
                            ? 'fill-[color:var(--gold)] text-[color:var(--gold)]'
                            : 'text-black/15'
                        }`}
                      />
                    ))}
                    <span className="sr-only">{item.rating} / 5</span>
                  </div>
                  {item.body ? (
                    <blockquote className="mt-3 text-sm leading-6">
                      {item.body}
                    </blockquote>
                  ) : null}
                  <figcaption className="mt-4 text-xs text-muted-foreground">
                    {item.displayName}
                    {item.quoteCode ? (
                      <span className="ms-2 rounded-full bg-[color:var(--success)]/12 px-2 py-0.5 text-[color:var(--success)]">
                        {t.verified}
                      </span>
                    ) : null}
                  </figcaption>
                  {item.businessReply ? (
                    <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-5">
                      <strong className="block">{t.businessReply}</strong>
                      {item.businessReply}
                    </p>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 8 — SSS */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-[clamp(2rem,4vw,3rem)]">
            {t.faqTitle}
          </h2>
          <dl className="mt-8 divide-y divide-border">
            {t.faq.map(([question, answer]) => (
              <div key={question} className="py-5">
                <dt className="font-medium">{question}</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/sss"
            className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.faqAll}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* 9 — Kapanış */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[80rem] overflow-hidden rounded-3xl bg-primary px-8 py-14 text-primary-foreground lg:px-16">
          <div
            aria-hidden="true"
            className="pattern-girih pointer-events-none absolute inset-0"
          />
          <div className="relative max-w-2xl">
            <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] leading-tight">
              {t.ctaTitle}
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/75">
              {t.ctaLead}
            </p>
            <Link
              href="/siparis"
              className="mt-7 inline-flex min-h-13 items-center gap-2 rounded-xl bg-[color:var(--gold)] px-6 text-sm font-medium text-[#14261d] transition hover:brightness-105"
            >
              <CalendarCheck className="size-4" />
              {t.heroPrimary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
