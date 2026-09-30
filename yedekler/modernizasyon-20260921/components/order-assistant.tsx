'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react';

import { usePublicPreferences } from '@/components/public-preferences';
import {
  matchPackageForPersonCount,
  type AppointmentPackageCode,
} from '@/lib/appointment-packages';
import type {
  QuoteLocale,
  QuoteService,
  TimePreference,
} from '@/lib/quote-request';

export type AssistantPackage = {
  code: AppointmentPackageCode;
  name: Record<QuoteLocale, string>;
  personCount: number;
  pricePerPersonMinor: number | null;
};

type Step = 0 | 1 | 2 | 3 | 4 | 5;

type Answers = {
  service: QuoteService | null;
  personCount: number | null;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: TimePreference;
  fullName: string;
  phone: string;
  email: string;
  note: string;
  kvkkConsent: boolean;
  marketingConsent: boolean;
};

const emptyAnswers: Answers = {
  service: null,
  personCount: null,
  femaleCount: 0,
  maleCount: 0,
  dateFrom: '',
  dateTo: '',
  flexible: true,
  timePreference: 'any',
  fullName: '',
  phone: '',
  email: '',
  note: '',
  kvkkConsent: false,
  marketingConsent: false,
};

type Result = {
  code: string;
  message: string;
  whatsappUrl: string | null;
  mailtoUrl: string | null;
  phone: string | null;
};

