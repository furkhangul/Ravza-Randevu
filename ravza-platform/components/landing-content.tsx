"use client";

import Link from "@/components/safe-link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { usePublicPreferences } from "@/components/public-preferences";
import { LiveAvailabilitySummary } from "@/components/live-availability-summary";
import type { FeedbackRecord } from "@/lib/feedback";

const copy = {
  tr: {
    eyebrow: "MEDİNE · RAVZA-İ MUTAHHARA",
    title: "Kalbinizdeki ziyarete,",
    emphasis: "özenli bir hazırlık.",
    lead: "Peygamber Efendimizin (s.a.v.) mescidinde Ravza ziyareti için ilk adımı birlikte atalım. Bireysel, aile ve grup taleplerinizi tek yerden planlayın, süreci kolayca takip edin.",
    primary: "Ziyaret talebi oluştur",
    secondary: "Nasıl çalışır?",
    note: "Önce talebiniz, ardından uygunluk değerlendirmesi.",
    location: "Mescid-i Nebevî",
    city: "Medine-i Münevvere",
    imageAlt: "Medine’de gün batımında Mescid-i Nebevî ve Yeşil Kubbe",
    strip: ["Bireysel ve grup talepleri", "Kişiye özel randevu takibi", "Türkçe iletişim desteği"],
    start: "Nereden başlayacağınızı bilmiyor musunuz?",
    startLead: "Ravza asistanına sorun. Ziyaret bilgilerinizi birlikte hazırlayın.",
    chat: "Asistana sor",
    howEye: "ADIM ADIM ZİYARETİNİZ",
    howTitle: "Siz niyet edin,\nsüreci birlikte planlayalım.",
    howLead: "İlk talepten randevu bilgilendirmesine kadar ne olacağını bilin.",
    steps: [
      [
        "Ziyaretinizi anlatın",
        "Kişi sayısını, kadın–erkek dağılımını ve Medine’de olacağınız tarihleri paylaşın.",
      ],
      [
        "Birlikte netleştirelim",
        "Ekibimiz uygunluğu değerlendirsin; kapsam ve hizmet bedeli sizinle görüşülsün.",
      ],
      [
        "Bilgilerinizi takip edin",
        "Talep kodunuzla gelişmeleri görün. Randevu onaylandığında QR bilginiz size iletilsin.",
      ],
    ],
    servicesEye: "UMRE VE ZİYARET REHBERİ",
    servicesTitle: "Yolculuğunuzu bilgiyle hazırlayın.",
    servicesLead: "Umre adımları, ziyaret edilecek yerler ve yolculuk öncesi notlar.",
    all: "Rehberin tümünü incele",
    services: [
      ["Umrenin temel adımları", "İhram, tavaf, sa’y ve saçın kısaltılması hakkında temel hatırlatmalar.", "İHRAM · TAVAF · SA’Y"],
      ["Mekke ve Medine’de ziyaret", "Mescid-i Haram, Mescid-i Nebevî, Kuba, Uhud ve Kıbleteyn gibi yerler hakkında bilgi.", "ZİYARET NOKTALARI"],
      ["Yolculuk öncesi hazırlık", "Seyahat belgeleri, randevu, sağlık ve ziyaret günü için pratik hatırlatmalar.", "HAZIRLIK"],
    ],
    choose: "Rehberi aç",
    guideEye: "ZİYARET ÖNCESİ",
    guideTitle: "Bilerek yola çıkın,\nhuzurla hazırlanın.",
    guideLead:
      "Ravza randevusu, ziyaret saatleri ve kişiye özel QR bilgisi. Hazırlık için ihtiyacınız olan temel bilgiler bir arada.",
    guideAction: "Ziyaret rehberini keşfet",
    guideItems: [
      "Ravza ziyareti ve selam ziyareti",
      "Randevu ve Nusuk süreci",
      "Ziyaret günü hazırlıkları",
    ],
    faqEye: "AKLINIZDA SORU KALMASIN",
    faqTitle: "Merak ettikleriniz.",
    faqAll: "Tüm sorular ve cevaplar",
    faq: [
      [
        "Randevum hemen kesinleşir mi?",
        "Talep oluşturmak randevu onayı değildir. Ekibimiz uygunluğu değerlendirir; randevu, resmî sistemde onaylandığında kesinleşir.",
      ],
      [
        "Tek kişi için başvurabilir miyim?",
        "Evet. Bireysel ziyaretçiler, aileler, kafileler ve acenteler talep oluşturabilir.",
      ],
      [
        "Güncel hizmet bedelini nasıl öğrenebilirim?",
        "Kişi sayısı ve talep kapsamına göre ekibimiz güncel ücret bilgisini başvuru sırasında paylaşır.",
      ],
      [
        "Talebimi nasıl takip ederim?",
        "Talebiniz kaydedilince verilen kod ve telefonunuzun son dört hanesiyle talep takip sayfasından gelişmeleri görebilirsiniz.",
      ],
    ],
    reviews: "Ziyaretçilerimizin deneyimleri",
    verified: "Doğrulanmış talep",
    ctaEye: "İLK ADIMI BİRLİKTE ATALIM",
    ctaTitle: "Ziyaretiniz için\nburadayız.",
    ctaLead: "Sorularınızı sorun veya ziyaret talebinizi şimdi hazırlayın.",
    track: "Mevcut talebimi takip et",
  },
  en: {
    eyebrow: "MEDINA · RAWDAH AL-MUTAHHARAH",
    title: "A meaningful visit,",
    emphasis: "thoughtfully planned.",
    lead: "Take the first step towards your Rawdah visit at the Prophet’s Mosque. Plan individual, family and group requests in one place and follow every step.",
    primary: "Plan your visit",
    secondary: "How it works",
    note: "Your request first. Availability is checked next.",
    location: "The Prophet’s Mosque",
    city: "Al-Madinah Al-Munawwarah",
    imageAlt: "The Prophet’s Mosque and Green Dome in Medina at sunset",
    strip: ["Individual and group requests", "Personal appointment tracking", "Support in Turkish"],
    start: "Not sure where to start?",
    startLead: "Use the assistant to prepare your visit request.",
    chat: "Open assistant",
    howEye: "YOUR VISIT, STEP BY STEP",
    howTitle: "Your intention.\nA plan we build together.",
    howLead: "Understand each step, from your first request to appointment updates.",
    steps: [
      [
        "Tell us about your visit",
        "Share the number of visitors, women and men, and your dates in Medina.",
      ],
      [
        "Confirm the details together",
        "Our team reviews availability and discusses the service and fee with you.",
      ],
      [
        "Follow your request",
        "Check progress with your request code. Receive your QR details once the appointment is confirmed.",
      ],
    ],
    servicesEye: "UMRAH AND VISIT GUIDE",
    servicesTitle: "Prepare for your journey with confidence.",
    servicesLead: "Umrah steps, places to visit, and practical travel preparation.",
    all: "Explore the full guide",
    services: [
      ["The main Umrah steps", "A simple overview of ihram, tawaf, sa’i, and trimming the hair.", "IHRAM · TAWAF · SA’I"],
      ["Places in Makkah and Madinah", "Learn about the Grand Mosque, the Prophet’s Mosque, Quba, Uhud, and Qiblatain.", "PLACES TO VISIT"],
      ["Before you travel", "Practical reminders for travel documents, appointments, wellbeing, and your visit day.", "PREPARATION"],
    ],
    choose: "Open the guide",
    guideEye: "BEFORE YOUR VISIT",
    guideTitle: "Travel informed.\nPrepare with peace of mind.",
    guideLead:
      "Rawdah appointments, visiting times and personal QR details. Essential preparation in one guide.",
    guideAction: "Explore the visit guide",
    guideItems: [
      "Rawdah and the greeting visit",
      "Appointments and Nusuk",
      "Preparing for your visit",
    ],
    faqEye: "CLEAR ANSWERS",
    faqTitle: "Your questions, answered.",
    faqAll: "All questions and answers",
    faq: [
      [
        "Is my appointment confirmed immediately?",
        "A request is not a confirmed appointment. Our team checks availability; confirmation depends on the official system.",
      ],
      [
        "Can I apply for one person?",
        "Yes. Individuals, families, groups and agencies can create requests.",
      ],
      [
        "How can I confirm the current service fee?",
        "Our team confirms the current service fee based on your request details.",
      ],
      [
        "How do I track my request?",
        "Use your request code and the last four digits of your phone on the tracking page.",
      ],
    ],
    reviews: "Visitors’ experiences",
    verified: "Verified request",
    ctaEye: "LET’S TAKE THE FIRST STEP",
    ctaTitle: "Here for\nyour visit.",
    ctaLead: "Ask your questions or prepare your visit request.",
    track: "Track an existing request",
  },
  ar: {
    eyebrow: "المدينة المنورة · الروضة المطهرة",
    title: "زيارة يتمناها القلب،",
    emphasis: "واستعداد يليق بها.",
    lead: "لنخطُ معًا الخطوة الأولى لزيارة الروضة في المسجد النبوي. خطط لطلبات الأفراد والعائلات والمجموعات وتابعها من مكان واحد.",
    primary: "أنشئ طلب الزيارة",
    secondary: "كيف يعمل؟",
    note: "نستلم طلبك أولًا، ثم نتحقق من التوفر.",
    location: "المسجد النبوي",
    city: "المدينة المنورة",
    imageAlt: "المسجد النبوي والقبة الخضراء وقت الغروب",
    strip: ["طلبات فردية وجماعية", "متابعة موعدك", "دعم باللغة التركية"],
    start: "لا تعرف من أين تبدأ؟",
    startLead: "يساعدك المساعد في تجهيز معلومات الزيارة.",
    chat: "افتح المساعد",
    howEye: "زيارتك خطوة بخطوة",
    howTitle: "انوِ الزيارة،\nولنخطط معًا.",
    howLead: "اعرف الخطوات من طلبك الأول إلى معلومات الموعد.",
    steps: [
      ["أخبرنا عن زيارتك", "شارك عدد الزوار وتوزيع النساء والرجال وتواريخ إقامتك في المدينة."],
      ["لنؤكد التفاصيل معًا", "يتحقق فريقنا من التوفر ويناقش معك نطاق الخدمة والتكلفة."],
      ["تابع طلبك", "استخدم رمز الطلب لمتابعة المستجدات. تُرسل معلومات QR بعد تأكيد الموعد."],
    ],
    servicesEye: "دليل العمرة والزيارة",
    servicesTitle: "استعد لرحلتك بمعرفة وطمأنينة.",
    servicesLead: "خطوات العمرة وأماكن الزيارة ونصائح عملية قبل السفر.",
    all: "استكشف الدليل الكامل",
    services: [
      ["خطوات العمرة الأساسية", "ملخص للإحرام والطواف والسعي وتقصير الشعر.", "الإحرام · الطواف · السعي"],
      ["أماكن في مكة والمدينة", "تعرف على المسجد الحرام والمسجد النبوي وقباء وأحد والقبلتين.", "أماكن الزيارة"],
      ["قبل السفر", "تذكيرات عملية لوثائق السفر والمواعيد والصحة ويوم الزيارة.", "الاستعداد"],
    ],
    choose: "افتح الدليل",
    guideEye: "قبل الزيارة",
    guideTitle: "معرفة تطمئنك،\nواستعداد يرافقك.",
    guideLead: "معلومات المواعيد وأوقات الزيارة ورمز QR في دليل واحد.",
    guideAction: "استكشف دليل الزيارة",
    guideItems: ["الروضة وزيارة السلام", "المواعيد ونسك", "الاستعداد ليوم الزيارة"],
    faqEye: "إجابات واضحة",
    faqTitle: "أسئلتك تهمنا.",
    faqAll: "كل الأسئلة والأجوبة",
    faq: [
      [
        "هل يتأكد الموعد فورًا؟",
        "الطلب ليس تأكيدًا للموعد. يتحقق الفريق من التوفر ويعتمد التأكيد على النظام الرسمي.",
      ],
      ["هل يمكن تقديم طلب فردي؟", "نعم، للأفراد والعائلات والمجموعات والوكالات."],
      ["هل أدفع عبر الموقع؟", "لا دفع عبر الموقع. تُناقش الخدمة والتكلفة وطريقة الدفع مع الفريق."],
      ["كيف أتابع طلبي؟", "استخدم رمز الطلب وآخر أربعة أرقام من هاتفك في صفحة المتابعة."],
    ],
    reviews: "تجارب الزوار",
    verified: "طلب موثق",
    ctaEye: "لنبدأ معًا",
    ctaTitle: "نحن هنا\nلزيارتك.",
    ctaLead: "اطرح أسئلتك أو جهز طلب الزيارة.",
    track: "متابعة طلب سابق",
  },
};
const serviceCodes = ["solo", "family", "agency"];
const stepIcons = [ClipboardCheck, MessageCircle, QrCode];