const copy = {
  tr: {
    title: 'Sipariş asistanı',
    subtitle: 'Altı kısa soru; sonra WhatsApp üzerinden konuşalım.',
    step: (current: number, total: number) => `Adım ${current} / ${total}`,
    back: 'Geri',
    next: 'Devam',
    submit: 'WhatsApp’tan gönder',
    sending: 'Talebiniz kaydediliyor',
    steps: ['Hizmet', 'Kişi', 'Dağılım', 'Tarih', 'İletişim', 'Özet'],
    q1: 'Hangi konuda yardımcı olalım?',
    services: {
      rawdah: 'Ravza randevusu',
      umrah: 'Umre paketi',
      bulk: 'Toplu / acente talebi',
    } as Record<QuoteService, string>,
    serviceHints: {
      rawdah: 'Ravza-i Mutahhara ziyareti için randevu ve QR kodu.',
      umrah: 'Uçuş, konaklama ve ziyaret programı hakkında bilgi.',
      bulk: 'Kafile, acente veya kurumsal gruplar için toplu işlem.',
    } as Record<QuoteService, string>,
    q2: 'Kaç kişi için randevu istiyorsunuz?',
    q2Hint: 'Kişi sayısına göre uygun paketi otomatik seçiyoruz.',
    other: 'Diğer',
    otherLabel: 'Kişi sayısı',
    matched: 'Uygun paket',
    perPerson: 'kişi başı',
    priceOnRequest: 'Fiyat WhatsApp’tan teyit edilir',
    q3: 'Kadın ve erkek dağılımı nedir?',
    q3Hint: 'Ravza randevu saatleri kadın ve erkek için ayrıdır.',
    women: 'Kadın',
    men: 'Erkek',
    sumError: 'Kadın + erkek sayısı toplam kişi sayısına eşit olmalıdır.',
    remaining: (n: number) => `${n} kişi daha dağıtılmalı`,
    q4: 'Hangi tarihlerde ziyaret planlıyorsunuz?',
    from: 'Başlangıç',
    to: 'Bitiş',
    flexibleLabel: 'Tarihlerim esnek, uygun olan ilk günü ayarlayın',
    timeLabel: 'Tercih ettiğiniz saat aralığı',
    times: {
      morning: 'Sabah',
      afternoon: 'Öğleden sonra',
      evening: 'Akşam',
      night: 'Gece',
      any: 'Fark etmez',
    } as Record<TimePreference, string>,
    q5: 'Size nasıl ulaşalım?',
    fullName: 'Ad Soyad',
    phone: 'Telefon',
    phoneHint: 'WhatsApp’ta kullandığınız numara.',
    email: 'E-posta (isteğe bağlı)',
    note: 'Eklemek istedikleriniz (isteğe bağlı)',
    notePlaceholder: 'Örn. yaşlı ziyaretçi var, tekerlekli sandalye gerekiyor.',
    q6: 'Özet',
    kvkk: 'Bilgilerimin talebimi değerlendirmek üzere işlenmesini ve WhatsApp üzerinden benimle iletişime geçilmesini kabul ediyorum.',
    kvkkLink: 'Aydınlatma metni',
    marketing: 'Kampanya ve duyurulardan haberdar olmak istiyorum (isteğe bağlı).',
    successTitle: 'Talebiniz kaydedildi',
    successLead:
      'Bu kodu saklayın. WhatsApp açılmazsa bile talebiniz bize ulaştı.',
    openWhatsapp: 'WhatsApp’ta devam et',
    notOpened: 'WhatsApp açılmadı mı?',
    copyMessage: 'Mesajı kopyala',
    copied: 'Kopyalandı',
    webWhatsapp: 'Tarayıcıda aç',
    sendMail: 'E-posta ile gönder',
    call: 'Telefonla ara',
    track: 'Talebimi takip et',
    channelSoon:
      'WhatsApp kanalı henüz tanımlı değil. Talebiniz kaydedildi; e-posta veya telefonla ulaşabilirsiniz.',
    resume: 'Kaldığınız yerden devam edelim mi?',
    resumeYes: 'Devam et',
    resumeNo: 'Yeniden başla',
    required: 'Bu alan zorunludur.',
    close: 'Kapat',
    offHours:
      'Şu an mesai dışındayız. Talebiniz kaydolur, ilk iş saatinde dönüş yapılır.',
  },
  en: {
    title: 'Order assistant',
    subtitle: 'Six short questions, then we continue on WhatsApp.',
    step: (current: number, total: number) => `Step ${current} / ${total}`,
    back: 'Back',
    next: 'Continue',
    submit: 'Send on WhatsApp',
    sending: 'Saving your request',
    steps: ['Service', 'People', 'Split', 'Dates', 'Contact', 'Summary'],
    q1: 'What can we help you with?',
    services: {
      rawdah: 'Rawdah appointment',
      umrah: 'Umrah package',
      bulk: 'Group / agency request',
    } as Record<QuoteService, string>,
    serviceHints: {
      rawdah: 'Appointment and QR code for visiting Rawdah.',
      umrah: 'Information about flights, stay and the visit programme.',
      bulk: 'Bulk handling for convoys, agencies and companies.',
    } as Record<QuoteService, string>,
    q2: 'How many people is the appointment for?',
    q2Hint: 'We match the right package to your headcount automatically.',
    other: 'Other',
    otherLabel: 'Number of people',
    matched: 'Matched package',
    perPerson: 'per person',
    priceOnRequest: 'Price is confirmed over WhatsApp',
    q3: 'How many women and men?',
    q3Hint: 'Rawdah visiting hours are separate for women and men.',
    women: 'Women',
    men: 'Men',
    sumError: 'Women + men must equal the total number of people.',
    remaining: (n: number) => `${n} more to assign`,
    q4: 'Which dates are you planning?',
    from: 'From',
    to: 'To',
    flexibleLabel: 'My dates are flexible, take the first available day',
    timeLabel: 'Preferred time of day',
    times: {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      any: 'No preference',
    } as Record<TimePreference, string>,
    q5: 'How should we reach you?',
    fullName: 'Full name',
    phone: 'Phone',
    phoneHint: 'The number you use on WhatsApp.',
    email: 'E-mail (optional)',
    note: 'Anything to add (optional)',
    notePlaceholder: 'e.g. an elderly visitor, wheelchair needed.',
    q6: 'Summary',
    kvkk: 'I agree that my details are processed to evaluate my request and that you may contact me on WhatsApp.',
    kvkkLink: 'Privacy notice',
    marketing: 'I would like to hear about announcements (optional).',
    successTitle: 'Your request is saved',
    successLead:
      'Keep this code. Your request reached us even if WhatsApp does not open.',
    openWhatsapp: 'Continue on WhatsApp',
    notOpened: 'WhatsApp did not open?',
    copyMessage: 'Copy message',
    copied: 'Copied',
    webWhatsapp: 'Open in browser',
    sendMail: 'Send by e-mail',
    call: 'Call us',
    track: 'Track my request',
    channelSoon:
      'The WhatsApp channel is not configured yet. Your request is saved; reach us by e-mail or phone.',
    resume: 'Continue where you left off?',
    resumeYes: 'Continue',
    resumeNo: 'Start over',
    required: 'This field is required.',
    close: 'Close',
    offHours:
      'We are outside working hours. Your request is saved and answered on the next business day.',
  },
  ar: {
    title: 'مساعد الطلب',
    subtitle: 'ستة أسئلة قصيرة، ثم نكمل عبر واتساب.',
    step: (current: number, total: number) => `الخطوة ${current} / ${total}`,
    back: 'رجوع',
    next: 'متابعة',
    submit: 'أرسل عبر واتساب',
    sending: 'يتم حفظ طلبك',
    steps: ['الخدمة', 'العدد', 'التوزيع', 'التواريخ', 'التواصل', 'الملخص'],
    q1: 'كيف يمكننا مساعدتك؟',
    services: {
      rawdah: 'موعد الروضة',
      umrah: 'باقة العمرة',
      bulk: 'طلب جماعي / وكالة',
    } as Record<QuoteService, string>,
    serviceHints: {
      rawdah: 'موعد ورمز QR لزيارة الروضة الشريفة.',
      umrah: 'معلومات عن الرحلات والإقامة وبرنامج الزيارة.',
      bulk: 'معالجة جماعية للقوافل والوكالات والشركات.',
    } as Record<QuoteService, string>,
    q2: 'كم عدد الأشخاص؟',
    q2Hint: 'نختار الباقة المناسبة تلقائيًا حسب العدد.',
    other: 'أخرى',
    otherLabel: 'عدد الأشخاص',
    matched: 'الباقة المناسبة',
    perPerson: 'للشخص',
    priceOnRequest: 'يتم تأكيد السعر عبر واتساب',
    q3: 'كم عدد النساء والرجال؟',
    q3Hint: 'أوقات زيارة الروضة منفصلة للنساء والرجال.',
    women: 'نساء',
    men: 'رجال',
    sumError: 'مجموع النساء والرجال يجب أن يساوي العدد الكلي.',
    remaining: (n: number) => `بقي ${n} للتوزيع`,
    q4: 'ما التواريخ التي تخطط لها؟',
    from: 'من',
    to: 'إلى',
    flexibleLabel: 'تواريخي مرنة، اختاروا أول يوم متاح',
    timeLabel: 'الوقت المفضل',
    times: {
      morning: 'صباحًا',
      afternoon: 'بعد الظهر',
      evening: 'مساءً',
      night: 'ليلًا',
      any: 'لا يهم',
    } as Record<TimePreference, string>,
    q5: 'كيف نتواصل معك؟',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    phoneHint: 'الرقم الذي تستخدمه على واتساب.',
    email: 'البريد الإلكتروني (اختياري)',
    note: 'ملاحظات إضافية (اختياري)',
    notePlaceholder: 'مثال: يوجد زائر مسن، نحتاج كرسيًا متحركًا.',
    q6: 'الملخص',
    kvkk: 'أوافق على معالجة بياناتي لتقييم طلبي والتواصل معي عبر واتساب.',
    kvkkLink: 'إشعار الخصوصية',
    marketing: 'أرغب في تلقي الإعلانات (اختياري).',
    successTitle: 'تم حفظ طلبك',
    successLead: 'احتفظ بهذا الرقم. وصلنا طلبك حتى لو لم يفتح واتساب.',
    openWhatsapp: 'المتابعة عبر واتساب',
    notOpened: 'لم يفتح واتساب؟',
    copyMessage: 'نسخ الرسالة',
    copied: 'تم النسخ',
    webWhatsapp: 'افتح في المتصفح',
    sendMail: 'أرسل بالبريد',
    call: 'اتصل بنا',
    track: 'تتبع طلبي',
    channelSoon: 'قناة واتساب غير مهيأة بعد. تم حفظ طلبك؛ تواصل بالبريد أو الهاتف.',
    resume: 'هل نكمل من حيث توقفت؟',
    resumeYes: 'متابعة',
    resumeNo: 'البدء من جديد',
    required: 'هذا الحقل مطلوب.',
    close: 'إغلاق',
    offHours: 'نحن خارج ساعات العمل. طلبك محفوظ وسيتم الرد في أول يوم عمل.',
  },
};

const personPresets = [1, 3, 5, 10, 25];
const timeOptions: TimePreference[] = [
  'any',
  'morning',
  'afternoon',
  'evening',
  'night',
];
const DRAFT_KEY = 'ravza-order-draft';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readDraft(): Answers | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Answers>;
    // Onaylar taslaktan geri yüklenmez: rıza her seferinde yeniden alınır.
    return { ...emptyAnswers, ...parsed, kvkkConsent: false, marketingConsent: false };
  } catch {
    return null;
  }
}

export function OrderAssistant({
  packages,
  initialPackageCode,
  variant = 'panel',
  onClose,
}: {
  packages: AssistantPackage[];
  initialPackageCode?: AppointmentPackageCode;
  variant?: 'panel' | 'page';
  onClose?: () => void;
}) {
  const { locale, formatUsd } = usePublicPreferences();
  const t = copy[locale];
  const formId = useId();
  const liveRef = useRef<HTMLDivElement>(null);

  const initialPerson = initialPackageCode
    ? (packages.find((item) => item.code === initialPackageCode)?.personCount ??
      null)
    : null;

  const [step, setStep] = useState<Step>(initialPerson ? 1 : 0);
  const [answers, setAnswers] = useState<Answers>({
    ...emptyAnswers,
    service: initialPackageCode ? 'rawdah' : null,
    personCount: initialPerson,
  });
  const [customCount, setCustomCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [draft, setDraft] = useState<Answers | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  // Yarım kalan taslak yalnız oturum boyunca saklanır ve kullanıcıya
  // sorulmadan geri yüklenmez.
  // Okuma hidrasyondan sonraya ertelenir; sunucu çıktısıyla uyuşmazlık
  // oluşmasın ve efekt gövdesinde eşzamanlı setState yapılmasın diye.
  useEffect(() => {
    if (initialPerson) return;
    const timer = window.setTimeout(() => {
      const saved = readDraft();
      if (saved?.service) setDraft(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPerson]);

  useEffect(() => {
    if (result) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    } catch {
      // Gizli sekmede depolama kapalı olabilir; akış bundan etkilenmez.
    }
  }, [answers, result]);

  const matchedCode = answers.personCount
    ? matchPackageForPersonCount(answers.personCount)
    : null;
  const matchedPackage = useMemo(
    () => packages.find((item) => item.code === matchedCode) ?? null,
    [packages, matchedCode],
  );

  const assigned = answers.femaleCount + answers.maleCount;
  const remaining = (answers.personCount ?? 0) - assigned;

  function update(patch: Partial<Answers>) {
    setError(null);
    setAnswers((current) => ({ ...current, ...patch }));
  }

  function goTo(next: Step) {
    setError(null);
    setStep(next);
    liveRef.current?.focus();
  }

  function validateStep(current: Step): string | null {
    if (current === 0 && !answers.service) return t.required;
    if (current === 1 && (!answers.personCount || answers.personCount < 1))
      return t.required;
    if (current === 2 && remaining !== 0) return t.sumError;
    if (current === 3) {
      if (!answers.dateFrom || !answers.dateTo) return t.required;
      if (answers.dateTo < answers.dateFrom) return t.sumError;
    }
    if (current === 4) {
      if (answers.fullName.trim().length < 3) return t.required;
      if (answers.phone.replace(/\D/g, '').length < 8) return t.required;
    }
    return null;
  }

  function next() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    goTo(Math.min(step + 1, 5) as Step);
  }

  async function submit() {
    if (!answers.kvkkConsent) {
      setError(t.kvkk);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          service: answers.service,
          packageCode: matchedCode,
          personCount: answers.personCount,
          femaleCount: answers.femaleCount,
          maleCount: answers.maleCount,
          dateFrom: answers.dateFrom,
          dateTo: answers.dateTo,
          flexible: answers.flexible,
          timePreference: answers.timePreference,
          fullName: answers.fullName,
          phone: answers.phone,
          email: answers.email || null,
          note: answers.note || null,
          locale,
          kvkkConsent: answers.kvkkConsent,
          marketingConsent: answers.marketingConsent,
          sourcePath: window.location.pathname,
          website: honeypot.current?.value ?? '',
        }),
      });
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? t.required);
        return;
      }
      setResult(payload);
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // yok sayılır
      }
    } catch {
      setError(t.required);
    } finally {
      setPending(false);
    }
  }

  function openWhatsapp(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => setShowFallback(true), 2000);
  }

  async function copyMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowFallback(true);
    }
  }

  const shell =
    variant === 'page'
      ? 'rounded-3xl border border-border bg-card shadow-[0_1rem_3rem_rgba(20,38,28,.10)]'
      : 'h-full bg-card';

  if (result)
    return (
      <div className={`${shell} flex flex-col`}>
        <AssistantHeader
          title={t.successTitle}
          subtitle={null}
          onClose={onClose}
          closeLabel={t.close}
        />
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-2xl border border-gold/40 bg-gold-soft/30 p-5 text-center">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {copy[locale].q6}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
              {result.code}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t.successLead}</p>
          </div>

          {result.whatsappUrl ? (
            <button
              type="button"
              onClick={() => openWhatsapp(result.whatsappUrl!)}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#0a2e1f] px-5 text-sm font-medium text-white transition hover:bg-[#123d2b]"
            >
              <MessageCircle className="size-4" />
              {t.openWhatsapp}
            </button>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              {t.channelSoon}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowFallback((value) => !value)}
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {t.notOpened}
          </button>

          {showFallback ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => copyMessage(result.message)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? t.copied : t.copyMessage}
              </button>
              {result.whatsappUrl ? (
                <a
                  href={result.whatsappUrl.replace(
                    'https://wa.me/',
                    'https://web.whatsapp.com/send?phone=',
                  )}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  {t.webWhatsapp}
                </a>
              ) : null}
              {result.mailtoUrl ? (
                <a
                  href={result.mailtoUrl}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  <Mail className="size-4" />
                  {t.sendMail}
                </a>
              ) : null}
              {result.phone ? (
                <a
                  href={`tel:${result.phone.replace(/\s/g, '')}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  <Phone className="size-4" />
                  {t.call}
                </a>
              ) : null}
            </div>
          ) : null}

          <a
            href={`/talep/${result.code}`}
            className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.track}
          </a>
        </div>
      </div>
    );

  return (
    <div className={`${shell} flex flex-col`}>
      <AssistantHeader
        title={t.title}
        subtitle={t.subtitle}
        onClose={onClose}
        closeLabel={t.close}
      />

      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.steps[step]}</span>
          <span>{t.step(step + 1, 6)}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / 6) * 100}%` }}
          />
        </div>
      </div>

      {draft ? (
        <div className="mx-5 mt-4 rounded-xl border border-gold/40 bg-gold-soft/25 p-3 text-sm">
          <p>{t.resume}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="min-h-9 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              onClick={() => {
                setAnswers(draft);
                setDraft(null);
                setStep(1);
              }}
            >
              {t.resumeYes}
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium"
              onClick={() => setDraft(null)}
            >
              {t.resumeNo}
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={liveRef}
        tabIndex={-1}
        aria-live="polite"
        className="flex-1 space-y-4 overflow-y-auto p-5 outline-none"
      >
        {step === 0 ? (
          <Question title={t.q1}>
            <div className="grid gap-2">
              {(['rawdah', 'umrah', 'bulk'] as QuoteService[]).map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => {
                    update({ service });
                    goTo(1);
                  }}
                  aria-pressed={answers.service === service}
                  className={`rounded-xl border p-4 text-start transition ${
                    answers.service === service
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {t.services[service]}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t.serviceHints[service]}
                  </span>
                </button>
              ))}
            </div>
          </Question>
        ) : null}

        {step === 1 ? (
          <Question title={t.q2} hint={t.q2Hint}>
            <div className="flex flex-wrap gap-2">
              {personPresets.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    update({ personCount: count, femaleCount: 0, maleCount: 0 });
                    setCustomCount('');
                  }}
                  aria-pressed={answers.personCount === count}
                  className={`min-h-12 min-w-14 rounded-xl border px-4 text-sm font-medium transition ${
                    answers.personCount === count
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label
                htmlFor={`${formId}-custom`}
                className="text-xs text-muted-foreground"
              >
                {t.other} — {t.otherLabel}
              </label>
              <input
                id={`${formId}-custom`}
                type="number"
                min={1}
                max={500}
                inputMode="numeric"
                value={customCount}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomCount(value);
                  const parsed = Number(value);
                  if (Number.isInteger(parsed) && parsed > 0)
                    update({
                      personCount: parsed,
                      femaleCount: 0,
                      maleCount: 0,
                    });
                }}
                className="mt-1 min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {matchedPackage ? (
              <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft/25 p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {t.matched}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4 text-[color:var(--gold)]" />
                  {matchedPackage.name[locale] || matchedPackage.name.tr}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {matchedPackage.pricePerPersonMinor === null
                    ? t.priceOnRequest
                    : `${formatUsd(
                        matchedPackage.pricePerPersonMinor / 100,
                      )} ${t.perPerson}`}
                </p>
              </div>
            ) : null}
          </Question>
        ) : null}

        {step === 2 ? (
          <Question title={t.q3} hint={t.q3Hint}>
            <div className="grid grid-cols-2 gap-3">
              <Counter
                label={t.women}
                value={answers.femaleCount}
                max={answers.personCount ?? 0}
                onChange={(value) => update({ femaleCount: value })}
              />
              <Counter
                label={t.men}
                value={answers.maleCount}
                max={answers.personCount ?? 0}
                onChange={(value) => update({ maleCount: value })}
              />
            </div>
            {remaining !== 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {remaining > 0 ? t.remaining(remaining) : t.sumError}
              </p>
            ) : (
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-[color:var(--success)]">
                <Check className="size-3.5" />
                {answers.personCount} / {assigned}
              </p>
            )}
          </Question>
        ) : null}

        {step === 3 ? (
          <Question title={t.q4}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.from} htmlFor={`${formId}-from`}>
                <input
                  id={`${formId}-from`}
                  type="date"
                  min={todayIso()}
                  value={answers.dateFrom}
                  onChange={(event) =>
                    update({
                      dateFrom: event.target.value,
                      dateTo:
                        answers.dateTo && answers.dateTo < event.target.value
                          ? event.target.value
                          : answers.dateTo,
                    })
                  }
                  className="min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
              <Field label={t.to} htmlFor={`${formId}-to`}>
                <input
                  id={`${formId}-to`}
                  type="date"
                  min={answers.dateFrom || todayIso()}
                  value={answers.dateTo}
                  onChange={(event) => update({ dateTo: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
            </div>
            <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={answers.flexible}
                onChange={(event) => update({ flexible: event.target.checked })}
                className="mt-1 size-4 accent-[color:var(--ravza-green)]"
              />
              <span>{t.flexibleLabel}</span>
            </label>
            <fieldset className="mt-4">
              <legend className="text-xs text-muted-foreground">
                {t.timeLabel}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {timeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => update({ timePreference: option })}
                    aria-pressed={answers.timePreference === option}
                    className={`min-h-11 rounded-xl border px-3 text-sm transition ${
                      answers.timePreference === option
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {t.times[option]}
                  </button>
                ))}
              </div>
            </fieldset>
          </Question>
        ) : null}

        {step === 4 ? (
          <Question title={t.q5}>
            <div className="grid gap-3">
              <Field label={t.fullName} htmlFor={`${formId}-name`}>
                <input
                  id={`${formId}-name`}
                  type="text"
                  autoComplete="name"
                  value={answers.fullName}
                  onChange={(event) => update({ fullName: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
              <Field
                label={t.phone}
                htmlFor={`${formId}-phone`}
                hint={t.phoneHint}
              >
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+90 5.. ... .. .."
                  value={answers.phone}
                  onChange={(event) => update({ phone: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
              <Field label={t.email} htmlFor={`${formId}-email`}>
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  value={answers.email}
                  onChange={(event) => update({ email: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
              <Field label={t.note} htmlFor={`${formId}-note`}>
                <textarea
                  id={`${formId}-note`}
                  rows={3}
                  maxLength={300}
                  placeholder={t.notePlaceholder}
                  value={answers.note}
                  onChange={(event) => update({ note: event.target.value })}
                  className="w-full rounded-xl border border-input bg-transparent p-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </Field>
            </div>
          </Question>
        ) : null}

        {step === 5 ? (
          <Question title={t.q6}>
            <dl className="divide-y divide-border rounded-xl border border-border">
              <SummaryRow
                label={t.steps[0]}
                value={answers.service ? t.services[answers.service] : '—'}
                onEdit={() => goTo(0)}
              />
              <SummaryRow
                label={t.matched}
                value={
                  matchedPackage
                    ? `${matchedPackage.name[locale] || matchedPackage.name.tr} · ${answers.personCount}`
                    : `${answers.personCount}`
                }
                onEdit={() => goTo(1)}
              />
              <SummaryRow
                label={`${t.women} / ${t.men}`}
                value={`${answers.femaleCount} / ${answers.maleCount}`}
                onEdit={() => goTo(2)}
              />
              <SummaryRow
                label={`${t.from} – ${t.to}`}
                value={`${answers.dateFrom} – ${answers.dateTo}`}
                onEdit={() => goTo(3)}
              />
              <SummaryRow
                label={t.times[answers.timePreference]}
                value={answers.flexible ? t.flexibleLabel : '—'}
                onEdit={() => goTo(3)}
              />
              <SummaryRow
                label={t.fullName}
                value={answers.fullName}
                onEdit={() => goTo(4)}
              />
              <SummaryRow
                label={t.phone}
                value={answers.phone}
                onEdit={() => goTo(4)}
              />
            </dl>

            <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={answers.kvkkConsent}
                onChange={(event) =>
                  update({ kvkkConsent: event.target.checked })
                }
                className="mt-1 size-4 accent-[color:var(--ravza-green)]"
              />
              <span>
                {t.kvkk}{' '}
                <a
                  href="/aydinlatma"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {t.kvkkLink}
                </a>
              </span>
            </label>
            <label className="mt-2 flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={answers.marketingConsent}
                onChange={(event) =>
                  update({ marketingConsent: event.target.checked })
                }
                className="mt-1 size-4 accent-[color:var(--ravza-green)]"
              />
              <span className="text-muted-foreground">{t.marketing}</span>
            </label>
          </Question>
        ) : null}

        {/* Bot tuzağı: gerçek kullanıcı bu alanı göremez ve dolduramaz. */}
        <input
          ref={honeypot}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-[color:var(--danger)]"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => goTo((step - 1) as Step)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t.back}
          </button>
        ) : null}
        <button
          type="button"
          onClick={step === 5 ? submit : next}
          disabled={pending}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t.sending}
            </>
          ) : step === 5 ? (
            <>
              <MessageCircle className="size-4" />
              {t.submit}
            </>
          ) : (
            t.next
          )}
        </button>
      </div>
    </div>
  );
}

function AssistantHeader({
  title,
  subtitle,
  onClose,
  closeLabel,
}: {
  title: string;
  subtitle: string | null;
  onClose?: () => void;
  closeLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border bg-primary px-5 py-4 text-primary-foreground">
      <div>
        <p className="font-heading text-lg leading-tight">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-primary-foreground/70">{subtitle}</p>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-primary-foreground/80 transition hover:bg-white/10"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-heading text-xl leading-snug">{title}</h3>
      {hint ? (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Counter({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`${label} -1`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="grid size-11 place-items-center rounded-lg border border-border text-lg transition hover:bg-muted"
        >
          −
        </button>
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`${label} +1`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid size-11 place-items-center rounded-lg border border-border text-lg transition hover:bg-muted"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className="truncate">{value || '—'}</span>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-xs text-primary underline underline-offset-4"
        >
          ✎
        </button>
      </dd>
    </div>
  );
}