const availabilityCopy = {
  tr: {
    eyebrow: "CANLI RANDEVU TAKVİMİ",
    title: "Uygun saatleri ve randevu sayılarını görün.",
    lead: "Tarih seçerek kadın ve erkek ziyaret saatlerini inceleyin; tabloyu Excel için indirebilirsiniz.",
  },
  en: {
    eyebrow: "LIVE APPOINTMENT SCHEDULE",
    title: "Check available times and appointment counts.",
    lead: "Choose a date to view women’s and men’s visiting times, then download the table for Excel.",
  },
  ar: {
    eyebrow: "جدول المواعيد المباشر",
    title: "اطلع على الأوقات والأعداد المتاحة.",
    lead: "اختر التاريخ لمشاهدة أوقات زيارة النساء والرجال وتنزيل الجدول لبرنامج Excel.",
  },
};
export function LandingContent({ feedback }: { feedback: FeedbackRecord[] }) {
  const { locale } = usePublicPreferences();
  const t = copy[locale];
  const schedule = availabilityCopy[locale];
  return (
    <>
      <section className="ravza-hero ravza-container">
        <div className="ravza-hero-copy">
          <p className="ravza-eyebrow">
            <span />
            {t.eyebrow}
          </p>
          <h1>
            {t.title}
            <em>{t.emphasis}</em>
          </h1>
          <p className="ravza-hero-lead">{t.lead}</p>
          <div className="ravza-hero-actions">
            <Link href="/siparis" className="ravza-button">
              {t.primary}
              <ArrowUpRight className="size-4 rtl:-rotate-90" />
            </Link>
            <a href="#nasil-calisir" className="ravza-text-link">
              {t.secondary}
              <ArrowDown className="size-4" />
            </a>
          </div>
          <p className="ravza-hero-note">
            <ShieldCheck className="size-4" />
            {t.note}
          </p>
          <div className="ravza-hero-caption">
            <span>RAVZA</span>
            <div />
            <span>{t.city}</span>
          </div>
        </div>
        <figure className="ravza-hero-photo">
          <Image
            unoptimized
            src="/medina-nabawi-evening.webp"
            alt={t.imageAlt}
            width={1536}
            height={1024}
            fetchPriority="high"
          />
          <div className="ravza-photo-top">
            <span>
              <MapPin className="size-3.5" />
              {t.city}
            </span>
            <span lang="ar" className="font-arabic">
              الروضة الشريفة
            </span>
          </div>
          <figcaption>
            <p>{t.location}</p>
            <span>{t.eyebrow}</span>
          </figcaption>
          <span className="ravza-photo-seal" aria-hidden="true">
            رَوْضَة
          </span>
        </figure>
      </section>
      <div className="ravza-trust-strip ravza-container">
        {t.strip.map((item, i) => {
          const Icon = [Users, QrCode, MessageCircle][i];
          return (
            <span key={item}>
              <Icon className="size-4" />
              {item}
            </span>
          );
        })}
      </div>
      <section id="nasil-calisir" className="ravza-section ravza-container">
        <div className="ravza-section-heading">
          <div>
            <p className="ravza-eyebrow">{t.howEye}</p>
            <h2>{t.howTitle}</h2>
          </div>
          <p>{t.howLead}</p>
        </div>
        <div className="ravza-steps">
          {t.steps.map(([title, text], i) => {
            const Icon = stepIcons[i];
            return (
              <article key={title}>
                <div className="ravza-step-top">
                  <span className="ravza-icon">
                    <Icon className="size-5" />
                  </span>
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
        <div className="ravza-assistant-invite">
          <span className="ravza-icon">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h3>{t.start}</h3>
            <p>{t.startLead}</p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("ravza:open-assistant"))}
          >
            {t.chat}
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      </section>
      <section className="ravza-services-section">
        <div className="ravza-container ravza-section">
          <div className="ravza-section-heading">
            <div>
              <p className="ravza-eyebrow">{t.servicesEye}</p>
              <h2>{t.servicesTitle}</h2>
              <p className="mt-4 text-muted-foreground">{t.servicesLead}</p>
            </div>
            <Link href="/rehber" className="ravza-text-link">
              {t.all}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="ravza-service-grid">
            {t.services.map(([title, text, label], i) => (
              <article key={title} className={i === 1 ? "ravza-service-featured" : ""}>
                <div className="ravza-service-top">
                  <MapPin className="size-6" />
                  <span>0{i + 1}</span>
                </div>
                <p className="ravza-service-count">{label}</p>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="ravza-service-bottom">
                  <Link href="/rehber">
                    {t.choose}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>      <section className="ravza-section ravza-container ravza-guide-feature">
        <div className="ravza-guide-photo">
          <Image
            unoptimized
            src="/medina-nabawi-evening.webp"
            alt={t.imageAlt}
            width={1536}
            height={1024}
            loading="lazy"
          />
          <span lang="ar" className="font-arabic">
            المدينة المنورة
          </span>
        </div>
        <div>
          <p className="ravza-eyebrow">{t.guideEye}</p>
          <h2>{t.guideTitle}</h2>
          <p className="ravza-guide-lead">{t.guideLead}</p>
          <ul>
            {t.guideItems.map((item) => (
              <li key={item}>
                <Check className="size-4" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/rehber" className="ravza-button ravza-button-outline">
            {t.guideAction}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
      <section id="randevu-durumlari" className="ravza-container ravza-section">
        <div className="ravza-section-heading">
          <div>
            <p className="ravza-eyebrow">{schedule.eyebrow}</p>
            <h2>{schedule.title}</h2>
          </div>
          <p>{schedule.lead}</p>
        </div>
        <LiveAvailabilitySummary />
      </section>
      {feedback.length ? (
        <section className="ravza-container ravza-section pt-0">
          <h2 className="ravza-title">{t.reviews}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {feedback.slice(0, 3).map((item) => (
              <figure key={item.id} className="rounded-2xl border border-border bg-card p-7">
                <div className="flex gap-1" aria-label={`${item.rating} / 5`}>
                  {Array.from({ length: item.rating }, (_, i) => (
                    <Star key={i} className="size-4 fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-7">{item.body}</blockquote>
                <figcaption className="mt-6 text-sm">
                  {item.displayName}
                  <span className="mt-1 block text-xs text-muted-foreground">{t.verified}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      <section className="ravza-faq-section">
        <div className="ravza-container ravza-section ravza-faq-grid">
          <div>
            <p className="ravza-eyebrow">{t.faqEye}</p>
            <h2>{t.faqTitle}</h2>
            <Link href="/sss" className="ravza-text-link mt-6">
              {t.faqAll}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div>
            {t.faq.map(([question, answer], i) => (
              <details className="ravza-faq-item" key={question} open={i === 0}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="ravza-container ravza-section">
        <div className="ravza-final-cta">
          <div>
            <p className="ravza-eyebrow">{t.ctaEye}</p>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaLead}</p>
          </div>
          <div>
            <Link href="/siparis" className="ravza-button">
              {t.primary}
              <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/talep" className="ravza-text-link">
              {t.track}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <CalendarDays className="ravza-cta-decoration" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}





